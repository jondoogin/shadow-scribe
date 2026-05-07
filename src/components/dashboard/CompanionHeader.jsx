import BookCover from '../shared/BookCover.jsx'
import StatusBadge from '../shared/StatusBadge.jsx'
import ProgressBar from '../shared/ProgressBar.jsx'
import ReadingMomentum from './ReadingMomentum.jsx'
import { Ico } from '../shared/icons.jsx'
import { getProgress } from '../../utils/progress.js'

export default function CompanionHeader({ book, onOpenUpdate }) {
  const pct = getProgress(book)
  return (
    <div className="bg-cream-50 border-b border-ink-200">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-6">
        <div className="flex gap-5 items-start">
          <div className="flex-shrink-0" style={{ boxShadow:'var(--shadow-panel)', borderRadius:12 }}>
            <BookCover book={book} className="w-[76px] h-[114px]" rounded="rounded-xl" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl font-bold text-ink-900 leading-tight mb-0.5 line-clamp-2">{book.title}</h1>
            <p className="text-[13px] text-ink-500 mb-3">{book.author}</p>

            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={book.status} />
              {book.series && (
                <span className="text-[11px] text-ink-400">{book.series.name} #{book.series.position}</span>
              )}
            </div>

            <div className="mt-4 space-y-2 max-w-sm">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-500">
                  {book.format === 'audiobook' ? 'Part' : 'Chapter'} {book.currentChapter} of {book.totalChapters}
                </span>
                <span className="font-bold tabular-nums" style={{ color:'var(--ca, #B8860B)' }}>{pct}%</span>
              </div>
              <ProgressBar value={pct} height="h-2" accentVar />
              {book.series?.total > 0 && (
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] text-ink-400 mb-1.5">
                    <span>Series progress</span>
                    <span>Book {book.series.position} of {book.series.total}</span>
                  </div>
                  <ProgressBar value={(book.series.position / book.series.total) * 100} color="sage" height="h-1" />
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={onOpenUpdate}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-semibold transition-all hover:text-white"
                style={{
                  color:'var(--ca, #B8860B)',
                  background:'var(--ca-bg, #FDF8EC)',
                  borderColor:'var(--ca-border, #E8D090)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='var(--ca, #B8860B)'; e.currentTarget.style.color='white' }}
                onMouseLeave={e => { e.currentTarget.style.background='var(--ca-bg, #FDF8EC)'; e.currentTarget.style.color='var(--ca, #B8860B)' }}
              >
                <Ico.Refresh /> Tell the companion where you are
              </button>
            </div>
            <ReadingMomentum book={book} />
          </div>
        </div>
      </div>
    </div>
  )
}
