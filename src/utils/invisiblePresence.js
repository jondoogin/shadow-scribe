/**
 * invisiblePresence.js — Companion Fade Architecture
 *
 * The companion should feel quieter over time — less like a system
 * speaking to the reader, more like something quietly accompanying attention.
 *
 * This module computes:
 *   PRESENCE VISIBILITY     How visible the companion should be (0–1)
 *   FADE DETECTION          Whether the companion should recede right now
 *   SELF-SUSTAINING BOOKS   Books that carry their own atmosphere
 *   INTERRUPTION RISK       Whether surfacing would fragment reading flow
 *   SILENCE DURATION        How long the companion has been still
 *   DORMANT OBSERVATION AGE Age of unsurfaced reflections
 *   CONFIDENCE GATING       Threshold before any observation surfaces
 *   OBSERVATION CAP         Dynamic cap accounting for fade state
 */

import { calcStreak, logDates } from './date.js'
import { getProgress }          from './progress.js'

// ── Constants ─────────────────────────────────────────────────────────────────

// Hours of silence before the companion is considered "still"
export const SILENCE_THRESHOLD_H  = 24

// Minimum confidence score (0–1) before a reflection is allowed to surface
export const CONFIDENCE_THRESHOLD = 0.35

// ── Internal helpers ──────────────────────────────────────────────────────────

function sessionEntries(log = []) {
  return (log || []).filter(e => e && typeof e === 'object' && e.date)
}

function eraLog(book) {
  const log = book.readingLog || []
  const era = book.rereadCount || 0
  return log.filter(s => typeof s === 'object' && (s.rereadEra ?? 0) === era)
}

// ── Self-sustaining narrative detection ───────────────────────────────────────

/**
 * Detects whether a book is carrying its own atmosphere — the reader is absorbed
 * without engaging the companion surface.
 *
 * Signals:
 *   low-annotation-high-engagement  Many sessions, very few notes
 *   sustained-immersion             3+ of last 5 sessions were 'immersed'
 *   binge-pace                      ≥1.5 sessions/day average
 *   near-finish-no-annotation       75%+ progress, ≤2 notes, 3+ sessions
 *
 * @returns {{ selfSustaining: boolean, signals: string[] }}
 */
export function detectSelfSustainingNarrative(book) {
  const log     = eraLog(book)
  const entries = sessionEntries(log)
  const notes   = book.notes || []
  const pct     = getProgress(book)
  const signals = []

  if (entries.length < 2) return { selfSustaining: false, signals }

  // High session count with very few notes — absorbed without annotating
  const noteRatio = notes.length / entries.length
  if (entries.length >= 4 && noteRatio < 0.5) {
    signals.push('low-annotation-high-engagement')
  }

  // Recent immersed sessions (3+ of last 5)
  const recent5       = entries.slice(-5)
  const immersedCount = recent5.filter(e => e.durationEstimate === 'immersed').length
  if (immersedCount >= 3) signals.push('sustained-immersion')

  // Binge-pace: ≥1.5 session-days per calendar day
  const dates = [...new Set(logDates(log))].sort()
  if (dates.length >= 4) {
    const daySpan        = Math.max(1, Math.floor((new Date(dates[dates.length - 1]) - new Date(dates[0])) / 86400000))
    const sessionsPerDay = dates.length / daySpan
    if (sessionsPerDay >= 1.5) signals.push('binge-pace')
  }

  // Near-finish sprint with almost no annotation
  if (pct >= 75 && notes.length <= 2 && entries.length >= 3) {
    signals.push('near-finish-no-annotation')
  }

  return { selfSustaining: signals.length >= 2, signals }
}

// ── Presence visibility ───────────────────────────────────────────────────────

/**
 * Computes how visible the companion surface should be (0 = invisible, 1 = full).
 *
 * Factors that reduce visibility:
 *   Self-sustaining narrative (book is fully carrying the experience)
 *   Post-finish state
 *   High reading streak (deep absorption)
 *   Reader who hasn't engaged the companion (no notes, many sessions)
 *   Minimal insight style
 *
 * @returns {number} 0–1
 */
