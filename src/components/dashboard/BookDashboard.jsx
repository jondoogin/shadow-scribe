import { useState, useEffect, useRef } from 'react'
import { useBooks } from '../../context/BooksContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { Ico } from '../shared/icons.jsx'
import CompanionHeader from './CompanionHeader.jsx'
import PresenceStrip from './PresenceStrip.jsx'
import ChapterUpdateModal from '../modals/ChapterUpdateModal.jsx'
import ProgressTab from '../../tabs/ProgressTab.jsx'
import CharactersTab from '../../tabs/CharactersTab.jsx'
import PlotTab from '../../tabs/PlotTab.jsx'
import NotesTab from '../../tabs/NotesTab.jsx'
import MysteriesTab from '../../tabs/MysteriesTab.jsx'
import DiscussionTab from '../../tabs/DiscussionTab.jsx'

const TABS = [
  { id: 'progress',   label: 'Reading'    },
  { id: 'characters', label: 'Characters' },
  { id: 'plot',       label: 'Chronicle'  },
  { id: 'notes',      label: 'Notes'      },
  { id: 'mysteries',  label: 'Mysteries'  },
  { id: 'discussion', label: 'Wondering'  },
]

export default function BookDashboard({ bookId }) {
  const { books, updateBook } = useBooks()
  const { settings } = useSettings()
  const book = books.find(b => b.id === bookId)

  const [tab,        setTab]        = useState('progress')
  const [showUpdate, setShowUpdate] = useState(false)
  const tabRefs = useRef({})

  // Dynamic document title for book pages
  useEffect(() => {
    if (book?.title) document.title = `${book.title} — Lantern`
    return () => { document.title = 'Lantern — Library' }
  }, [book?.title])

  // Invisible observation layer — stamp first open time once, stored in book data.
  // Included in exports automatically. No new localStorage keys.
  useEffect(() => {
    if (!book.firstOpenedAt) {
      updateBook(bookId, { firstOpenedAt: new Date().toISOString() })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  // Scroll tab button into view but do NOT reset page scroll — tabs feel like document layers, not mode switches
  useEffect(() => {
    tabRefs.current[tab]?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }, [tab])

  if (!book) return null

  const onUpdateBook = changes => updateBook(bookId, changes)

  return (
    <div className="book-enter">

      {/* ── Full-width header ── */}
      <CompanionHeader book={book} onOpenUpdate={() => setShowUpdate(true)} onUpdateBook={onUpdateBook} />

      {/* ── Sticky zone: presence strip + tab bar ── */}
      <div className="sticky-bar top-14 mb-0">
        <PresenceStrip book={book} onUpdateBook={onUpdateBook} />
        <div className="overflow-x-auto tab-scroll-fade">
          <div className="flex min-w-max px-5 sm:px-10">
            {TABS.map(t => (
              <button
                key={t.id}
                ref={el => { tabRefs.current[t.id] = el }}
                onClick={() => setTab(t.id)}
                className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Full-width content ── */}
      <div className="max-w-[1000px] mx-auto px-5 sm:px-10 pt-9 pb-safe">
        <div key={tab} className="animate-tab-in">
          {tab === 'progress'   && <ProgressTab   book={book} onUpdateBook={onUpdateBook} onOpenUpdate={() => setShowUpdate(true)} settings={settings} />}
          {tab === 'characters' && <CharactersTab book={book} onUpdateBook={onUpdateBook} />}
          {tab === 'plot'       && <PlotTab       book={book} onUpdateBook={onUpdateBook} />}
          {tab === 'notes'      && <NotesTab      book={book} onUpdateBook={onUpdateBook} />}
          {tab === 'mysteries'  && <MysteriesTab  book={book} onUpdateBook={onUpdateBook} />}
          {tab === 'discussion' && <DiscussionTab book={book} onUpdateBook={onUpdateBook} />}
        </div>
      </div>

      {/* ── Mobile: sticky action bar ── */}
      {(book.status === 'reading' || book.status === 'paused') && !book.archived && (
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
