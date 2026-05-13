import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Ico } from '../shared/icons.jsx'
import EmptyState from '../shared/EmptyState.jsx'
import BookCard from './BookCard.jsx'
import { useBooks } from '../../context/BooksContext.jsx'
import { getProgress } from '../../utils/progress.js'

export default function Library() {
  const { books } = useBooks()
  const navigate = useNavigate()
  const [q,      setQ]      = useState('')
  const [filter, setFilter] = useState('all')
  const [sort,   setSort]   = useState('recent')

  const filterOpts = [
    { k:'all', l:'All' }, { k:'reading', l:'Reading' },
    { k:'finished', l:'Finished' }, { k:'paused', l:'Paused' },
  ]

  const matches = (b) =>
    !q || b.title.toLowerCase().includes(q.toLowerCase()) || b.author.toLowerCase().includes(q.toLowerCase())

  const sortFn = (a, b) => {
    if (sort === 'recent')   return new Date(b.lastUpdated) - new Date(a.lastUpdated)
    if (sort === 'title')    return a.title.localeCompare(b.title)
    if (sort === 'progress') return getProgress(b) - getProgress(a)
    return 0
  }

  // Active companions: filter by status + search + sort
  const filteredActive = books
    .filter(b => !b.archived)
    .filter(b => filter === 'all' || b.status === filter)
    .filter(matches)
    .sort(sortFn)

  // Archived companions: search-only (status filter does not apply), always sorted
  const filteredArchived = books
    .filter(b => b.archived)
    .filter(matches)
    .sort(sortFn)

  const hasAnyArchived = books.some(b => b.archived)
  const isEmpty = filteredActive.length === 0 && filteredArchived.length === 0

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
        {isEmpty ? (
          <EmptyState
            icon={<Ico.Book />}
            title={q ? "Nothing matches that search" : "Your shelf is waiting"}
            body={q ? `No companions found for "${q}". Try a different title or author.` : "Create your first companion and begin tracking the story alongside you."}
            action={!q ? (
              <Link to="/new" className="text-[13px] font-semibold transition-opacity hover:opacity-75" style={{ color:'var(--ca, #B8860B)' }}>
                Begin a companion →
              </Link>
            ) : undefined}
          />
        ) : (
          <>
            {/* ── Active companions ── */}
            {filteredActive.length > 0 && (
              <>
                <p className="text-[11px] text-ink-400 mb-4 font-medium">
                  {filteredActive.length} companion{filteredActive.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredActive.map(book => (
                    <BookCard key={book.id} book={book} onClick={() => navigate(`/book/${book.id}`)} />
                  ))}
                </div>
              </>
            )}

            {/* ── Archived companions ── */}
            {filteredArchived.length > 0 && (
              <div className={filteredActive.length > 0 ? 'mt-12 pt-8 border-t border-ink-100' : ''}>
                <p className="text-[11px] uppercase tracking-wider text-ink-300 mb-4 font-medium">
                  Archive · {filteredArchived.length}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredArchived.map(book => (
                    <div key={book.id} className="opacity-60 hover:opacity-90 transition-opacity duration-200">
                      <BookCard book={book} onClick={() => navigate(`/book/${book.id}`)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