export function computePresenceVisibility(book, settings) {
  const log     = eraLog(book)
  const entries = sessionEntries(log)
  const notes   = book.notes || []
  const pct     = getProgress(book)
  const style   = settings?.insightStyle ?? 'observational'
  let v = 1.0

  const { selfSustaining } = detectSelfSustainingNarrative(book)
  if (selfSustaining) v -= 0.30

  if (pct >= 99) {
    v -= 0.25
    if (notes.length < 3) v -= 0.15
  }

  const streak = calcStreak(log)
  if      (streak >= 7) v -= 0.15
  else if (streak >= 4) v -= 0.08

  if      (notes.length === 0 && entries.length >= 3) v -= 0.20
  else if (notes.length <= 1  && entries.length >= 5) v -= 0.10

  if (style === 'minimal') v -= 0.15

  return Math.max(0, Math.min(1, v))
}

// ── Should fade ───────────────────────────────────────────────────────────────

/**
 * Boolean: should the companion actively recede right now?
 * True when visibility drops below 0.55 or when a self-sustaining
 * narrative has been detected.
 */
export function shouldFadePresence(book, settings) {
  if (computePresenceVisibility(book, settings) < 0.55) return true
  return detectSelfSustainingNarrative(book).selfSustaining
}

// ── Interruption risk ─────────────────────────────────────────────────────────

/**
 * Estimates how much surfacing an observation right now would interrupt flow.
 * Returns 0 (safe) to 1 (high risk).
 *
 * Risk factors:
 *   Reflections already shown frequently (companion already busy)
 *   Last session was immersed
 *   Binge-reading pace
 *   Emotional climax zone (80–95% progress)
 */
export function computeInterruptionRisk(book) {
  const log     = eraLog(book)
  const entries = sessionEntries(log)
  const pct     = getProgress(book)
  const cache   = book.reflectionCache
  let risk = 0

  if (cache?.reflections) {
    const highSurface = cache.reflections.filter(r => (r.surfaceCount ?? 0) >= 3).length
    if (highSurface >= 2) risk += 0.25
  }

  const last = entries[entries.length - 1]
  if (last?.durationEstimate === 'immersed') risk += 0.20

  const { signals } = detectSelfSustainingNarrative(book)
  if (signals.includes('binge-pace'))          risk += 0.20
  if (signals.includes('sustained-immersion')) risk += 0.15

  if (pct >= 80 && pct < 96) risk += 0.20

  return Math.min(1, risk)
}

// ── Silence duration ──────────────────────────────────────────────────────────

/**
 * Returns hours since the last reading session, or null if none recorded.
 */
export function computeSilenceDuration(book) {
  const dates = logDates(eraLog(book))
  if (!dates.length) return null
  const last = [...dates].sort().pop()
  return Math.floor((Date.now() - new Date(last).getTime()) / 3_600_000)
}

// ── Dormant observation age ───────────────────────────────────────────────────

/**
 * Returns the age in hours of the oldest unsurfaced dormant reflection
 * (surfaceCount = 0, generated > 24h ago), or null if none.
 * A long dormant age signals that the companion has been quietly waiting.
 */
export function computeDormantObservationAge(book) {
  const reflections = book.reflectionCache?.reflections
  if (!reflections?.length) return null
  const now     = Date.now()
  const dormant = reflections
    .filter(r => !r.suppressed && (r.surfaceCount ?? 0) === 0)
    .filter(r => r.generatedAt && (now - new Date(r.generatedAt).getTime()) > 86_400_000)
  if (!dormant.length) return null
  const oldest = dormant.sort((a, b) => new Date(a.generatedAt) - new Date(b.generatedAt))[0]
  return Math.floor((now - new Date(oldest.generatedAt).getTime()) / 3_600_000)
}

// ── Confidence threshold ──────────────────────────────────────────────────────

/**
 * Evaluates whether a reflection meets the confidence bar for surfacing.
 * Returns { passes: boolean, score: number, axes: Object }
 *
 * Axes (each 0–1, weighted sum must reach CONFIDENCE_THRESHOLD):
 *   novelty            Has this been surfaced fewer than 2 times?
 *   reinforcement      Priority signal strength (p3 > p2 > p1)
 *   emotionalPersist   Type weight (resonance-anchor/shift > others)
 *   temporalDepth      Was this generated long enough ago to feel considered?
 *   thematicRecurrence Is the dominant book theme represented?
 */
