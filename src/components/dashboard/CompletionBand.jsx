import { useMemo } from 'react'
import { liveItems } from '../../utils/live.js'
import { fmtDate }   from '../../utils/date.js'
import { bookDepth } from '../../utils/depthLevel.js'
import { useSettings } from '../../context/SettingsContext.jsx'

// ── Rule-based completion reflection ──────────────────────────────────────────
// Reads what was accumulated and returns a single grounded observation.
// No AI dependency — always available, even for books with no key.
// Quiet depth: the companion doesn't speak at all on this surface.

function buildCompletionReflection(book, notes, sessions, openThreads) {
  const theoryNotes    = notes.filter(n => n.tag === 'theory')
  const confusingNotes = notes.filter(n => n.tag === 'confusing')
  const noteCount      = notes.length
  const sessionCount   = sessions.length

  const daySpan = book.firstOpenedAt && book.completedAt
    ? Math.max(1, Math.floor((new Date(book.completedAt) - new Date(book.firstOpenedAt)) / 86400000))
    : null

  if (openThreads.length >= 3 && noteCount >= 5)
    return "The reading ended, but not all of it has. Several questions it opened are still turning."

  if (theoryNotes.length >= 3 && noteCount >= 5)
    return "You kept building explanations as it moved. The companion held them alongside the story."

  if (noteCount >= 10 && daySpan && daySpan >= 14)
    return `${noteCount} thoughts across ${daySpan} days — a long stay with a book leaves something behind.`

  if (confusingNotes.length >= 2 && openThreads.length >= 1)
    return "Parts of this one stayed resistant. That may be where it lives."

  if (sessionCount >= 5 && noteCount >= 5)
    return "You came back to this one. Each session left something in the record."

  if (openThreads.length >= 1 && noteCount >= 3)
    return `The reading closed. ${openThreads.length === 1 ? 'One question' : `${openThreads.length} questions`} it opened didn't.`

  if (noteCount === 0 && sessionCount <= 2)
    return "A quiet reading. The companion watched from a distance."

  if (noteCount >= 5)
    return "The reading accumulated. The companion was present as it did."

  return "The last page. What the whole thing was is just beginning to settle."
}

// ── CompletionBand ─────────────────────────────────────────────────────────────
// Shown in place of CompanionBand when book.status === 'finished'.
// Archival, settled — the companion in its resolved state.
// No input field. No carousel. The reading record, not the reading present.

export default function CompletionBand({ book }) {
  const { settings } = useSettings()
  const depth = bookDepth(book, settings)

  const notes       = liveItems(book.notes)
  const openThreads = liveItems(book.mysteries).filter(m => !m.resolved)
  const sessions    = (book.readingLog || []).filter(e => e && typeof e === 'object' && e.date)

  const reflection = useMemo(
    () => buildCompletionReflection(book, notes, sessions, openThreads),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.id, notes.length, sessions.length, openThreads.length]
  )

  const completedDate = book.completedAt
  const daySpan = book.firstOpenedAt && completedDate
    ? Math.max(1, Math.floor((new Date(completedDate) - new Date(book.firstOpenedAt)) / 86400000))
    : null

  const hasStats = sessions.length > 0 || notes.length > 0 || (daySpan && daySpan > 1)

  return (
    <div className="px-5 sm:px-10" style={{ maxWidth: 1000, margin: '20px auto 0' }}>
      <div className="companion-band companion-band-body">

        {/* ── Finished header ── */}
        <div className="flex items-center justify-between mb-4">
          <p style={{
            fontFamily:    'var(--font-sans)',
            fontSize:      10,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color:         'var(--color-text-dim)',
          }}>
            {completedDate ? `Finished ${fmtDate(completedDate)}` : 'Finished'}
          </p>
          <span style={{ fontSize: 9, color: 'var(--ca, #B8860B)', opacity: 0.55 }}>✦</span>
        </div>

        {/* ── Companion reflection ── */}
        {depth !== 'quiet' && (
          <p className="font-serif italic leading-relaxed"
             style={{
               fontSize: 14,
               color:    'var(--color-ink-700)',
               marginBottom: hasStats ? 20 : 0,
             }}>
            {reflection}
          </p>
        )}

        {/* ── Reading arc stats ── */}
        {hasStats && (
          <div className="flex gap-6 flex-wrap">
            {sessions.length > 0 && (
              <div>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: 3 }}>
                  {sessions.length === 1 ? 'Session' : 'Sessions'}
                </p>
                <p className="font-serif" style={{ fontSize: 14, color: 'var(--color-ink-600)' }}>
                  {sessions.length}
                </p>
              </div>
            )}
            {notes.length > 0 && (
              <div>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: 3 }}>
                  Notes
                </p>
                <p className="font-serif" style={{ fontSize: 14, color: 'var(--color-ink-600)' }}>
                  {notes.length}
                </p>
              </div>
            )}
            {daySpan && daySpan > 1 && (
              <div>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: 3 }}>
                  Span
                </p>
                <p className="font-serif" style={{ fontSize: 14, color: 'var(--color-ink-600)' }}>
                  {daySpan} days
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Open threads — questions the story left unanswered ── */}
        {depth !== 'quiet' && openThreads.length > 0 && (
          <p className="font-serif italic"
             style={{ fontSize: 12, color: 'var(--color-ink-400)', marginTop: hasStats ? 16 : 4 }}>
            {openThreads.length === 1
              ? 'One thread still open when the last page turned.'
              : `${openThreads.length} threads still open when the last page turned.`}
          </p>
        )}

      </div>
    </div>
  )
}
