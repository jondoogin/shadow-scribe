import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Ico } from '../shared/icons.jsx'
import EmptyState from '../shared/EmptyState.jsx'
import BookCard from './BookCard.jsx'
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
          background: 'color-mix(in srgb, var(--color-gold-bg, #FDF8EC) 45%, var(--color-bg))',
          border: '1px solid color-mix(in srgb, var(--ca) 14%, transparent)',
        }}
      >
        <p className="font-serif italic text-[13px] mb-3" style={{ color: 'var(--color-ink-400)', opacity: 0.85 }}>
          <span style={{ fontSize: 8, color: 'var(--ca, #B8860B)', marginRight: 6 }}>✦</span>
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
            The example books below show what an annotated reading looks like. To begin your own, search for your book by title or author with the{' '}
            <Link to="/new" onClick={onDismiss} className="underline hover:opacity-80 transition-opacity" style={{ color: 'var(--color-ink-500)' }}>
              Add a book
            </Link>
            {' '}button above — no EPUB required.
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
          background: 'color-mix(in srgb, var(--color-gold-bg, #FDF8EC) 32%, var(--color-bg))',
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

// ── Library colophon — quiet reading summary at the bottom of the shelf ──────
// Only visible in grouped view when there are finished books.
// One line: N books closed · N notes · N days. Archival, not dashboard.
function LibraryColophon({ books }) {
  const finished = books.filter(b => !b.archived && b.status === 'finished')
  if (finished.length === 0) return null

  const totalNotes = books.reduce((sum, b) => sum + liveItems(b.notes).length, 0)
  const totalDays  = finished.reduce((sum, b) => {
    if (!b.firstOpenedAt || !b.completedAt) return sum
    return sum + Math.max(1, Math.floor((new Date(b.completedAt) - new Date(b.firstOpenedAt)) / 86400000))
  }, 0)

  const parts = [
    `${finished.length} ${finished.length === 1 ? 'book' : 'books'} closed`,
    totalNotes > 0 ? `${totalNotes} ${totalNotes === 1 ? 'note' : 'notes'} in the margins` : null,
    totalDays > 1  ? `${totalDays} days of reading`                                         : null,
  ].filter(Boolean)

  return (
    <div style={{ textAlign: 'center', paddingTop: 52, paddingBottom: 8, opacity: 0.40 }}>
      <span style={{ fontSize: 8, color: 'var(--color-ink-300)', marginRight: 9, verticalAlign: 'middle' }}>✦</span>
      <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--color-ink-400)', letterSpacing: '0.01em' }}>
        {parts.join(' · ')}
      </span>
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
          background: 'color-mix(in srgb, var(--color-gold-bg, #FDF8EC) 24%, var(--color-bg))',
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
          background: 'color-mix(in srgb, var(--color-gold-bg, #FDF8EC) 32%, var(--color-bg))',
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

// Annotation density → inhabited presence level ('' | 'inhabited' | 'deep')
// Presence is felt through annotation — sparse readers have no presence score
// regardless of how many sessions they've logged. Reading without annotation
// produces a self-sustaining pattern, not an inhabited companion surface.
function bookPresence(book) {
  const notes      = liveItems(book.notes).length
  const mysteries  = liveItems(book.mysteries).filter(m => !m.resolved).length
  // Minimum threshold — truly sparse annotation registers as absence
  if (notes + mysteries < 4) return ''
  const sessions   = (book.readingLog || []).length           // was: readingSessions (bug)
  const rereadBonus = (book.rereadCount || 0) > 0 ? 0.14 : 0 // rereads carry layered weight
  const score      = notes * 0.045 + mysteries * 0.09 + sessions * 0.018 + rereadBonus
  if (score >= 0.50) return 'deep'
  if (score >= 0.20) return 'inhabited'
  return ''
}

// Days since last update — used to weight temporal recency in the active zone
function daysSinceUpdate(book) {
  if (!book.lastUpdated) return 999
  return Math.floor((Date.now() - new Date(book.lastUpdated)) / 86400000)
}

// Deterministic positional drift — shelves settle organically over time.
// Each book has a stable ±3px vertical offset derived from its identity,
// not its grid position. The same book drifts the same amount regardless
// of sort order or session — it has found its place on the shelf.
function bookDrift(book) {
  let h = 5381
  for (const c of (book.id || '')) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0
  return (h % 7) - 3  // maps to −3, −2, −1, 0, 1, 2, 3 px
}

export default function Library() {
  const { books, updateBook } = useBooks()
  const { settings, updateSetting } = useSettings()
  const { status, isCloudEnabled } = useAuth()
  const navigate  = useNavigate()
  const [q,                 setQ]                = useState('')
  const [filter,            setFilter]           = useState('all')
  const [sort,              setSort]             = useState('recent')
  const [welcomed,          setWelcomed]         = useState(() => !!localStorage.getItem(WELCOMED_KEY))
  const [postSnapshotNudge, setPostSnapshotNudge] = useState(false)

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
  // Detect whether the user has added their own book (vs only seeded demos).
  // User-created books have IDs prefixed `book_` via uid('book_').
  const hasUserBook = useMemo(
    () => books.some(b => (b.id || '').startsWith('book_')),
    [books]
  )
  const invitationRecentlyDismissed = useMemo(() => {
    const at = settings.firstBookInvitationDismissedAt
    if (!at) return false
    return (Date.now() - new Date(at)) / 86400000 < 7
  }, [settings.firstBookInvitationDismissedAt])
  const showFirstBookInvitation =
    welcomed && !hasUserBook && !invitationRecentlyDismissed
  const deferInvitation = () =>
    updateSetting('firstBookInvitationDismissedAt', new Date().toISOString())

  const filterOpts = [
    { k: 'all',      l: 'All'       },
    { k: 'reading',  l: 'Reading'   },
    { k: 'finished', l: 'Finished'  },
    { k: 'paused',   l: 'set aside' },  // matches grouped section label
  ]

  const qLower = q.toLowerCase()
  const matches = b => {
    if (!q) return true
    if (b.title.toLowerCase().includes(qLower)) return true
    if (b.author.toLowerCase().includes(qLower)) return true
    if (q.length >= 3) {
      if (liveItems(b.notes).some(n => (n.text || '').toLowerCase().includes(qLower))) return true
      if (liveItems(b.mysteries).some(m => (m.text || '').toLowerCase().includes(qLower))) return true
      const chars = [...(b.characters?.main || []), ...(b.characters?.secondary || [])]
      if (chars.some(c => (c.name || '').toLowerCase().includes(qLower))) return true
      if (b.chapters?.some(c => (c.title || '').toLowerCase().includes(qLower) || (c.summary || '').toLowerCase().includes(qLower))) return true
    }
    return false
  }

  const sortFn = (a, b) => {
    if (sort === 'recent')   return new Date(b.lastUpdated) - new Date(a.lastUpdated)
    if (sort === 'title')    return a.title.localeCompare(b.title)
    if (sort === 'progress') return getProgress(b) - getProgress(a)
    return 0
  }

  const isFiltered = filter !== 'all' || !!q

  // Status-grouped sections — only when not filtered/searching
  const activeBooks   = useMemo(() => books.filter(b => !b.archived), [books])
  const archivedBooks = useMemo(() => books.filter(b =>  b.archived), [books])

  const readingNow = useMemo(
    () => activeBooks.filter(b => b.status === 'reading').filter(matches).sort(sortFn),
    [activeBooks, q, sort] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const setAside = useMemo(
    () => activeBooks.filter(b => b.status === 'paused' || b.status === 'want').filter(matches).sort(sortFn),
    [activeBooks, q, sort] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const finished = useMemo(
    () => activeBooks.filter(b => b.status === 'finished').filter(matches).sort(sortFn),
    [activeBooks, q, sort] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const archived = useMemo(
    () => archivedBooks.filter(matches).sort(sortFn),
    [archivedBooks, q, sort] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Shelf ecology — section-level dormancy ratio.
  // When more than half the set-aside books have been cooling for 45+ days,
  // the section label itself recedes further — the whole shelf exhales together.
  const setAsideDormantRatio = setAside.length > 0
    ? setAside.filter(b => daysSinceUpdate(b) > 45).length / setAside.length
    : 0
  const setAsideLabelOpacity = setAsideDormantRatio > 0.5 ? 0.38 : 0.52

  // Environmental weather — reading-now annotation mass.
  // Total weight of active reading activity across all currently-reading books.
  // Drives zone warmth: a heavily annotated active reading field runs warmer.
  const readingNowMass = useMemo(
    () => readingNow.reduce((total, b) => {
      const notes     = (b.notes     || []).length
      const mysteries = (b.mysteries || []).filter(m => !m.resolved).length
      const sessions  = (b.readingLog || []).length
      return total + (notes * 0.045 + mysteries * 0.09 + sessions * 0.018)
    }, 0),
    [readingNow]
  )
  // Zone warmth: 18–30% gold-bg mix, scaled continuously from annotation mass
  const zoneWarmthPct = Math.min(30, Math.max(18, Math.round(18 + readingNowMass * 1.5)))

  // Flat list for filtered/search views
  const filteredFlat = useMemo(
    () => activeBooks.filter(b => filter === 'all' || b.status === filter).filter(matches).sort(sortFn),
    [activeBooks, filter, q, sort] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const filteredArchived = useMemo(
    () => archivedBooks.filter(matches).sort(sortFn),
    [archivedBooks, q, sort] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const isEmpty = isFiltered
    ? filteredFlat.length === 0 && filteredArchived.length === 0
    : readingNow.length === 0 && setAside.length === 0 && finished.length === 0 && archived.length === 0

  return (
    <>
      {/* ── First-book invitation — surfaces once after welcome dismissed ── */}
      {showFirstBookInvitation && (
        <FirstBookInvitation
          onAddBook={deferInvitation}
          onDismiss={deferInvitation}
        />
      )}

      {/* ── Search + filter bar ── */}
      <div className="sticky-bar top-14">
        <div className="max-w-[1000px] mx-auto px-5 sm:px-10 py-3 space-y-2.5">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-ink-300)' }}>
              <Ico.Search />
            </span>
            <input
              type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search titles, authors, or notes…"
              className="w-full pl-8 pr-4 py-2 rounded-xl bg-cream-50/80 text-sm text-ink-800 placeholder-ink-300 transition-all"
              style={{ border: '1px solid var(--color-separator-soft)' }}
            />
          </div>
          <div className="flex items-center gap-4">
            {/* Text-link filter tabs — same register as tab bar */}
            <div className="flex items-center">
              {filterOpts.map((f, i) => (
                <span key={f.k} className="flex items-center">
                  {i > 0 && <span className="mx-2 select-none" style={{ color: 'var(--color-ink-100)', fontSize: 9 }}>·</span>}
                  <button
                    onClick={() => setFilter(f.k)}
                    className={`filter-link ${filter === f.k ? 'active' : ''}`}
                  >
                    {f.l}
                  </button>
                </span>
              ))}
            </div>
            {/* Sort — cycling text-link, no native select chrome */}
            <div className="ml-auto">
              <button
                onClick={() => setSort(s => {
                  const opts = ['recent', 'title', 'progress']
                  return opts[(opts.indexOf(s) + 1) % opts.length]
                })}
                className="italic transition-opacity hover:opacity-60"
                style={{ fontSize: 11, color: 'var(--color-ink-400)' }}
              >
                {sort === 'recent' ? 'recent' : sort === 'title' ? 'a–z' : 'furthest'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1000px] mx-auto px-5 sm:px-10 pt-10 pb-24">
        {isEmpty ? (
          <EmptyState
            icon={<Ico.Book />}
            title={q ? "Nothing matches that search" : "Your shelf is waiting"}
            body={q
              ? `No companions found for "${q}".`
              : "A companion gathers what you notice as you read — chapters covered, threads spotted, questions that linger — and holds them alongside the story."}
            action={!q ? (
              <Link to="/new" className="text-[13px] font-semibold transition-opacity hover:opacity-75" style={{ color: 'var(--ca, #B8860B)' }}>
                Begin your first companion →
              </Link>
            ) : undefined}
          />
        ) : isFiltered ? (
          // ── Flat view when filtered or searching ──
          <>
            {filteredFlat.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFlat.map(book => (
                  <BookCard key={book.id} book={book} onClick={() => navigate(`/book/${book.id}`)} presence={bookPresence(book)} />
                ))}
              </div>
            )}
            {filteredArchived.length > 0 && (
              <div className={filteredFlat.length > 0 ? 'mt-14 pt-8 border-t border-ink-100' : ''}>
                <p className="shelf-title">archive</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredArchived.map(book => (
                    <div key={book.id} className="shelf-archive">
                      <BookCard book={book} onClick={() => navigate(`/book/${book.id}`)} presence={bookPresence(book)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          // ── Grouped reading-room view — topographic rhythm ──
          <div>

            {/* Welcome banner — first-time user orientation, dismissed to localStorage */}
            {!welcomed && (
              <WelcomeBanner
                hasKey={true}
                onDismiss={dismissWelcome}
              />
            )}

            {/* Snapshot reminder — quiet nudge after meaningful accumulation */}
            {welcomed && showSnapshotReminder && (
              <SnapshotReminder
                books={books}
                onSave={saveSnapshot}
                onDismiss={deferSnapshot}
              />
            )}

            {/* Post-snapshot sign-up nudge — appears briefly after "later" while signed out */}
            {welcomed && postSnapshotNudge && !showSnapshotReminder && (
              <PostSnapshotNudge onDismiss={() => setPostSnapshotNudge(false)} />
            )}

            {/* Sign-up nudge — 10+ notes accumulated while signed out */}
            {showSignUpNudge && (
              <SignUpNudge
                totalNotes={totalLiveNotes}
                onDismiss={() => updateSetting('signUpNudgeDismissedAt', new Date().toISOString())}
              />
            )}

            {/* Library companion — one cross-book observation, surfaces when patterns emerge */}
            <LibraryCompanion books={books} />

            {/* Reading now — active gravity zone */}
            {readingNow.length > 0 && (
              <section
                className={`reading-now-zone${setAside.length + finished.length + archived.length > 0 ? ' topo-gap-active' : ''}`}
                style={{
                  // Zone warmth responds continuously to total annotation mass
                  background: `color-mix(in srgb, var(--color-gold-bg, #FDF8EC) ${zoneWarmthPct}%, var(--color-bg))`,
                  // Deeply accumulated zone: slightly more breathing room (vertical only — horizontal handled by CSS)
                  ...(readingNowMass >= 6 ? { paddingTop: 26, paddingBottom: 18 } : {}),
                }}
              >
                <p className="shelf-title"><span style={{ fontSize: 8, opacity: 0.55, marginRight: 5, verticalAlign: 'middle' }}>✦</span>reading now</p>
                {readingNow.length === 1 ? (
                  // Solo active book — full reading-zone width
                  <div>
                    <div className={`reading-hero-card${bookPresence(readingNow[0]) === 'deep' ? ' surface-inhabited-deep' : bookPresence(readingNow[0]) === 'inhabited' ? ' surface-inhabited' : ''}`}>
                      <BookCard book={readingNow[0]} onClick={() => navigate(`/book/${readingNow[0].id}`)} hero presence={bookPresence(readingNow[0])} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {readingNow.map((book, i) => {
                      const p = bookPresence(book)
                      const isPrimary = i === 0
                      return (
                        <div key={book.id}
                          className={`reading-hero-card${p === 'deep' ? ' surface-inhabited-deep' : p === 'inhabited' ? ' surface-inhabited' : ''}${isPrimary ? ' reading-hero-primary' : ''}`}>
                          <BookCard book={book} onClick={() => navigate(`/book/${book.id}`)} hero primary={isPrimary} presence={p} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Set aside — slightly contracted from active zone */}
            {setAside.length > 0 && (
              <section
                className={finished.length + archived.length > 0 ? 'topo-gap-dormant' : ''}
                style={{
                  // Dormant weather filter: mostly-cooling shelves become collectively more diffuse
                  ...(setAsideDormantRatio > 0.7 ? { filter: 'saturate(0.93)' } : {}),
                  // Dormant suspension: a mostly-cooling shelf floats slightly in its space
                  ...(setAsideDormantRatio > 0.5 ? { paddingTop: 6 } : {}),
                }}
              >
                {/* "set aside" label — recedes with the shelf; fades further when most books are dormant */}
                <p className="shelf-title" style={{ opacity: setAsideLabelOpacity }}>set aside</p>
                {/* Row gap > column gap: books within a row feel closer; rows breathe more.
                    Editorial vertical pacing rather than uniform grid cadence. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-[22px]">
                  {setAside.map((book, idx) => {
                    const p        = bookPresence(book)
                    const daysOld  = daysSinceUpdate(book)
                    // Temperature: how long a paused book has been cooling
                    const tempClass = daysOld > 90 ? ' shelf-silenced'
                                    : daysOld > 45 ? ' shelf-cooling'
                                    : ''
                    // Inhabited books lose their border — shadow is enough
                    const presenceClass = p === 'deep'     ? ' surface-inhabited-deep card-dissolved'
                                        : p === 'inhabited' ? ' surface-inhabited'
                                        : ''
                    // Residue field: inhabited books push space around themselves
                    const residuePb = p === 'deep' ? 10 : p === 'inhabited' ? 5 : 0
                    // Shelf ecology — neighbor awareness
                    // Deeply inhabited neighbors stabilize adjacent drift (the anchor steadies the shelf)
                    // Unannotated books near deep ones absorb faint environmental warmth
                    const prevBook = idx > 0 ? setAside[idx - 1] : null
                    const nextBook = idx < setAside.length - 1 ? setAside[idx + 1] : null
                    const neighborDeep = [prevBook, nextBook].some(b => b && bookPresence(b) === 'deep')
                    // Drift — presence-damped, neighbor-stabilized, cooling-settled
                    const baseDrift    = bookDrift(book)
                    const dampFactor   = p === 'deep' ? 0.25 : p === 'inhabited' ? 0.55 : 1
                    const neighborDamp = neighborDeep && p !== 'deep' ? 0.55 : 1
                    const settlingExtra = daysOld > 90 ? 2 : daysOld > 45 ? 1 : 0
                    const drift = Math.round(baseDrift * dampFactor * neighborDamp) + settlingExtra
                    // Warmth inheritance — unannotated books near deep ones carry a faint shared warmth
                    const neighborWarm = neighborDeep && p === ''
                    return (
                      <div key={book.id}
                        style={{
                          ...(residuePb ? { paddingBottom: residuePb } : {}),
                          transform: `translateY(${drift}px)`,
                          ...(neighborWarm ? { background: 'color-mix(in srgb, var(--color-accent) 3%, var(--color-card-base))' } : {}),
                        }}
                        className={`atmospheric-card${presenceClass}${tempClass}`}>
                        <BookCard book={book} onClick={() => navigate(`/book/${book.id}`)} presence={p} />
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Finished — settled, receding */}
            {finished.length > 0 && (
              <section className={archived.length > 0 ? 'topo-gap-dormant' : ''}>
                {/* Slight left indent — the label steps inward as reading history deepens */}
                <p className="shelf-title" style={{ opacity: 0.42, paddingLeft: 4 }}>finished</p>
                {/* Row gap > column gap: same editorial pacing as set-aside, slightly tighter overall */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-[18px]">
                  {finished.map((book, idx) => {
                    const p = bookPresence(book)
                    // Inhabited finished books carry warmth even in dormancy
                    const presenceClass = p === 'deep'     ? ' surface-inhabited-deep card-dissolved'
                                        : p === 'inhabited' ? ' surface-inhabited'
                                        : ''
                    // Shelf ecology — deep neighbors stabilize drift in the finished section too
                    const prevBook = idx > 0 ? finished[idx - 1] : null
                    const nextBook = idx < finished.length - 1 ? finished[idx + 1] : null
                    const neighborDeep = [prevBook, nextBook].some(b => b && bookPresence(b) === 'deep')
                    const drift = Math.round(bookDrift(book) * (neighborDeep && p !== 'deep' ? 0.55 : 1))
                    return (
                      <div key={book.id}
                        style={{ transform: `translateY(${drift}px)` }}
                        className={`shelf-dormant atmospheric-card${presenceClass}`}>
                        <BookCard book={book} onClick={() => navigate(`/book/${book.id}`)} presence={p} />
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Archive — most receded */}
            {archived.length > 0 && (
              <section className="topo-gap-archive" style={{ paddingTop: 16 }}>
                {/* Label steps furthest inward — the most settled section recedes both tonally and spatially */}
                <p className="shelf-title" style={{ opacity: 0.32, paddingLeft: 10 }}>archive</p>
                {/* Archive grid — bottom dissolution: books settle into the page rather than ending cleanly */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                  style={{
                    maskImage: 'linear-gradient(to bottom, black 62%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 62%, transparent 100%)',
                  }}>
                  {archived.map(book => (
                    <div key={book.id}
                      style={{ transform: `translateY(${bookDrift(book) + 1}px)` }}
                      className="shelf-archive atmospheric-card">
                      <BookCard book={book} onClick={() => navigate(`/book/${book.id}`)} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Colophon — quiet library summary at the bottom of a lived-in shelf */}
            <LibraryColophon books={books} />

          </div>
        )}
      </main>
    </>
  )
}
