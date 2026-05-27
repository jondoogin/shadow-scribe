export function fmtDate(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Normalise a readingLog that may be string[] or SessionEntry[] → string[]
export function logDates(readingLog = []) {
  return (readingLog || []).map(e => (typeof e === 'string' ? e : e?.date)).filter(Boolean)
}

/**
 * Returns today's date as a YYYY-MM-DD string in the user's LOCAL timezone.
 * Use this everywhere we store or compare reading dates.
 *
 * Note: existing log entries may have been stored with UTC date strings
 * (via toISOString().split('T')[0]). For users west of UTC who read late
 * at night, those entries are one day ahead of their local date. This
 * helper normalises the "current day" side of comparisons so streaks are
 * calculated against what the user considers today, not UTC today.
 */
export function localDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function calcStreak(log = []) {
  const dates = logDates(log)
  if (!dates.length) return 0

  const today    = localDateKey()
  const yesterd  = new Date(); yesterd.setDate(yesterd.getDate() - 1)
  const yest     = localDateKey(yesterd)

  const sorted = [...new Set(dates)].sort().reverse()

  // Streak is dead if the most recent session was more than one day ago
  if (sorted[0] !== today && sorted[0] !== yest) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    // Parse as midnight UTC (T00:00:00Z) so DST shifts don't corrupt the diff
    const prev = Date.parse(sorted[i - 1] + 'T00:00:00Z')
    const curr = Date.parse(sorted[i]     + 'T00:00:00Z')
    const diffDays = (prev - curr) / 86_400_000
    if (diffDays === 1) streak++
    else break
  }
  return streak
}
