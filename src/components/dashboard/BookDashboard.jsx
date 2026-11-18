import { useState, useEffect, useRef, useMemo } from 'react'
import { useBooks }    from '../../context/BooksContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { liveItems }   from '../../utils/live.js'
import LanternMark     from '../shared/LanternMark.jsx'
import CompanionHeader from './CompanionHeader.jsx'
import CompanionBand    from './CompanionBand.jsx'
import CompletionBand  from './CompletionBand.jsx'
import ChapterUpdateModal from '../modals/ChapterUpdateModal.jsx'
import CharactersTab   from '../../tabs/CharactersTab.jsx'
import PlotTab         from '../../tabs/PlotTab.jsx'
import ProgressTab     from '../../tabs/ProgressTab.jsx'
import NotesTab        from '../../tabs/NotesTab.jsx'
import MysteriesTab    from '../../tabs/MysteriesTab.jsx'
import DiscussionTab   from '../../tabs/DiscussionTab.jsx'

const TABS = [
  { id: 'ask',        label: 'Ask'        },
  { id: 'notes',      label: 'Notes'      },
  { id: 'characters', label: 'People'     },
  { id: 'plot',       label: 'Plot'       },
  { id: 'questions',  label: 'Threads'    },
  { id: 'themes',     label: 'Themes'     },
  { id: 'progress',   label: 'Chronicle'  },
]

export default function BookDashboard({ bookId }) {
  const { books, updateBook } = useBooks()
  const { settings } = useSettings()
  const book = books.find(b => b.id === bookId)

  const [tab,           setTab]          = useState('ask')
  const [tabFlash,      setTabFlash]     = useState(null)
  const [flashItemId,   setFlashItemId]  = useState(null)
  const [showUpdate,    setShowUpdate]   = useState(false)
  const [justFinished,  setJustFinished] = useState(false)
  const tabRefs     = useRef({})
  const prevStatus  = useRef(book?.status)

  const handleTabChange = (tabId, itemId) => {
    setTab(tabId)
    setTabFlash(tabId)
    setFlashItemId(itemId ?? null)
    setTimeout(() => revealTab(tabId), 20)
    setTimeout(() => setTabFlash(null), 1400)
    setTimeout(() => setFlashItemId(null), 4200)
  }

  // Completion moment — detect the transition to finished, not just the finished state on mount
  useEffect(() => {
    if (prevStatus.current !== 'finished' && book?.status === 'finished') {
      setJustFinished(true)
      setTab('ask')
      const t = setTimeout(() => setJustFinished(false), 2600)
      return () => clearTimeout(t)
    }
    prevStatus.current = book?.status
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.status])

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

  // Scroll the active tab into view inside the tab strip only. scrollIntoView
  // also scrolled the window, so the page opened ~160px down with the title
  // hidden under the nav.
  const revealTab = (tabId) => {
    const el = tabRefs.current[tabId]
    const strip = el?.parentElement
    if (!el || !strip) return
    const left = el.offsetLeft - strip.offsetLeft
    const right = left + el.offsetWidth
    if (left < strip.scrollLeft) strip.scrollTo({ left, behavior: 'smooth' })
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: right - strip.clientWidth, behavior: 'smooth' })
  }
  useEffect(() => { revealTab(tab) }, [tab])

  // Tab content counts — surfaces when companion has populated a tab.
  // Placed before the `if (!book)` guard to satisfy Rules of Hooks.
  // Shows companion-extracted content (including veiled), so the reader
  // knows what's waiting even before they reach those chapters.
  const tabCounts = useMemo(() => {
    if (!book) return {}
    return {
      notes:      liveItems(book.notes).length,
      characters: (book.characters?.main?.length || 0) + (book.characters?.secondary?.length || 0),
      questions:  liveItems(book.mysteries).length,
      themes:     (book.discussionQuestions || []).length + (book.userDiscussionQuestions || []).length,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.notes, book?.mysteries, book?.characters?.main, book?.characters?.secondary, book?.discussionQuestions, book?.userDiscussionQuestions])

  if (!book) return null

  const onUpdateBook = changes => updateBook(bookId, changes)

  return (
    <div className="book-enter">

      {/* ── Full-width book header ── */}
      <CompanionHeader book={book} onOpenUpdate={() => setShowUpdate(true)} onUpdateBook={onUpdateBook} />

      {/* ── One card: tabs set into its top, the section below ── */}
      <div className="cat c2" style={{ paddingTop: 0 }}>
        <section className="c3-box" aria-label="Companion">
          <nav className="c3-tabs" aria-label="Sections">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                ref={el => { tabRefs.current[t.id] = el }}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`${tab === t.id ? 'is-on' : ''}${tabFlash === t.id ? ' tab-flash' : ''}`}
              >
                {t.id === 'ask' && book.status === 'finished' ? 'Record' : t.label}
                {(tabCounts[t.id] ?? 0) > 0 && <span className="c3-tab-n">{tabCounts[t.id]}</span>}
              </button>
            ))}
          </nav>
          <div key={tab} className="c2-sheet c2-sheet--app animate-tab-in min-w-0">
            {/* Ask: the companion itself. Finished books show the settled record. */}
            {tab === 'ask' && (book.status === 'finished'
              ? <CompletionBand key={book.id} book={book} />
              : <CompanionBand  key={book.id} book={book} onUpdateBook={onUpdateBook} onTabChange={handleTabChange} />)}
            {tab === 'notes'      && <NotesTab      book={book} onUpdateBook={onUpdateBook} />}
            {tab === 'characters' && <CharactersTab book={book} onUpdateBook={onUpdateBook} flashItemId={flashItemId} />}
            {tab === 'plot'       && <PlotTab       book={book} onUpdateBook={onUpdateBook} />}
            {tab === 'questions'  && <MysteriesTab  book={book} onUpdateBook={onUpdateBook} flashItemId={flashItemId} />}
            {tab === 'themes'     && <DiscussionTab book={book} onUpdateBook={onUpdateBook} />}
            {tab === 'progress'   && <ProgressTab   book={book} onUpdateBook={onUpdateBook} />}
          </div>
        </section>
      </div>

      {showUpdate && (
        <ChapterUpdateModal book={book} onClose={() => setShowUpdate(false)} onUpdateBook={onUpdateBook} />
      )}

      {/* ── Completion arrival veil — appears once when a book is marked finished ── */}
      {justFinished && (
        <div className="completion-veil">
          <div className="completion-veil-text">
            <p style={{
              fontFamily:    'var(--font-serif)',
              fontStyle:     'italic',
              fontSize:      'clamp(20px, 3vw, 28px)',
              color:         'var(--color-ink-600)',
              letterSpacing: '-0.01em',
              lineHeight:    1.4,
              marginBottom:  20,
            }}>
              The last page.
            </p>
            <span style={{
              display:       'block',
              fontSize:      11,
              opacity:       0.8,
            }}><LanternMark size={22} /></span>
          </div>
        </div>
      )}
    </div>
  )
}
