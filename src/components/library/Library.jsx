import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Ico } from '../shared/icons.jsx'
import EmptyState from '../shared/EmptyState.jsx'
import LanternMark from '../shared/LanternMark.jsx'
import BookCover from '../shared/BookCover.jsx'
import { usePlayback } from '../../context/PlaybackContext.jsx'
import { fmtDate } from '../../utils/date.js'
import { callNumber, statusLabel, unitWord, Holes, Field, Tabs, LitLabel, Mark } from '../../catalogue/parts.jsx'
import LibraryCompanion from './LibraryCompanion.jsx'
import FirstBookInvitation from './FirstBookInvitation.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useBooks } from '../../context/BooksContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getProgress } from '../../utils/progress.js'
import { downloadLibrarySnapshot } from '../../utils/storage.js'
import { liveItems } from '../../utils/live.js'
import { fetchCoverUrl } from '../../utils/coverLookup.js'

// Tracks which book IDs have already had a cover lookup attempted this session.
// Module-level so it survives Library re-renders; resets on page refresh.
const _coverLookupAttempted = new Set()

const WELCOMED_KEY = 'lantern_welcomed'

// ── First-time welcome — appears once, dismissed to localStorage ──────────────
// Literary, brief, atmospheric. Explains what Lantern is and why the API key matters.
// Renders only in grouped view (not filtered/search) to give context for the demo books.
function WelcomeBanner({ hasKey, onDismiss }) {
  return (
    <div className="mb-10 animate-fade-in" role="region" aria-label="Welcome to Lantern">
      <div
        className="p-6 rounded-2xl"
        style={{
          background: 'color-mix(in srgb, var(--color-gold-bg, #FDF8EC) 45%, var(--color-cream, #FAF6EE))',
          border: '1px solid color-mix(in srgb, var(--ca) 14%, transparent)',
        }}
      >
        <p className="font-serif italic text-[13px] mb-3" style={{ color: 'var(--color-ink-400)', opacity: 0.85 }}>
          <LanternMark size={12} className="inline-block align-[-1px] mr-1.5" />
          welcome
        </p>
        <p className="font-serif text-[16px] leading-relaxed mb-3" style={{ color: 'var(--color-ink-800)' }}>
          Lantern sits alongside you as you read.
        </p>
        <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--color-ink-500)', lineHeight: 1.7 }}>
          Not a tracker. Not a to-do list. A personal space that accumulates what you notice — chapters covered, questions that linger, theories that later collapse — and holds the texture of your reading long after the book is closed.
        </p>
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--color-ink-500)', lineHeight: 1.7 }}>
          The companion is quiet by design. It notices patterns — recurring words, interpretive shifts, emotional weather — and occasionally surfaces them without being asked. It speaks rarely, and only when something specific has earned being said.
        </p>
        {!hasKey ? (
          <p className="text-[12px] leading-relaxed mb-5 italic" style={{ color: 'var(--color-ink-400)', lineHeight: 1.7 }}>
            The companion responds through an{' '}
            <Link to="/settings" onClick={onDismiss} className="underline hover:opacity-80 transition-opacity" style={{ color: 'var(--color-ink-500)' }}>
              Anthropic API key
            </Link>
            {' '}— your key and all your reading data are stored locally and never leave this device. Without one, notes and chapter tracking still work; the companion simply stays quiet. The sample companions below show what a reading looks like once it's lived-in.
          </p>
        ) : (
          <p className="text-[12px] leading-relaxed mb-5 italic" style={{ color: 'var(--color-ink-400)', lineHeight: 1.7 }}>
            The example books below show what an annotated reading looks like. To begin your own, import an EPUB or add a book manually with the{' '}
            <Link to="/new" onClick={onDismiss} className="underline hover:opacity-80 transition-opacity" style={{ color: 'var(--color-ink-500)' }}>
              Add a book
            </Link>
            {' '}button above.
          </p>
        )}
        <div className="flex items-center gap-5">
          <button
            onClick={onDismiss}
            className="text-[12px] font-medium italic transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-ink-600)' }}
          >
            Continue to library →
          </button>
          {!hasKey && (
            <Link
              to="/settings"
              onClick={onDismiss}
              className="text-[12px] font-semibold transition-opacity hover:opacity-75"
              style={{ color: 'var(--ca, #B8860B)' }}
            >
              Add API key →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Snapshot reminder — quiet nudge to back up the library ────────────────────
// Surfaces when meaningful new content has accumulated since the last export.
// Logic:
//   • Never exported AND totalNotes ≥ 8           → show
//   • Exported AND (totalNotes − lastCount) ≥ 10  → show
//   • Suppressed for 7 days after dismissal
function shouldShowSnapshotReminder(books, settings) {
  const dismissedAt = settings.snapshotReminderDismissedAt
  if (dismissedAt) {
    const daysSince = (Date.now() - new Date(dismissedAt)) / 86400000
    if (daysSince < 7) return false
  }
  const totalNotes = books.reduce((sum, b) => sum + (b.notes?.length || 0), 0)
  if (!settings.lastExportedAt) return totalNotes >= 8
  const lastCount = settings.lastExportedNoteCount || 0
  return (totalNotes - lastCount) >= 10
}

function SnapshotReminder({ books, onSave, onDismiss }) {
  const totalNotes = books.reduce((sum, b) => sum + (b.notes?.length || 0), 0)
  return (
    <div className="mb-8 animate-fade-in" role="region" aria-label="Backup reminder">
      <div
        className="px-5 py-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
        style={{
          background: 'color-mix(in srgb, var(--color-gold-bg, #FDF8EC) 32%, var(--color-cream, #FAF6EE))',
          border: '1px solid color-mix(in srgb, var(--ca) 10%, transparent)',
        }}
      >
        <p className="italic flex-1" style={{ fontSize: 12, color: 'var(--color-ink-600)', lineHeight: 1.55 }}>
          Your library has grown — <span style={{ fontStyle: 'normal' }}>{totalNotes}</span> note{totalNotes !== 1 ? 's' : ''} now kept here. Save a snapshot somewhere safe.
        </p>
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            onClick={onDismiss}
            className="italic transition-colors hover:text-ink-500"
            style={{ fontSize: 11, color: 'var(--color-ink-300)' }}
          >
            later
          </button>
          <button
            onClick={onSave}
            className="font-medium transition-opacity hover:opacity-75"
            style={{ fontSize: 12, color: 'var(--ca, #B8860B)' }}
          >
            Save snapshot →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post-snapshot sign-up nudge — appears briefly after "later" (signed-out) ──
function PostSnapshotNudge({ onDismiss }) {
  const navigate = useNavigate()
  return (
    <div className="mb-8 animate-fade-in" role="region" aria-label="Sign in nudge">
      <div
        className="px-5 py-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
        style={{
          background: 'color-mix(in srgb, var(--color-gold-bg, #FDF8EC) 24%, var(--color-cream, #FAF6EE))',
          border: '1px solid color-mix(in srgb, var(--ca) 8%, transparent)',
        }}
      >
        <p className="italic flex-1" style={{ fontSize: 12, color: 'var(--color-ink-500)', lineHeight: 1.55 }}>
          A snapshot keeps a local copy. A free account keeps your library safe everywhere.
        </p>
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            onClick={onDismiss}
            className="italic transition-colors hover:text-ink-500"
            style={{ fontSize: 11, color: 'var(--color-ink-300)' }}
          >
            later
          </button>
          <button
            onClick={() => navigate('/signin')}
            className="font-medium transition-opacity hover:opacity-75"
            style={{ fontSize: 12, color: 'var(--ca, #B8860B)' }}
          >
            Sign in →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 10+ notes sign-up nudge ───────────────────────────────────────────────────
// Logic:
//   • Only when signed out and cloud is configured
//   • Only when ≥ 10 total notes across all books
//   • Suppressed for 14 days after dismissal
//   • Does not stack with snapshot reminder or post-snapshot nudge
function shouldShowSignUpNudge(books, settings, status) {
  if (status !== 'signed-out') return false
  const dismissedAt = settings.signUpNudgeDismissedAt
  if (dismissedAt) {
    const daysSince = (Date.now() - new Date(dismissedAt)) / 86400000
    if (daysSince < 14) return false
  }
  const totalNotes = books.reduce((sum, b) => sum + (b.notes?.length || 0), 0)
  return totalNotes >= 10
}

function SignUpNudge({ totalNotes, onDismiss }) {
  const navigate = useNavigate()
  return (
    <div className="mb-8 animate-fade-in" role="region" aria-label="Sign in nudge">
      <div
        className="px-5 py-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
        style={{
          background: 'color-mix(in srgb, var(--color-gold-bg, #FDF8EC) 32%, var(--color-cream, #FAF6EE))',
          border: '1px solid color-mix(in srgb, var(--ca) 10%, transparent)',
        }}
      >
        <p className="italic flex-1" style={{ fontSize: 12, color: 'var(--color-ink-600)', lineHeight: 1.55 }}>
          <span style={{ fontStyle: 'normal' }}>{totalNotes}</span> note{totalNotes !== 1 ? 's' : ''} kept here, only on this device. Sign in to sync your library automatically.
        </p>
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            onClick={onDismiss}
            className="italic transition-colors hover:text-ink-500"
            style={{ fontSize: 11, color: 'var(--color-ink-300)' }}
          >
            later
          </button>
          <button
            onClick={() => navigate('/signin')}
            className="font-medium transition-opacity hover:opacity-75"
            style={{ fontSize: 12, color: 'var(--ca, #B8860B)' }}
          >
            Sign in →
          </button>
        </div>
      </div>
    </div>
  )
}

// Chapters marked in the last seven days, for the drawer's footnote.
function chaptersThisWeek(books) {
  const since = Date.now() - 7 * 86400000
  let chapters = 0
  const lit = new Set()
  for (const b of books) {
    for (const s of b.readingLog || []) {
      if (!s.date || new Date(s.date).getTime() < since) continue
      chapters += Math.max(0, (s.endChapter || 0) - (s.startChapter || 0))
      lit.add(b.id)
    }
  }
  return { chapters, books: lit.size }
}

const FILTERS = [
  ['all', 'All'], ['reading', 'On loan'], ['paused', 'Set aside'], ['finished', 'Returned'], ['want', 'Shelf'], ['archived', 'Archive'],
]
const SORTS = { recent: 'Recent', title: 'A–Z', progress: 'Furthest' }
const ROW_STATUS = { finished: 'Returned', want: 'Shelf', paused: 'Aside' }

export default function Library() {
  const { books, updateBook } = useBooks()
  const { settings, updateSetting } = useSettings()
  const { status, isCloudEnabled } = useAuth()
  const { session, playerState } = usePlayback()
  const navigate  = useNavigate()
  const [q,                 setQ]                = useState('')
  const [filter,            setFilter]           = useState('all')
  const [sort,              setSort]             = useState('recent')
  const [heroId,            setHeroId]           = useState(null)
  const [welcomed,          setWelcomed]         = useState(() => !!localStorage.getItem(WELCOMED_KEY))
  const [postSnapshotNudge, setPostSnapshotNudge] = useState(false)
  const heroRef = useRef(null)

  const dismissWelcome = () => {
    localStorage.setItem(WELCOMED_KEY, '1')
    setWelcomed(true)
  }

  // ── Background cover refresh ─────────────────────────────────────────────
  // For existing books that have no embedded cover and no stored coverUrl,
  // fire Google Books lookups quietly — max 5 per session, staggered 500ms apart.
  // The module-level Set prevents duplicate requests across re-renders.
  useEffect(() => {
    const candidates = books
      .filter(b => !b.coverData && !b.coverUrl && !_coverLookupAttempted.has(b.id))
      .slice(0, 5)
    candidates.forEach((book, idx) => {
      _coverLookupAttempted.add(book.id)
      setTimeout(() => {
        fetchCoverUrl(book.title, book.author, book.isbn)
          .then(url => { if (url) updateBook(book.id, { coverUrl: url }) })
      }, idx * 500)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books.length])

  // ── Snapshot reminder ────────────────────────────────────────────────────
  const showSnapshotReminder = shouldShowSnapshotReminder(books, settings)
  const saveSnapshot = () => {
    const { noteCount } = downloadLibrarySnapshot(books)
    updateSetting('lastExportedAt', new Date().toISOString())
    updateSetting('lastExportedNoteCount', noteCount)
    updateSetting('snapshotReminderDismissedAt', null)
  }
  const deferSnapshot = () => {
    updateSetting('snapshotReminderDismissedAt', new Date().toISOString())
    if (isCloudEnabled && status === 'signed-out') setPostSnapshotNudge(true)
  }

  // ── Sign-up nudge ────────────────────────────────────────────────────────
  const totalLiveNotes = books.reduce((sum, b) => sum + liveItems(b.notes).length, 0)
  const showSignUpNudge = isCloudEnabled && welcomed
    && shouldShowSignUpNudge(books, settings, status)
    && !showSnapshotReminder && !postSnapshotNudge

  // ── First-book invitation ────────────────────────────────────────────────
  // User-created books have IDs prefixed `book_` via uid('book_').
  const hasUserBook = useMemo(() => books.some(b => (b.id || '').startsWith('book_')), [books])
  const invitationRecentlyDismissed = useMemo(() => {
    const at = settings.firstBookInvitationDismissedAt
    if (!at) return false
    return (Date.now() - new Date(at)) / 86400000 < 7
  }, [settings.firstBookInvitationDismissedAt])
  const showFirstBookInvitation = welcomed && !hasUserBook && !invitationRecentlyDismissed
  const deferInvitation = () => updateSetting('firstBookInvitationDismissedAt', new Date().toISOString())

  // ── The drawer: every card, filtered by tab and search ───────────────────
  const sorted = useMemo(() => {
    const byRecent = (a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0)
    const fn = sort === 'title' ? (a, b) => a.title.localeCompare(b.title)
      : sort === 'progress' ? (a, b) => getProgress(b) - getProgress(a)
      : byRecent
    return [...books].sort(fn)
  }, [books, sort])

  const inFilter = (b, f) => f === 'archived' ? !!b.archived
    : f === 'all' ? !b.archived
    : !b.archived && b.status === f
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([f]) => [f, books.filter(b => inFilter(b, f)).length])), [books])
  const qLower = q.trim().toLowerCase()
  const list = sorted.filter(b => inFilter(b, filter))
    .filter(b => !qLower || b.title.toLowerCase().includes(qLower) || (b.author || '').toLowerCase().includes(qLower))
  const tabs = FILTERS.filter(([f]) => f === 'all' || counts[f] > 0)

  // ── The card pulled from the drawer ──────────────────────────────────────
  // Whatever is playing first, then the reader's pick, then the most recent
  // book on loan, then anything not archived.
  const playingId = session?.book?.id
  const lit = !!playingId && playerState?.status === 'playing'
  const byRecent = [...books].sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))
  const hero = books.find(b => b.id === heroId)
    || (playingId && books.find(b => b.id === playingId))
    || byRecent.find(b => !b.archived && b.status === 'reading')
    || byRecent.find(b => !b.archived && b.status === 'paused')
    || byRecent.find(b => !b.archived)
    || null

  const pick = (id) => {
    setHeroId(id)
    requestAnimationFrame(() => heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  const week = chaptersThisWeek(books)
  const hasBooks = books.length > 0

  return (
    <>
      {showFirstBookInvitation && (
        <FirstBookInvitation onAddBook={deferInvitation} onDismiss={deferInvitation} />
      )}

      <main className="cat c2">
        {!hasBooks ? (
          <EmptyState
            icon={<Ico.Book />}
            title="Your drawer is empty"
            body="A companion gathers what you notice as you read — chapters covered, threads spotted, questions that linger — and holds them alongside the story."
            action={
              <Link to="/new" className="c2-btn c2-btn--primary" style={{ padding: '0 22px' }}>Add your first book</Link>
            }
          />
        ) : (
          <>
            {!welcomed && (
              <div className="c2-notice"><WelcomeBanner hasKey={true} onDismiss={dismissWelcome} /></div>
            )}
            {welcomed && showSnapshotReminder && (
              <div className="c2-notice"><SnapshotReminder books={books} onSave={saveSnapshot} onDismiss={deferSnapshot} /></div>
            )}
            {welcomed && postSnapshotNudge && !showSnapshotReminder && (
              <div className="c2-notice"><PostSnapshotNudge onDismiss={() => setPostSnapshotNudge(false)} /></div>
            )}
            {showSignUpNudge && (
              <div className="c2-notice">
                <SignUpNudge totalNotes={totalLiveNotes} onDismiss={() => updateSetting('signUpNudgeDismissedAt', new Date().toISOString())} />
              </div>
            )}

            {hero && (
              <>
                <p className="c2-label" style={{ marginTop: 18 }}>{hero.status === 'reading' && !hero.archived ? 'Now reading' : 'Pulled from the drawer'}</p>
                <div className="c2-stack" ref={heroRef}>
                  <HeroCard key={hero.id} book={hero} lit={lit && hero.id === playingId} onGo={(path) => navigate(path)} />
                </div>
              </>
            )}

            <LibraryCompanion books={books} />

            <section className="c3-box" aria-label="Your drawer">
              <header className="c3-box-head">
                <h2>Your drawer</h2>
                <button type="button" className="c3-sort" onClick={() => setSort(s => {
                  const keys = Object.keys(SORTS)
                  return keys[(keys.indexOf(s) + 1) % keys.length]
                })} aria-label={`Sort: ${SORTS[sort]}. Change sort`}>
                  {SORTS[sort]} ↕
                </button>
              </header>
              <div className="c3-search">
                <Ico.Search />
                <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search titles or authors" aria-label="Search your drawer" />
              </div>
              <Tabs label="Filter" items={tabs} value={filter} onChange={setFilter} counts={filter === 'all' ? null : undefined} />
              {list.length === 0 ? (
                <p className="c2-drawer-empty">{q ? `No cards match “${q}”.` : 'No cards here yet.'}</p>
              ) : (
                <ol className="c2-drawer">
                  {list.map(b => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className={`c2-row${hero && b.id === hero.id ? ' is-on' : ''}${b.archived ? ' c2-row--archived' : ''}`}
                        onClick={() => pick(b.id)}
                        aria-current={hero && b.id === hero.id ? 'true' : undefined}
                      >
                        <span className="c2-call">{callNumber(b)}</span>
                        <span className="c2-row-t"><b>{b.title}</b><span>{b.author}</span></span>
                        <span className="c2-row-s">
                          {b.id === playingId && lit ? <Mark size={14} live />
                            : b.archived ? 'Archive'
                            : ROW_STATUS[b.status] || `${Math.round(getProgress(b))}%`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <div style={{ padding: '6px 16px 16px' }}>
                <Link to="/new" className="c2-btn" style={{ width: '100%' }}>+ Add a book</Link>
              </div>
            </section>

            <p className="c2-fine">
              {week.chapters > 0
                ? `Lit ${week.chapters} ${week.chapters === 1 ? 'chapter' : 'chapters'} across ${week.books} ${week.books === 1 ? 'book' : 'books'} this week.`
                : `${books.length} ${books.length === 1 ? 'card' : 'cards'} in the drawer. ${totalLiveNotes} ${totalLiveNotes === 1 ? 'note' : 'notes'} kept.`}
            </p>
          </>
        )}
      </main>
    </>
  )
}

// The index card pulled up from the drawer.
function HeroCard({ book, lit, onGo }) {
  const pct = getProgress(book)
  const finished = book.status === 'finished'
  const notes = liveItems(book.notes).length
  const days = finished && book.firstOpenedAt && book.completedAt
    ? Math.max(1, Math.floor((new Date(book.completedAt) - new Date(book.firstOpenedAt)) / 86400000))
    : null
  const companion = `/book/${book.id}`
  const resume = lit ? `${companion}/listen` : book.contentId ? `${companion}/read` : companion
  const resumeLabel = lit ? 'Listening' : finished ? 'Open the record' : book.contentId ? 'Resume' : book.status === 'want' ? 'Begin' : 'Open companion'
  return (
    <article className="c2-card c2-card--hero">
      <div className="c2-card-head">
        <span className="c2-call">{callNumber(book)}{book.series ? ` · ${book.series.position}` : ''}</span>
        <LitLabel lit={lit} label="Lit · listening">{statusLabel(book)}</LitLabel>
      </div>
      <div className="c2-card-book">
        <div>
          <h1 className="c2-title">{book.title}</h1>
          <p className="c2-by">{book.author}</p>
        </div>
        <div className="c2-card-cover"><BookCover book={book} className="w-[56px] h-[84px]" rounded="rounded-[4px]" /></div>
      </div>
      {finished ? (
        <dl className="c2-fields">
          <Field k="Closed" v={fmtDate(book.completedAt || book.lastUpdated)} />
          <Field k="Notes" v={notes} />
          <Field k="Days" v={days || '—'} />
        </dl>
      ) : (
        <dl className="c2-fields">
          <Field k={unitWord(book)} v={`${book.currentChapter || 0} of ${book.totalChapters || '—'}`} />
          <Field k="Read" v={`${Math.round(pct)}%`} />
          <Field k="Last lit" v={book.lastUpdated ? fmtDate(book.lastUpdated) : '—'} />
        </dl>
      )}
      <Holes pct={finished ? 100 : pct} />
      <div className="c2-actions">
        <button type="button" className="c2-btn c2-btn--primary" onClick={() => onGo(resume)}>
          {!finished && resume !== companion && <Ico.Play />} {resumeLabel}
        </button>
        {resume === companion
          ? <button type="button" className="c2-btn" onClick={() => onGo(`${companion}/listen`)}><Ico.Headphones /> Listen</button>
          : <button type="button" className="c2-btn" onClick={() => onGo(companion)}>Companion</button>}
      </div>
    </article>
  )
}
