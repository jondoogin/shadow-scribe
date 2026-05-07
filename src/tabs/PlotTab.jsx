import { useState } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import SectionHeading from '../components/shared/SectionHeading.jsx'
import SectionLabel from '../components/shared/SectionLabel.jsx'
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
        const isRecent = ch.num >= book.currentChapter - 2
        return (
          <div key={ch.num}
            className={`rounded-xl border overflow-hidden transition-colors ${ch.important ? 'border-gold-border bg-gold-bg' : 'border-ink-200 bg-cream-50'}`}>
            <button className="w-full text-left px-4 py-3.5 flex items-center gap-3"
              onClick={() => setOpenNum(isOpen ? null : ch.num)}>
              <div className="w-8 h-8 rounded-full bg-white border border-ink-200 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-ink-600 tabular-nums">{ch.num}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-ink-800 truncate">{ch.title}</p>
                  {isRecent && <span className="text-[10px] bg-sage-bg text-sage border border-sage-pale px-1.5 py-[2px] rounded-full flex-shrink-0">Recent</span>}
                </div>
                {!isOpen && ch.summary && (
                  <p className="text-[12px] text-ink-500 truncate mt-0.5">{ch.summary.slice(0, 80)}…</p>
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
              <div className="px-4 pb-4 pt-3 border-t border-ink-100 animate-fade-in">
                {ch.summary
                  ? <p className="text-[13px] text-ink-700 leading-relaxed mb-3">{ch.summary}</p>
                  : <p className="text-[13px] text-ink-400 italic mb-3">No summary yet.</p>
                }
                {ch.reflection && (
                  <div className="bg-gold-bg border border-gold-border rounded-xl p-3.5 mt-2">
                    <SectionLabel>Reflection</SectionLabel>
                    <p className="text-[13px] text-ink-700 italic">"{ch.reflection}"</p>
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