export function meetsConfidenceThreshold(reflection, ctx) {
  const axes = {}

  const sc = reflection.surfaceCount ?? 0
  axes.novelty = sc === 0 ? 1 : sc === 1 ? 0.60 : 0.20

  const p = reflection.priority ?? 1
  axes.reinforcement = p === 3 ? 1 : p === 2 ? 0.65 : 0.30

  axes.emotionalPersist =
    (reflection.type === 'resonance-anchor' || reflection.type === 'interpretation-shift') ? 0.90 :
    (reflection.type === 'early-note-callback' || reflection.type === 'residue-callback')  ? 0.80 :
    (reflection.type === 'theme-persistence' || reflection.type === 'temporal-evolution')  ? 0.70 :
    (reflection.type === 'motif-callback' || reflection.type === 'atmospheric-memory')     ? 0.65 :
    (reflection.type === 'expressive-silence')                                             ? 0.75 : 0.40

  const ageH = reflection.generatedAt
    ? (Date.now() - new Date(reflection.generatedAt).getTime()) / 3_600_000
    : 0
  axes.temporalDepth = ageH >= 48 ? 1 : ageH >= 12 ? 0.75 : ageH >= 2 ? 0.50 : 0.20

  const { dominantTheme, themeCount } = ctx ?? {}
  axes.thematicRecurrence =
    dominantTheme && (themeCount?.[dominantTheme] ?? 0) >= 3 ? 0.80 : 0.30

  const score =
    axes.novelty            * 0.30 +
    axes.reinforcement      * 0.25 +
    axes.emotionalPersist   * 0.20 +
    axes.temporalDepth      * 0.15 +
    axes.thematicRecurrence * 0.10

  return { passes: score >= CONFIDENCE_THRESHOLD, score, axes }
}

// ── Observation cap ───────────────────────────────────────────────────────────

/**
 * Returns the maximum number of observations to surface at once,
 * accounting for visibility, style, and narrative gravity pressure.
 *
 * After signal arbitration, quality > quantity — fewer observations
 * means each one carries more emotional weight.
 *
 * Wisdom deepening: cap 3 now requires v ≥ 0.75 (raised from 0.65).
 * Most books will surface arc + 1 observation. Cap 3 is earned, not default.
 *
 *   Full presence (v ≥ 0.75): 3 (observational) / 2 (minimal)
 *   Standard (v ≥ 0.45):      2 (observational)
 *   Fading:                   1 (arc only, both styles)
 *
 * Cross-system gravity pressure: dense unresolved mystery state reduces
 * the effective visibility, compressing companion output further.
 * The narrative's own tension is already doing work — companion yields.
 */
export function computeObservationCap(book, settings) {
  const style = settings?.insightStyle ?? 'observational'
  const v     = computePresenceVisibility(book, settings)

  // Gravity pressure: emotionally dense books generate their own tension
  const openMyst = (book.mysteries || []).filter(m => !m.resolved).length
  const gravityPressure = openMyst >= 6 ? 0.15 : openMyst >= 4 ? 0.08 : 0
  const effectiveV = Math.max(0, v - gravityPressure)

  if (style === 'minimal') return effectiveV < 0.65 ? 1 : 2
  return effectiveV < 0.45 ? 1 : effectiveV < 0.75 ? 2 : 3
}

// ── Narrative primacy ─────────────────────────────────────────────────────────

/**
 * Computes how dominant the narrative is over the companion (0 = companion
 * may speak freely; 1 = book should speak alone).
 *
 * Factors:
 *   Structural complexity     Many mysteries → narrative resists easy reduction
 *   Self-sustaining reading   Book is already carrying the experience
 *   Emotionally dense session Reader is actively processing through notes
 *   Narrative climax zone     80–96% progress: the ending is approaching
 *   Post-finish               Book has ended; it should remain large in memory
 */
