import { useState } from 'react'
import { Ico } from '../shared/icons.jsx'
import EmptyState from '../shared/EmptyState.jsx'
import BookCard from './BookCard.jsx'
import { useBooks } from '../../context/BooksContext.jsx'
import { getProgress } from '../../utils/progress.js'

export default function Library({ onSelectBook }) {
  const { books } = useBooks()
  const [q,      setQ]      = useState('')
  const [filter, setFilter] = useState('all')
  const [sort,   setSort]   = useState('recent')

  const filterOpts = [
    { k:'all', l:'All' }, { k:'reading', l:'Reading' },
    { k:'finished', l:'Finished' }, { k:'paused', l:'Paused' },
  ]

  const filtered = books
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => !q || b.title.toLowerCase().includes(q.toLowerCase()) || b.author.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'recent')   return new Date(b.lastUpdated) - new Date(a.lastUpdated)
      if (sort === 'title')    return a.title.localeCompare(b.title)
      if (sort === 'progress') return getProgress(b) - getProgress(a)
      return 0
    })

  return (
    <>
      <div className="sticky-bar top-14">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-3 space-y-2.5">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"><Ico.Search /></span>
            <input
              type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search titles or authors…"
              className="w-full pl-8 pr-4 py-2 rounded-xl border border-ink-200 bg-white/80 text-sm text-ink-800 placeholder-ink-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterOpts.map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${
                  filter === f.k
                    ? 'bg-ink-900 text-white'
                    : 'bg-white text-ink-600 border border-ink-200 hover:border-ink-400 hover:text-ink-800'
                }`}>
                {f.l}
              </button>
            ))}
            <div className="ml-auto">
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="text-[12px] text-ink-600 border border-ink-200 rounded-lg px-2.5 py-1 bg-white cursor-pointer hover:border-ink-300 transition-colors">
                <option value="recent">Most recent</option>
                <option value="title">Title A–Z</option>
                <option value="progress">By progress</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-6 pb-16">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Ico.Book />}
            title={q ? "Nothing matches that search" : "Your shelf is waiting"}
            body={q ? `No companions found for "${q}". Try a different title or author.` : "Create your first companion and begin tracking the story alongside you."}
          />
        ) : (
          <>
            <p className="text-[11px] text-ink-400 mb-4 font-medium">
              {filtered.length} companion{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(book => (
                <BookCard key={book.id} book={book} onClick={() => onSelectBook(book.id)} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}
