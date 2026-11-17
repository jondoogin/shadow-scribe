import BookCover from '../shared/BookCover.jsx'
import ProgressBar from '../shared/ProgressBar.jsx'
import { getProgress } from '../../utils/progress.js'
import { fmtDate } from '../../utils/date.js'
import { liveItems } from '../../utils/live.js'

function ordinal(n) {
  if (n === 11 || n === 12 || n === 13) return n + 'th'
  const r = n % 10
  if (r === 1) return n + 'st'
  if (r === 2) return n + 'nd'
  if (r === 3) return n + 'rd'
  return n + 'th'
}

export default function BookCard({ book, onClick, hero = false, primary = false, presence = '' }) {
  const pct         = getProgress(book)
  const rereadCount = book.rereadCount || 0

  // Temporal receding — the gap since last reading registers as visual distance.
  // Recent: present and warm. Old: the date fades toward silence.
  const daysSince = book.lastUpdated
    ? Math.floor((Date.now() - new Date(book.lastUpdated)) / 86400000)
    : 999
  const dateColor = daysSince > 60
    ? 'var(--color-ink-200)'       // long absence — near-invisible, the silence speaks
    : daysSince > 14
    ? 'var(--color-ink-300)'       // weeks away — receding
    : 'var(--color-ink-400)'       // recent — present and warm

  // Author color — slightly muted always; recedes gently with time
  const authorColor = daysSince > 90
    ? 'var(--color-ink-300)'   // long absence — quieter
    : daysSince > 45
    ? 'var(--color-ink-400)'   // cooling
    : 'var(--color-ink-500)'   // present

  // Cover opacity — presence-weighted perceptual clarity.
  // A deeply inhabited book holds full presence. Sparse and dormant books
  // quietly recede — not hidden, but no longer fully forward.
  const coverOpacity = book.status === 'finished' ? 0.80
    : daysSince > 90      ? 0.70   // very old — fading out of sight
    : presence === 'deep' ? 1.0    // fully inhabited — complete attention
    : presence === 'inhabited' ? 0.97
    : 0.91                          // sparse — quietly receded

  // Inhabited books cast a heavier, warmer cover shadow.
  // Sparse and dormant books lose shadow depth — the light has moved on.
  const coverShadow = presence === 'deep'
    ? '0 5px 20px rgba(0,0,0,.28), 0 1px 6px rgba(0,0,0,.16)'
    : presence === 'inhabited'
    ? '0 4px 16px rgba(0,0,0,.22), 0 1px 5px rgba(0,0,0,.12)'
    : daysSince > 90
    ? '0 2px 10px rgba(0,0,0,.10), 0 1px 3px rgba(0,0,0,.06)'
    : daysSince > 45
    ? '0 2px 12px rgba(0,0,0,.13), 0 1px 3px rgba(0,0,0,.08)'
    : '0 3px 14px rgba(0,0,0,.18), 0 1px 4px rgba(0,0,0,.10)'

  const chapterColor = daysSince > 45 ? 'var(--color-ink-300)' : 'var(--color-ink-400)'

  // Finished book reading record — echoes the CompletionBand at card scale
  const noteCount = book.status === 'finished' ? liveItems(book.notes).length : 0
  const daySpan   = book.status === 'finished' && book.firstOpenedAt && book.completedAt
    ? Math.max(1, Math.floor((new Date(book.completedAt) - new Date(book.firstOpenedAt)) / 86400000))
    : null

  const STATUS = { reading: 'On loan · reading', finished: 'Returned', want: 'On the shelf', paused: 'Set aside' }
  const status = STATUS[book.status] || 'On the shelf'
  const call = (book.author || '').split(' ').filter(Boolean).slice(-1)[0]?.slice(0, 3).toUpperCase() || '—'
  const large = hero || primary
  const muted = book.status !== 'reading' || daysSince > 90

  // Catalogue index card: call number and status, an accent rule, then the
  // book, then catalogue fields and a progress bar.
  return (
    <button
      onClick={onClick}
      className="w-full text-left group catalogue-card"
      data-status={book.status}
      style={{ display: 'block', position: 'relative', padding: large ? '16px 18px 18px' : '14px 16px 16px' }}
    >
      <div className="catalogue-card-head">
        <span className="catalogue-call">{call}{book.series ? ` · ${book.series.position}` : ''}</span>
        <span className="catalogue-label">{status}</span>
      </div>
      <div className="flex gap-4">
        <div className="flex-shrink-0 self-start" style={{ boxShadow: coverShadow, borderRadius: 4, opacity: muted ? coverOpacity : 1 }}>
          <BookCover
            book={book}
            className={large ? 'w-[72px] h-[108px]' : 'w-[56px] h-[84px]'}
            rounded="rounded-[4px]"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="catalogue-title line-clamp-2" style={{ fontSize: large ? 24 : 20 }}>{book.title}</h3>
          <p className="catalogue-by truncate" style={{ color: authorColor === "var(--color-ink-500)" ? "var(--color-ink-700)" : "var(--color-ink-500)" }}>{book.author}</p>
          {book.series && <p className="catalogue-label mt-1 truncate">{book.series.name} #{book.series.position}</p>}
          {rereadCount > 0 && <p className="catalogue-label mt-1">{ordinal(rereadCount + 1)} reading</p>}
        </div>
      </div>

      {book.status === 'finished' ? (
        <dl className="catalogue-fields">
          <div><dt>Closed</dt><dd>{fmtDate(book.completedAt || book.lastUpdated)}</dd></div>
          <div><dt>Notes</dt><dd>{noteCount}</dd></div>
          <div><dt>Days</dt><dd>{daySpan || '—'}</dd></div>
        </dl>
      ) : book.status === 'want' ? (
        <p className="catalogue-label" style={{ marginTop: 12, color: dateColor }}>Added {fmtDate(book.lastUpdated)}</p>
      ) : (
        <>
          <dl className="catalogue-fields">
            <div><dt>{book.format === 'audiobook' ? 'Part' : 'Chapter'}</dt><dd>{book.currentChapter} of {book.totalChapters}</dd></div>
            <div><dt>Read</dt><dd>{Math.round(pct)}%</dd></div>
            <div><dt>Last lit</dt><dd style={{ color: chapterColor === 'var(--color-ink-300)' ? 'var(--color-ink-700)' : undefined }}>{fmtDate(book.lastUpdated)}</dd></div>
          </dl>
          <ProgressBar value={pct} height={large ? 'h-[6px]' : 'h-[5px]'} accentVar />
        </>
      )}
    </button>
  )
}
