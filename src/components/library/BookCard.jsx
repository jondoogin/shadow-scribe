import BookCover from '../shared/BookCover.jsx'
import StatusBadge from '../shared/StatusBadge.jsx'
import ProgressBar from '../shared/ProgressBar.jsx'
import { getProgress } from '../../utils/progress.js'
import { fmtDate } from '../../utils/date.js'

export default function BookCard({ book, onClick }) {
  const pct = getProgress(book)
  return (
    <button
      onClick={onClick}
      className="card-lift w-full text-left bg-cream-50 rounded-2xl border border-ink-200 overflow-hidden group"
    >
      <div className="flex h-full">
        <BookCover book={book} className="w-[72px] h-full min-h-[108px] flex-shrink-0" rounded="rounded-none" />
        <div className="flex-1 min-w-0 p-4 flex flex-col justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif text-[13px] font-semibold text-ink-900 leading-snug line-clamp-2 group-hover:text-gold transition-colors">
              {book.title}
            </h3>
            <p className="text-[11px] text-ink-500 mt-1 truncate">{book.author}</p>
            {book.series && (
              <p className="text-[10px] text-ink-400 mt-0.5 truncate">{book.series.name} #{book.series.position}</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <StatusBadge status={book.status} />
              <span className="text-[11px] font-bold text-gold tabular-nums">{pct}%</span>
            </div>
            <ProgressBar value={pct} height="h-1" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-ink-400">
                {book.format === 'audiobook' ? 'Pt.' : 'Ch.'} {book.currentChapter}/{book.totalChapters}
              </span>
              <span className="text-[10px] text-ink-400">{fmtDate(book.lastUpdated)}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
