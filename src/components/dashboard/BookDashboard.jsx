import { useState, useEffect } from 'react'
import { useBooks } from '../../context/BooksContext.jsx'
import { Ico } from '../shared/icons.jsx'
import CompanionHeader from './CompanionHeader.jsx'
import CompanionInsights from './CompanionInsights.jsx'
import ChapterUpdateModal from '../modals/ChapterUpdateModal.jsx'
import ProgressTab from '../../tabs/ProgressTab.jsx'
import CharactersTab from '../../tabs/CharactersTab.jsx'
import PlotTab from '../../tabs/PlotTab.jsx'
import NotesTab from '../../tabs/NotesTab.jsx'
import MysteriesTab from '../../tabs/MysteriesTab.jsx'
import DiscussionTab from '../../tabs/DiscussionTab.jsx'

const TABS = [
  { id:'progress',   label:'Progress',   icon:<Ico.Chart />   },
  { id:'characters', label:'Characters', icon:<Ico.User />    },
  { id:'plot',       label:'Chronicle',  icon:<Ico.Book />    },
  { id:'notes',      label:'Notes',      icon:<Ico.Note />    },
  { id:'mysteries',  label:'Mysteries',  icon:<Ico.Mystery /> },
  { id:'discussion', label:'Discussion', icon:<Ico.Chat />    },
]

export default function BookDashboard({ bookId }) {
  const { books, updateBook } = useBooks()
  const book = books.find(b => b.id === bookId)

  const [tab,        setTab]        = useState('progress')
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => { window.scrollTo({ top: 0, behavior:'smooth' }) }, [tab])

  if (!book) return null

  const onUpdateBook = changes => updateBook(bookId, changes)

  return (
    <div data-mood={book.mood || 'gold'}>
      <CompanionHeader book={book} onOpenUpdate={() => setShowUpdate(true)} />
      <CompanionInsights book={book} />

      <div className="sticky-bar top-14">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 overflow-x-auto">
          <div className="flex min-w-max">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                style={tab === t.id ? { color:'var(--ca, #B8860B)', borderColor:'var(--ca, #B8860B)' } : {}}>
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main key={tab} className="max-w-4xl mx-auto px-5 sm:px-8 py-7 pb-16 animate-tab-in">
        {tab === 'progress'   && <ProgressTab   book={book} onUpdateBook={onUpdateBook} />}
        {tab === 'characters' && <CharactersTab book={book} onUpdateBook={onUpdateBook} />}
        {tab === 'plot'       && <PlotTab       book={book} onUpdateBook={onUpdateBook} />}
        {tab === 'notes'      && <NotesTab      book={book} onUpdateBook={onUpdateBook} />}
        {tab === 'mysteries'  && <MysteriesTab  book={book} onUpdateBook={onUpdateBook} />}
        {tab === 'discussion' && <DiscussionTab book={book} onUpdateBook={onUpdateBook} />}
      </main>

      {showUpdate && (
        <ChapterUpdateModal book={book} onClose={() => setShowUpdate(false)} onUpdateBook={onUpdateBook} />
      )}
    </div>
  )
}
