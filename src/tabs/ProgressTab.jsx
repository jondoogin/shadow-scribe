import { useState, useMemo } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import WeightedProgressBar from '../components/shared/WeightedProgressBar.jsx'
import SectionHeading from '../components/shared/SectionHeading.jsx'
import { getProgress } from '../utils/progress.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { fmtDate } from '../utils/date.js'
import { generateOrientationLines } from '../utils/companionPresence.js'
import { liveItems } from '../utils/live.js'
import { bookDepth } from '../utils/depthLevel.js'

// ── CompanionOrientation — steadying / re-entry / "you are here" ─────────────
// Shows above the progress block when there's reading context.
// Emotionally distinct from CompanionPresenceZone — quieter, more grounding.
// Does NOT source from cached reflections (those belong to the carousel above).
// Short, present-tense sentences. Locates the reader without interpretation.

function CompanionOrientation({ book, settings }) {
  const lines = useMemo(
    () => generateOrientationLines(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.readingLog?.length, settings.insightStyle]
  )

  const hasContext = (book.currentChapter > 0) || (liveItems(book.notes).length > 0)
  if (!lines.length || !hasContext) return null

  return (
    <div className="companion-orientation-block mb-6 animate-fade-in">
      <div className="flex items-start gap-2.5">
        <span className="text-[9px] mt-[5px] flex-shrink-0 opacity-50" style={{ color: 'var(--ca, #B8860B)' }}>✦</span>
        <div>
          <p className="font-serif italic leading-relaxed" style={{ fontSize: 13, color: 'var(--color-ink-500)' }}>{lines[0]}</p>
          {lines[1] && (
            <p className="leading-relaxed mt-1.5" style={{ fontSize: 11, color: 'var(--color-ink-300)' }}>{lines[1]}</p>
          )}
        </div>
      </div>
    </div>
  )
}

const DURATION_LABELS = {
  brief:    'A brief return',
  steady:   'A steady stretch',
  immersed: 'Pulled you in',
}

const SESSION_PAGE = 8

