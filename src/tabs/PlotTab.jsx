import { useState } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import SectionHeading from '../components/shared/SectionHeading.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'

export default function PlotTab({ book, onUpdateBook }) {
  const [openNum, setOpenNum] = useState(book.currentChapter)
  const completed = book.chapters.filter(c => c.completed)

  const toggleImportant = num =>
    onUpdateBook({ chapters: book.chapters.map(c => c.num === num ? { ...c, important:!c.important } : c) })

  if (!completed.length) {
    return (
      <EmptyState
        icon={<Ico.Note />}
        title="The chronicle begins when you do"
        body="Mark chapters complete in the Progress tab — what you've read will gather here."
      />
    )
  }

  return (
    <div className="max-w-2xl space-y-2">
      {[...completed].reverse().map(ch => {
        const isOpen   = openNum === ch.num
        const isJustRead = ch.num === book.currentChapter
        const isRecent   = !isJustRead && ch.num >= book.currentChapter - 2
        return (
          <div key={ch.num}
            className={`rounded-xl border overflow-hidden transition-colors ${ch.important ? 'border-gold-border bg-gold-bg' : 'border-ink-200 bg-cream-50'}`}>
            <button className="w-full text-left px-4 py-3.5 flex items-center gap-3"
              onClick={() => setOpenNum(isOpen ? null : ch.num)}>
              <div className="w-8 h-8 rounded-full bg-cream border border-ink-200 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-medium text-ink-500 tabular-nums">{ch.num}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-medium text-ink-800 truncate">{ch.title}</p>
                  {isJustRead && <span className="text-[10px] border px-1.5 py-[2px] rounded-full flex-shrink-0" style={{ background:'var(--ca-bg, #FDF8EC)', color:'var(--ca, #B8860B)', borderColor:'var(--ca-border, #E8D090)' }}>Just read</span>}
                  {isRecent && <span className="text-[10px] bg-sage-bg text-sage border border-sage-pale px-1.5 py-[2px] rounded-full flex-shrink-0">Recent</span>}
                </div>
                {!isOpen && ch.summary && (
                  <p className="text-[12px] text-ink-400 truncate mt-0.5">{ch.summary.slice(0, 80)}…</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); toggleImportant(ch.num) }}
                  className={`transition-colors ${ch.important ? 'text-gold' : 'text-ink-300 hover:text-gold'}`}>
                  <Ico.Star f={ch.important} />
                </button>
                <span className={`text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}><Ico.Down /></span>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-5 pt-4 border-t border-ink-100 animate-fade-in">
                {ch.summary
                  ? <p className="text-[13px] text-ink-600 leading-relaxed">{ch.summary}</p>
                  : <p className="text-[13px] text-ink-400 italic">No summary yet.</p>
                }
                {ch.reflection && (
                  <div className="mt-4 pl-3 border-l-2" style={{ borderColor:'var(--ca-border, #E8D090)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 mb-1.5">Reflection</p>
                    <p className="text-[13px] text-ink-600 italic leading-relaxed">"{ch.reflection}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
