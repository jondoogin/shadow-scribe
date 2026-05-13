import { useState } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import WeightedProgressBar from '../components/shared/WeightedProgressBar.jsx'
import SectionHeading from '../components/shared/SectionHeading.jsx'
import { getProgress } from '../utils/progress.js'
import { getChapterLabel, isSpecialChapter } from '../utils/chapterHelpers.js'
import { getChapterTitle, getEffectiveMode } from '../utils/spoiler.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { fmtDate } from '../utils/date.js'

const DURATION_LABELS = {
  brief:    'A brief return',
  steady:   'A steady stretch',
  immersed: 'Pulled you in',
}

const SESSION_PAGE = 8

export default function ProgressTab({ book, onUpdateBook, onOpenUpdate }) {
  const { settings } = useSettings()
  const mode = getEffectiveMode(book, settings)
  const pct = getProgress(book)
  const [celebrating,   setCelebrating]   = useState(null)
  const [showAllSess,   setShowAllSess]   = useState(false)
  const isNew = pct === 0 && !(book.readingLog?.length)

  const label = book.format === 'audiobook' ? 'Part' : 'Chapter'

  // Normalise and reverse for display (most recent first)
  const sessions = [...(book.readingLog || [])]
    .filter(e => e && typeof e === 'object' && e.date)
    .reverse()

  const visibleSessions = showAllSess ? sessions : sessions.slice(0, SESSION_PAGE)

  const toggleChapter = num => {
    const ch = book.chapters.find(c => c.num === num)
    if (!ch) return
    const wasCompleted = ch.completed
    const updated = book.chapters.map(c => c.num === num ? { ...c, completed: !c.completed } : c)
    const newCurrent = !wasCompleted
      ? Math.max(...updated.filter(c => c.completed).map(c => c.num))
      : book.currentChapter
    onUpdateBook({ chapters:updated, currentChapter:newCurrent, lastUpdated:new Date().toISOString().split('T')[0] })
    if (!wasCompleted) { setCelebrating(num); setTimeout(() => setCelebrating(null), 700) }
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-cream-50 rounded-2xl border border-ink-200 p-6 mb-8 text-center">
        <div className="font-serif text-5xl font-bold text-ink-900 tabular-nums mb-1">
          {pct}<span className="text-2xl text-ink-400 font-normal">%</span>
        </div>
        <p className="text-[13px] text-ink-500 mb-4">
          {book.chapters.filter(c => c.completed).length} of {book.totalChapters} chapters complete
        </p>
        <WeightedProgressBar book={book} height="h-2.5" className="max-w-xs mx-auto" />
      </div>

      {isNew && (
        <div className="rounded-xl border p-5 mb-6 text-center animate-fade-in"
          style={{ background:'var(--ca-bg, #FDF8EC)', borderColor:'var(--ca-border, #E8D090)' }}>
          <p className="font-serif text-[15px] text-ink-800 font-semibold mb-1.5">The companion is open.</p>
          <p className="text-[13px] text-ink-500 leading-relaxed mb-4">
            Mark chapters as you read. Notes, mysteries, and characters will gather here.
          </p>
          {onOpenUpdate && (
            <button onClick={onOpenUpdate}
              className="text-[13px] font-semibold transition-opacity hover:opacity-75"
              style={{ color:'var(--ca, #B8860B)' }}>
              Log your first session →
            </button>
          )}
        </div>
      )}

      <SectionHeading>Chapter Checklist</SectionHeading>
      <div className="space-y-1.5 mb-10">
        {book.chapters.map(ch => {
          const isCurrent = ch.num === book.currentChapter && !ch.completed
          const isNext    = ch.num === book.currentChapter + 1 && !ch.completed
          return (
            <div
              key={ch.num}
              onClick={() => toggleChapter(ch.num)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all select-none ${
                ch.completed ? 'bg-sage-bg border border-sage-pale'
                : isCurrent  ? 'border'
                : 'bg-cream-50 border border-ink-200 hover:border-ink-300'
              } ${celebrating === ch.num ? 'animate-celebrate' : ''}`}
              style={isCurrent && !ch.completed ? { background:'var(--ca-bg, #FDF8EC)', borderColor:'var(--ca-border, #E8D090)' } : {}}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  ch.completed ? 'bg-sage border-sage' : isCurrent ? 'border' : 'border-ink-300'
                }`}
                style={isCurrent && !ch.completed ? { borderColor:'var(--ca, #B8860B)' } : {}}
              >
                {ch.completed && <span className="text-white"><Ico.Check /></span>}
                {isCurrent && !ch.completed && <span className="w-2 h-2 rounded-full block" style={{ background:'var(--ca, #B8860B)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span
                    className={`text-[11px] font-bold ${ch.completed ? 'text-sage' : !isCurrent ? (isSpecialChapter(ch) ? 'text-ink-500' : 'text-ink-400') : ''}`}
                    style={isCurrent && !ch.completed ? { color:'var(--ca, #B8860B)' } : {}}
                  >
                    {getChapterLabel(ch, book.format)}
                  </span>
                  {isNext    && <span className="text-[10px] bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded-full">Up next</span>}
                  {isCurrent && (
                    <span className="text-[10px] border px-1.5 py-0.5 rounded-full" style={{ background:'var(--ca-bg, #FDF8EC)', color:'var(--ca, #B8860B)', borderColor:'var(--ca-border, #E8D090)' }}>
                      Reading now
                    </span>
                  )}
                  {ch.important && <span className="text-gold text-[11px] leading-none">★</span>}
                </div>
                <p className={`text-[13px] font-medium truncate ${ch.completed ? 'line-through text-ink-400' : 'text-ink-700'}`}>
                  {getChapterTitle(book, ch, mode)}
                </p>
              </div>
              {celebrating === ch.num && <span className="confetti-dot text-base">✨</span>}
            </div>
          )
        })}
      </div>

      {/* ── Session history ── */}
      {sessions.length > 0 && (
        <>
          <SectionHeading>Reading sessions</SectionHeading>
          <div className="space-y-0 border border-ink-100 rounded-xl overflow-hidden mb-6">
            {visibleSessions.map((s, i) => {
              const chRange = (s.startChapter === 0 && s.endChapter === 0)
                ? null  // migrated entry — no chapter data
                : s.startChapter === s.endChapter
                  ? `${label} ${s.endChapter}`
                  : `${label} ${s.startChapter + 1}–${s.endChapter}`
              return (
                <div key={s.id || i}
                  className={`flex items-start gap-4 px-4 py-3 ${
                    i < visibleSessions.length - 1 ? 'border-b border-ink-100' : ''
                  }`}>
                  <span className="text-[11px] text-ink-400 w-20 flex-shrink-0 pt-0.5 tabular-nums">
                    {fmtDate(s.date)}
                  </span>
                  <div className="flex-1 min-w-0">
                    {chRange && (
                      <span className="text-[12px] text-ink-700">{chRange}</span>
                    )}
                    {s.durationEstimate && (
                      <span className={`text-[11px] text-ink-400 italic ${chRange ? ' ml-2' : ''}`}>
                        {DURATION_LABELS[s.durationEstimate]}
                      </span>
                    )}
                    {!chRange && !s.durationEstimate && (
                      <span className="text-[12px] text-ink-400 italic">Session recorded</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {sessions.length > SESSION_PAGE && (
            <button
              onClick={() => setShowAllSess(v => !v)}
              className="text-[11px] text-ink-400 italic hover:text-ink-600 transition-colors mb-8">
              {showAllSess ? 'Show fewer' : `Show all ${sessions.length} sessions`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
