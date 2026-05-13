import { calcStreak } from '../../utils/date.js'

function recentCount(log = [], days = 7) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return log.filter(d => new Date(d) >= cutoff).length
}

function daysSince(log = []) {
  if (!log.length) return null
  const last = [...log].sort().pop()
  return Math.floor((Date.now() - new Date(last)) / 86400000)
}

function weeksSince(log = []) {
  if (!log.length) return null
  const first = [...log].sort()[0]
  return Math.round((Date.now() - new Date(first)) / (86400000 * 7))
}

export default function ReadingMomentum({ book }) {
  const log     = book.readingLog || []
  const streak  = calcStreak(log)
  const sessions = log.length
  const recent7 = recentCount(log, 7)
  const gap     = daysSince(log)
  const weeks   = weeksSince(log)

  let primary   = null
  let secondary = null

  if (streak >= 7) {
    primary = `${streak}-day reading streak`
    secondary = "This story has its hooks in you."
  } else if (streak >= 4) {
    primary = `${streak} days in a row`
    secondary = "Something is keeping you here."
  } else if (streak === 3) {
    primary = "Three days running"
  } else if (streak === 2) {
    primary = "Reading two days in a row"
  } else if (streak === 1) {
    primary = "Back to the story today"
    if (gap !== null && gap === 0 && sessions > 3) secondary = `${sessions} sessions total`
  } else if (recent7 >= 4) {
    primary = "An absorbed stretch this week"
    secondary = `${recent7} sessions in 7 days`
  } else if (gap !== null && gap > 60 && sessions > 0) {
    primary = "A long time away from this story"
    secondary = "It hasn't changed. You may have."
  } else if (gap !== null && gap > 30 && sessions > 0) {
    primary = "Over a month since your last session"
    secondary = "It's still here, unchanged."
  } else if (gap !== null && gap > 14 && sessions > 0) {
    primary = "Some time away from the story"
    secondary = "It will be here when you return."
  } else if (gap !== null && gap > 7 && sessions > 0) {
    primary = "A week since your last session"
  } else if (sessions > 0) {
    primary = `${sessions} session${sessions !== 1 ? 's' : ''} recorded`
    if (weeks !== null && weeks >= 2) secondary = `${weeks} weeks with this book`
  }

  if (!primary) return null

  return (
    <div className="mt-2 space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span className="momentum-dot text-[8px]" style={{ color:'var(--ca, #B8860B)' }}>●</span>
        <span className="text-[11px] text-ink-400">{primary}</span>
      </div>
      {secondary && (
        <p className="text-[11px] text-ink-300 pl-3.5 italic">{secondary}</p>
      )}
    </div>
  )
}