export function computeNarrativeDominance(book, settings) {
  const notes     = book.notes     || []
  const mysteries = book.mysteries || []
  const pct       = getProgress(book)
  let dominance   = 0

  // Structural complexity: dense mystery count = narrative resists companion reduction
  if      (mysteries.length >= 8) dominance += 0.20
  else if (mysteries.length >= 5) dominance += 0.12
  else if (mysteries.length >= 3) dominance += 0.06

  // Self-sustaining: book is doing the work; companion is beside the point
  const { selfSustaining, signals } = detectSelfSustainingNarrative(book)
  if      (selfSustaining)       dominance += 0.25
  else if (signals.length >= 1)  dominance += 0.08

  // Emotionally dense note session in last 48h: reader is already processing deeply
  const now          = Date.now()
  const recentNotes  = notes.filter(n => n.date && (now - new Date(n.date).getTime()) < 172_800_000)
  const emotionalN   = recentNotes.filter(n => ['theory', 'confusing', 'theme'].includes(n.tag))
  if      (emotionalN.length >= 4) dominance += 0.20
  else if (emotionalN.length >= 2) dominance += 0.10

  // Narrative climax zone
  if      (pct >= 80 && pct < 97) dominance += 0.20
  else if (pct >= 70)              dominance += 0.10

  // Post-finish: the book has ended; silence honours it
  if (pct >= 99) dominance += 0.25

  return Math.min(1, dominance)
}

/**
 * Returns true when the narrative should speak alone and the companion
 * should yield entirely — returning no observations and suppressing
 * even cached reflections.
 *
 * Threshold: dominance ≥ 0.75 OR solitude is actively protected.
 */
export function shouldYieldToBook(book, settings) {
  if (computeNarrativeDominance(book, settings) >= 0.75) return true
  return isSolitudeProtected(book)
}

/**
 * Detects when the companion has saturated the reading experience —
 * surfacing observations more densely than the reading warrants.
 *
 * Signals:
 *   high-surface-density    Total surfacings / sessions ≥ 3
 *   all-reflections-seen    Every reflection shown ≥ 2 times
 *   thematic-recursion      One reflection type shown ≥ 4 times total
 *
 * @returns {{ saturated: boolean, signals: string[] }}
 */
export function detectNarrativeSaturation(book) {
  const reflections = book.reflectionCache?.reflections
  const log         = eraLog(book)
  const entries     = sessionEntries(log)
  const signals     = []

  if (!reflections?.length || !entries.length) return { saturated: false, signals }

  const totalSurfacings = reflections.reduce((s, r) => s + (r.surfaceCount ?? 0), 0)
  if (totalSurfacings / entries.length >= 3) signals.push('high-surface-density')

  if (reflections.length >= 2 && reflections.every(r => (r.surfaceCount ?? 0) >= 2)) {
    signals.push('all-reflections-seen')
  }

  const typeCount = {}
  for (const r of reflections) {
    typeCount[r.type] = (typeCount[r.type] || 0) + (r.surfaceCount ?? 0)
  }
  if (Math.max(0, ...Object.values(typeCount)) >= 4) signals.push('thematic-recursion')

  return { saturated: signals.length >= 2, signals }
}

/**
 * Returns true when the reader should have complete solitude with the text.
 *
 * Triggers:
 *   Post-finish                  Book has ended; the companion steps away
 *   Emotionally dense session    ≥ 3 theory/theme/confusing notes in last 24h
 *   Sustained immersion          Last 3 sessions all 'immersed'
 *   Early reread                 Currently on a reread, first 15% of the book
 */
export function isSolitudeProtected(book) {
  const notes   = book.notes || []
  const pct     = getProgress(book)
  const log     = eraLog(book)
  const entries = sessionEntries(log)

  if (pct >= 99) return true

  const now         = Date.now()
  const recentNotes = notes.filter(n => n.date && (now - new Date(n.date).getTime()) < 86_400_000)
  if (recentNotes.filter(n => ['theory', 'theme', 'confusing'].includes(n.tag)).length >= 3) return true

  const recent3 = entries.slice(-3)
  if (recent3.length === 3 && recent3.every(e => e.durationEstimate === 'immersed')) return true

  if ((book.rereadCount ?? 0) > 0 && pct < 15) return true

  return false
}
