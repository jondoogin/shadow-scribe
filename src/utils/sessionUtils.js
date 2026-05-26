/**
 * sessionUtils.js — Reading Session Granularity
 *
 * Utilities for extracting and classifying reading session data.
 * The companion uses this to sense rhythm over time:
 *   pace, drift, immersion, hesitation, acceleration.
 *
 * NOT analytics. This data exists only to make the companion's
 * reflections more emotionally attuned to how a reader moves through
 * a book — not to surface metrics or build habit systems.
 *
 * REREAD COMPATIBILITY
 *   SessionEntry includes a `rereadEra` field (default 0). When reread
 *   support is added, filter sessions by `rereadEra` index to scope
 *   rhythm detection to a single read-through. The append-only log
 *   structure makes this straightforward.
 */

/**
 * Extracts structured SessionEntry objects from a readingLog.
 * Filters out legacy string entries and entries without chaptersRead
 * (older entries pre-dating this upgrade).
 *
 * Optionally filter to a specific rereadEra (default: all eras).
 *
 * @param {Array}  readingLog
 * @param {number} [era]      — if provided, only return entries for this rereadEra
 * @returns {SessionEntry[]}
 */
export function getSessionEntries(readingLog = [], era = undefined) {
  const entries = (readingLog || []).filter(e =>
    e && typeof e === 'object' && e.date && e.chaptersRead != null
  )
  if (era !== undefined) return entries.filter(e => (e.rereadEra ?? 0) === era)
  return entries
}

/**
 * Aggregate session metrics from structured session entries.
 * Returns null if insufficient data (< 2 sessions).
 *
 * @param {SessionEntry[]} entries
 * @returns {{ totalSessions, avgChapters, avgGapDays, longestGap, recentVelocity } | null}
 */
export function computeSessionMetrics(entries) {
  if (entries.length < 2) return null

  const total = entries.length
  const chapCounts = entries.map(e => e.chaptersRead || 0)
  const avgChapters = chapCounts.reduce((s, c) => s + c, 0) / total

  const gaps = entries
    .filter(e => e.gapDays != null && e.gapDays > 0)
    .map(e => e.gapDays)
  const avgGapDays  = gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length : null
  const longestGap  = gaps.length ? Math.max(...gaps) : null

  // Recent velocity: avg chapters/session over last 3 sessions
  const recent = entries.slice(-3)
  const recentVelocity = recent.reduce((s, e) => s + (e.chaptersRead || 0), 0) / recent.length

  return { totalSessions: total, avgChapters, avgGapDays, longestGap, recentVelocity }
}

/**
 * Classifies the reader's rhythm from structured session history.
 *
 * Requires ≥ 3 sessions with chaptersRead data for any classification.
 * Returns null when data is insufficient.
 *
 * Heuristics (in priority order):
 *   binge       — avg ≥ 4 chapters AND ≥ 2 sessions with 3+ chapters
 *   fragmented  — > 60% of sessions are single-chapter
 *   hesitant    — longest gap ≥ 15d occurred mid-book (20–80% progress)
 *   accelerating — recent velocity ≥ 1.5× overall avg (≥ 5 sessions)
 *   steady      — ≥ 4 sessions with low variance (catch-all when none of the above)
 *
 * @param {SessionEntry[]} entries
 * @returns {{ type: string, label: string } | null}
 */
export function detectReadingRhythm(entries) {
  if (entries.length < 3) return null

  const metrics = computeSessionMetrics(entries)
  if (!metrics) return null
  const { avgChapters, recentVelocity } = metrics

  // Binge: sustained long sessions
  const bingeCount = entries.filter(e => (e.chaptersRead || 0) >= 3).length
  if (avgChapters >= 4 && bingeCount >= 2) {
    return { type: 'binge', label: 'binge reading' }
  }

  // Fragmented: mostly single-chapter dips
  const singleCount = entries.filter(e => (e.chaptersRead || 0) === 1).length
  if (singleCount / entries.length > 0.6) {
    return { type: 'fragmented', label: 'fragmented reading' }
  }

  // Hesitant: significant mid-book pause
  const midBookHesitation = entries.find(e =>
    (e.gapDays ?? 0) >= 15 &&
    e.progressBefore != null &&
    e.progressBefore > 20 &&
    e.progressBefore < 80
  )
  if (midBookHesitation) {
    return { type: 'hesitant', label: 'hesitant mid-book' }
  }

  // Accelerating: recent pace notably faster than historical
  if (entries.length >= 5 && avgChapters > 0 && recentVelocity >= avgChapters * 1.5) {
    return { type: 'accelerating', label: 'accelerating pace' }
  }

  // Steady: consistent reading with enough history
  if (entries.length >= 4) {
    return { type: 'steady', label: 'steady pace' }
  }

  return null
}
