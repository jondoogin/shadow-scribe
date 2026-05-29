import { useState, useEffect, useRef } from 'react'
import { useBooks }    from '../../context/BooksContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { Ico }         from '../shared/icons.jsx'
import CompanionHeader from './CompanionHeader.jsx'
import CompanionBand   from './CompanionBand.jsx'
import ChapterUpdateModal from '../modals/ChapterUpdateModal.jsx'
import CharactersTab   from '../../tabs/CharactersTab.jsx'
import PlotTab         from '../../tabs/PlotTab.jsx'
import NotesTab        from '../../tabs/NotesTab.jsx'
import MysteriesTab    from '../../tabs/MysteriesTab.jsx'
import DiscussionTab   from '../../tabs/DiscussionTab.jsx'

// Progress tab content now lives in CompanionBand.
// Tab order: Notes first (most active), then accumulated record.
const TABS = [
  { id: 'notes',      label: 'Notes'      },
  { id: 'characters', label: 'Characters' },
  { id: 'plot',       label: 'Plot'       },
  { id: 'questions',  label: 'Questions'  },
  { id: 'themes',     label: 'Themes'     },
]

export default function BookDashboard({ bookId }) {
  const { books, updateBook } = useBooks()
  const { settings } = useSettings()
  const book = books.find(b => b.id === bookId)

  const [tab,           setTab]          = useState('notes')
  const [tabFlash,      setTabFlash]     = useState(null)
  const [showUpdate,    setShowUpdate]   = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const tabRefs   = useRef({})
  const headerRef = useRef(null)

  // Show sticky continue bar only after the header CTA scrolls out of view
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setHeaderVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const handleTabChange = (tabId) => {
    setTab(tabId)
    setTabFlash(tabId)
    setTimeout(() => {
      tabRefs.current[tabId]?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
    }, 20)
    setTimeout(() => setTabFlash(null), 1400)
  }

  // Dynamic document title
  useEffect(() => {
    if (book?.title) document.title = `${book.title} — Lantern`
    return () => { document.title = 'Lantern — Library' }
  }, [book?.title])

  // Stamp first open time
  useEffect(() => {
    if (!book.firstOpenedAt) {
      updateBook(bookId, { firstOpenedAt: new Date().toISOString() })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  // Scroll active tab into view
  useEffect(() => {
    tabRefs.current[tab]?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }, [tab])

  if (!book) return null

  const onUpdateBook = changes => updateBook(bookId, changes)

  return (
    <div className="book-enter">

      {/* ── Full-width book header ── */}
      <div ref={headerRef}>
        <CompanionHeader book={book} onOpenUpdate={() => setShowUpdate(true)} onUpdateBook={onUpdateBook} />
      </div>

      {/* ── Companion Band — full-width presence above the fold ── */}
      <CompanionBand book={book} onUpdateBook={onUpdateBook} onTabChange={handleTabChange} />

      {/* ── Tab bar — sticky below the band ── */}
      <div className="sticky-bar top-14 mt-5 mb-0">
        <div className="overflow-x-auto tab-scroll-fade">
          <div className="flex min-w-max px-5 sm:px-10 max-w-[1000px] mx-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                ref={el => { tabRefs.current[t.id] = el }}
                onClick={() => setTab(t.id)}
                className={`tab-btn ${tab === t.id ? 'active' : ''} ${tabFlash === t.id ? 'tab-flash' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content — single full-width column ── */}
      <div
        className="mx-auto px-5 sm:px-10 pt-9 pb-safe"
        style={{ maxWidth: 1000 }}
      >
        <div key={tab} className="animate-tab-in min-w-0">
          {tab === 'notes'      && <NotesTab      book={book} onUpdateBook={onUpdateBook} />}
          {tab === 'characters' && <CharactersTab book={book} onUpdateBook={onUpdateBook} />}
          {tab === 'plot'       && <PlotTab       book={book} onUpdateBook={onUpdateBook} />}
          {tab === 'questions'  && <MysteriesTab  book={book} onUpdateBook={onUpdateBook} />}
          {tab === 'themes'     && <DiscussionTab book={book} onUpdateBook={onUpdateBook} />}
        </div>
      </div>

      {/* ── Mobile: sticky action bar — only visible once header scrolls away ── */}
      {!headerVisible && (book.status === 'reading' || book.status === 'paused') && !book.archived && (
        <div className="sm:hidden sticky-bottom-bar">
          <button
            onClick={() => setShowUpdate(true)}
            className="w-full py-3 rounded-xl font-semibold text-sm btn-accent flex items-center justify-center gap-2"
          >
            <Ico.Refresh /> {book.currentChapter > 0 ? `Continue from chapter ${book.currentChapter}` : 'Log your first session'}
          </button>
        </div>
      )}

      {showUpdate && (
        <ChapterUpdateModal book={book} onClose={() => setShowUpdate(false)} onUpdateBook={onUpdateBook} />
      )}
    </div>
  )
}
