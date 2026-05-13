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

export function calcStreak(log = []) {
  const dates = logDates(log)
  if (!dates.length) return 0
  const today = new Date()
  const toKey  = d => d.toISOString().split('T')[0]
  const yest   = new Date(today); yest.setDate(yest.getDate() - 1)
  const sorted = [...new Set(dates)].sort().reverse()
  if (sorted[0] !== toKey(today) && sorted[0] !== toKey(yest)) return 0
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i - 1]) - new Date(sorted[i])) / 86400000
    if (diff === 1) streak++; else break
  }
  return streak
}
