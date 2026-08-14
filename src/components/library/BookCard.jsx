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

  // ── Interior atmosphere — each card carries its own environmental weight ──────
  // Presence and temporal state shape the internal rhythm of the card, not just
  // the wrapper. A deeply inhabited book breathes differently from an abandoned one.

  // Internal padding — hero/primary cards get extra room; default is compact
  const innerPad = (hero || primary) ? 'gap-4 p-5' : 'gap-4 p-4'

  // Author gap — deep books open slightly between title and author name
  const authorMt = presence === 'deep' ? 'mt-1' : 'mt-0.5'

  // Footer breathing — more room before progress/meta for inhabited books
  const footerMt = presence === 'deep'     ? 'mt-4'
    : presence === 'inhabited'             ? 'mt-3.5'
    :                                        'mt-3'

  // Chapter count color — warmer for active+deep reads, quieter for dormant ones
  const chapterColor = (book.status === 'reading' && presence === 'deep')
    ? 'var(--color-ink-500)'   // present, warm — this read is alive
    : daysSince > 45
    ? 'var(--color-ink-300)'   // cooling — the numbers recede with the book
    : 'var(--color-ink-400)'   // default

  // Progress bar height — heavier for inhabited active reads, thinner for dormant
  const progressHeight = ((presence === 'deep' || presence === 'inhabited') && book.status === 'reading')
    ? 'h-[3px]'      // inhabited active — visible weight
    : daysSince > 90
    ? 'h-px'         // very old — barely there
    : 'h-0.5'        // default — 2px

  // Chapter→progress bar gap — deep books breathe more, cooling books compress
  const progressMb = presence === 'deep' ? 'mb-2'
    : daysSince > 45             ? 'mb-1'
    :                              'mb-1.5'

  // Finished book reading record — echoes the CompletionBand at card scale
  const noteCount = book.status === 'finished' ? liveItems(book.notes).length : 0
  const daySpan   = book.status === 'finished' && book.firstOpenedAt && book.completedAt
    ? Math.max(1, Math.floor((new Date(book.completedAt) - new Date(book.firstOpenedAt)) / 86400000))
    : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
      style={{ display: 'block', position: 'relative' }}
    >
      {/* Ember left stripe — playground is-reading signature */}
      {book.status === 'reading' && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0, top: 18, bottom: 18,
            width: 2,
            background: 'var(--color-accent)',
            borderRadius: 2,
            boxShadow: '0 0 8px var(--color-glow)',
          }}
        />
      )}
      <div className={`flex ${innerPad}`}>

        {/* Cover */}
        <div
          className="flex-shrink-0 self-start"
          style={{
            boxShadow: coverShadow,
            borderRadius: 8,
            opacity: coverOpacity,
          }}
        >
          <BookCover
            book={book}
            className={(hero || primary) ? 'w-[84px] h-[126px]' : 'w-[68px] h-[102px]'}
            rounded="rounded-[8px]"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="min-w-0">
            {/* Title — inhabited books carry more typographic weight */}
            <h3
              className={`font-serif line-clamp-2 group-hover:text-gold transition-colors ${hero ? 'leading-normal' : 'leading-snug'}`}
              style={{
                fontSize: hero ? 17 : primary ? 16 : 15,
                fontWeight: 400,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {book.title}
            </h3>

            {/* Author — recedes with temporal distance; breathes more under deep presence */}
            <p
              className={`font-serif italic ${authorMt} truncate transition-colors`}
              style={{ fontSize: (hero || primary) ? 13 : 12, color: authorColor }}
            >
              {book.author}
            </p>

            {/* Series */}
            {book.series && (
              <p
                className="mt-0.5 truncate"
                style={{ fontSize: 11, color: 'var(--color-ink-400)', fontFamily: 'var(--font-sans)' }}
              >
                {book.series.name} #{book.series.position}
              </p>
            )}

            {/* Re-read */}
            {rereadCount > 0 && (
              <p
                className="italic mt-0.5"
                style={{ fontSize: 11, color: 'var(--color-ink-300)', fontFamily: 'var(--font-serif)' }}
              >
                {ordinal(rereadCount + 1)} reading
              </p>
            )}
          </div>

          {/* Footer — presence and status shape the footer register */}
          <div className={footerMt}>
            {book.status === 'finished' ? (
              /* Finished — archival footer with reading record echo */
              <div style={{ marginTop: 4 }}>
                <p className="italic" style={{ fontSize: 12, fontFamily: 'var(--font-serif)', color: 'var(--color-ink-400)' }}>
                  closed {fmtDate(book.completedAt || book.lastUpdated)}
                </p>
                {(noteCount > 0 || (daySpan && daySpan > 1)) && (
                  <div className="flex items-center gap-3 mt-1">
                    {noteCount > 0 && (
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-sans)', color: 'var(--color-ink-300)' }}>
                        {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                      </span>
                    )}
                    {daySpan && daySpan > 1 && (
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-sans)', color: 'var(--color-ink-300)' }}>
                        {daySpan} days
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : book.status === 'want' ? (
              /* Want — no chapter yet; just the date quietly */
              <p className="transition-colors" style={{ fontSize: 10, fontFamily: 'var(--font-sans)', color: dateColor }}>
                {fmtDate(book.lastUpdated)}
              </p>
            ) : (
              <>
                {/* Chapter + date — merged into one quiet line; no percentage text */}
                <div className={`flex items-center justify-between ${progressMb}`}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-sans)', color: chapterColor }}>
                    {book.format === 'audiobook' ? 'pt.' : 'ch.'} {book.currentChapter} of {book.totalChapters}
                  </span>
                  <span className="transition-colors" style={{ fontSize: 10, fontFamily: 'var(--font-sans)', color: dateColor }}>
                    {fmtDate(book.lastUpdated)}
                  </span>
                </div>

                {/* Progress bar — weight varies by inhabited depth and temporal state */}
                <ProgressBar value={pct} height={progressHeight} accentVar />

                {/* Return pull — surfaces the gap at library level for away 5+ days */}
                {book.status === 'reading' && daysSince >= 5 && (
                  <p className="font-serif italic" style={{ fontSize: 10, color: 'var(--color-ink-300)', marginTop: 4, opacity: 0.75 }}>
                    away {daysSince >= 14 ? `${Math.round(daysSince / 7)} week${Math.round(daysSince / 7) !== 1 ? 's' : ''}` : `${daysSince} days`}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
