import { calcStreak } from '../../utils/date.js'

export default function ReadingMomentum({ book }) {
  const streak   = calcStreak(book.readingLog)
  const sessions = (book.readingLog || []).length

  let text = null
  if (streak >= 3)       text = `${streak}-day reading streak`
  else if (streak === 2) text = 'Reading two days in a row'
  else if (streak === 1) text = 'Back to the story today'
  else if (sessions > 0) text = `${sessions} session${sessions > 1 ? 's' : ''} recorded`

  if (!text) return null

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className="momentum-dot text-[8px]" style={{ color:'var(--ca, #B8860B)' }}>●</span>
      <span className="text-[11px] text-ink-400">{text}</span>
    </div>
  )
}