export default function ProgressTab({ book, onUpdateBook }) {
  const { settings } = useSettings()
  const depth = bookDepth(book, settings)
  const pct   = getProgress(book)
  const [showAllSess, setShowAllSess] = useState(false)

  const label = book.format === 'audiobook' ? 'Part' : 'Chapter'

  // Sessions — most recent first
  const sessions = [...(book.readingLog || [])]
    .filter(e => e && typeof e === 'object' && e.date)
    .reverse()

  const visibleSessions = showAllSess ? sessions : sessions.slice(0, SESSION_PAGE)

  // Reading arc — shape of this reading over time
  const chronoFirst = sessions.length ? sessions[sessions.length - 1] : null
  const firstDate = book.firstOpenedAt
    ? new Date(book.firstOpenedAt)
    : chronoFirst ? new Date(chronoFirst.date) : null
  const lastDate  = sessions.length ? new Date(sessions[0].date) : null
  const daySpan   = firstDate && lastDate
    ? Math.max(1, Math.floor((lastDate - firstDate) / 86400000))
    : null

  const completedCount = book.chapters.filter(c => c.completed).length

  return (
    <div className="max-w-2xl">

      {/* ── Companion orientation — re-entry warmth + continuity ── */}
      {depth !== 'quiet' && book.status !== 'finished' && <CompanionOrientation book={book} settings={settings} />}

      {/* ── Progress — editorial spine (active books only) ── */}
      {book.status !== 'finished' && (
        <div className="mb-10">
          <div className="flex items-baseline gap-3 mb-3">
            <span
              className="font-serif tabular-nums"
              style={{ fontSize: 52, fontWeight: 300, color: 'var(--color-gold-accent)', letterSpacing: '-0.04em', lineHeight: 1 }}
            >
              {pct}
            </span>
            <span
              className="font-serif italic"
              style={{ fontSize: 18, color: 'var(--color-text-dim)', fontWeight: 300 }}
            >%</span>
            <span
              className="font-serif italic"
              style={{ fontSize: 13, color: 'var(--color-ink-400)' }}
            >
              — {completedCount} of {book.totalChapters} {book.format === 'audiobook' ? 'parts' : 'chapters'}
            </span>
          </div>
          <WeightedProgressBar book={book} height="h-px" />
          {pct >= 85 && pct < 100 && depth !== 'quiet' && (
            <p className="companion-echo mt-2" style={{ fontSize: 10 }}>
              The weight shifts toward the end.
            </p>
          )}
        </div>
      )}

      {/* ── Extraction warning (AI fallback or parse issues) ── */}
      {book.extractionMeta?.aiFailedFallback && !book.extractionMeta?.warningsDismissed && (
        <div className="rounded-xl border border-sienna-pale bg-sienna-bg p-4 mb-6 flex items-start gap-3 animate-fade-in">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-sienna font-medium leading-relaxed">
              Claude wasn't available during import — characters and summaries were extracted using a simpler approach.
              You can add characters and notes manually as you read.
            </p>
          </div>
          <button
            onClick={() => onUpdateBook({ extractionMeta: { ...book.extractionMeta, warningsDismissed: true } })}
            className="flex-shrink-0 text-sienna/60 hover:text-sienna transition-colors mt-0.5"
            aria-label="Dismiss">
            <Ico.X />
          </button>
        </div>
      )}

      {/* ── Reading arc — shape of this reading ── */}
      {(sessions.length > 0 || book.firstOpenedAt) && (
        <div className="flex gap-8 flex-wrap mb-10 pb-8 border-b border-ink-100">
          {firstDate && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-300 mb-1.5">First opened</p>
              <p className="font-serif" style={{ fontSize: 14, color: 'var(--color-ink-600)' }}>
                {fmtDate(firstDate.toISOString())}
              </p>
            </div>
          )}
          {book.status === 'finished' && book.completedAt && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-300 mb-1.5">Completed</p>
              <p className="font-serif" style={{ fontSize: 14, color: 'var(--color-ink-600)' }}>
                {fmtDate(book.completedAt)}
              </p>
            </div>
          )}
          {sessions.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-300 mb-1.5">
                {sessions.length === 1 ? 'Session' : 'Sessions'}
              </p>
              <p className="font-serif" style={{ fontSize: 14, color: 'var(--color-ink-600)' }}>
                {sessions.length}
              </p>
            </div>
          )}
          {daySpan && daySpan > 1 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-300 mb-1.5">Span</p>
              <p className="font-serif" style={{ fontSize: 14, color: 'var(--color-ink-600)' }}>
                {daySpan} days
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Session history ── */}
      {sessions.length > 0 ? (
        <>
          <SectionHeading>visits</SectionHeading>
          <div className="mb-6">
            {visibleSessions.map((s, i) => {
              const chRange = (s.startChapter === 0 && s.endChapter === 0)
                ? null  // migrated entry — no chapter data
                : s.startChapter === s.endChapter
                  ? `${label} ${s.endChapter}`
                  : `${label} ${s.startChapter + 1}–${s.endChapter}`
              // Temporal aging — older visits settle progressively into silence
              const sessionAge = s.date ? Math.floor((Date.now() - new Date(s.date)) / 86400000) : 0
              const sessionOpacity = sessionAge > 90 ? 0.28
                : sessionAge > 60 ? 0.42
                : sessionAge > 30 ? 0.65
                : 1
              const aged     = sessionAge > 30
              const deepAged = sessionAge > 60
              return (
                <div key={s.id || i}
                  className="session-row flex items-start gap-4 py-2.5"
                  style={{ opacity: sessionOpacity, transition: 'opacity 0.2s ease' }}
                >
                  <span
                    className="w-20 flex-shrink-0 pt-0.5 tabular-nums"
                    style={{
                      fontSize: deepAged ? 10 : 11,
                      color: deepAged ? 'var(--color-ink-200)' : aged ? 'var(--color-ink-300)' : 'var(--color-ink-400)',
                    }}
                  >
                    {fmtDate(s.date)}
                  </span>
                  <div className="flex-1 min-w-0">
                    {chRange && (
                      <span style={{
                        fontSize: deepAged ? 11 : 12,
                        color: deepAged ? 'var(--color-ink-300)' : aged ? 'var(--color-ink-400)' : 'var(--color-ink-700)',
                      }}>{chRange}</span>
                    )}
                    {s.durationEstimate && (
                      <span
                        className="italic"
                        style={{ fontSize: deepAged ? 10 : 11, color: 'var(--color-ink-400)', marginLeft: chRange ? 8 : 0 }}
                      >
                        {DURATION_LABELS[s.durationEstimate]}
                      </span>
                    )}
                    {!chRange && !s.durationEstimate && (
                      <span style={{ fontSize: deepAged ? 11 : 12, color: 'var(--color-ink-400)', fontStyle: 'italic' }}>a visit</span>
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
              {showAllSess ? 'show fewer' : `show all ${sessions.length} visits`}
            </button>
          )}
        </>
      ) : (
        <p className="font-serif italic leading-relaxed" style={{ fontSize: 14, color: 'var(--color-ink-500)' }}>
          {depth === 'quiet'
            ? 'Sessions accumulate here as you read.'
            : depth === 'saturated'
            ? 'Every session settles here. The companion traces the shape of the reading as it forms.'
            : 'Every session settles here — a record of how this book was read.'}
        </p>
      )}

    </div>
  )
}
