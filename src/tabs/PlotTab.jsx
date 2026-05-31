import { useState, useMemo } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import SectionHeading from '../components/shared/SectionHeading.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import { liveItems } from '../utils/live.js'

export default function PlotTab({ book, onUpdateBook }) {
  const [openNum, setOpenNum] = useState(book.currentChapter)
  const completed = book.chapters.filter(c => c.completed)

  // Notes indexed by chapter — gives each completed chapter its reading residue
  const notesByChapter = useMemo(() => {
    const counts = {}
    for (const note of liveItems(book.notes)) {
      if (note.chapter) counts[note.chapter] = (counts[note.chapter] || 0) + 1
    }
    return counts
  }, [book.notes])

  const toggleImportant = num =>
    onUpdateBook({ chapters: book.chapters.map(c => c.num === num ? { ...c, important:!c.important } : c) })

  if (!completed.length) {
    return (
      <EmptyState
        icon={<Ico.Note />}
        title="The chronicle begins when you do"
        body="What you've read will rest here — the shape of the reading as it accumulates."
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
            <button className={`w-full text-left px-4 flex items-center gap-3 ${isJustRead ? 'py-4' : isRecent ? 'py-3.5' : 'py-2.5'}`}
              onClick={() => setOpenNum(isOpen ? null : ch.num)}>
              <div className="w-8 h-8 rounded-full bg-cream border border-ink-200 flex items-center justify-center flex-shrink-0">
                <span
                  className="tabular-nums"
                  style={{
                    fontSize:   isJustRead ? 12 : 10,
                    fontWeight: isJustRead ? 500 : 400,
                    color: isJustRead ? 'var(--color-ink-500)' : 'var(--color-ink-300)',
                  }}
                >{ch.num}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className="truncate"
                    style={{
                      fontFamily: isJustRead ? 'var(--font-serif)' : 'var(--font-sans)',
                      fontSize:   isJustRead ? 16 : isRecent ? 14 : 12,
                      fontWeight: isJustRead ? 500 : isRecent ? 500 : 400,
                      color: isJustRead
                        ? 'var(--color-ink-900)'
                        : isRecent
                        ? 'var(--color-ink-700)'
                        : 'var(--color-ink-400)',
                    }}
                  >{ch.title}</p>
                  {isJustRead && <span className="text-[10px] border px-1.5 py-[2px] rounded-full flex-shrink-0" style={{ background:'var(--ca-bg, #FDF8EC)', color:'var(--ca, #B8860B)', borderColor:'var(--ca-border, #E8D090)' }}>Just read</span>}
                  {isRecent && <span className="text-[10px] px-1.5 py-[2px] rounded-full flex-shrink-0" style={{ background: 'var(--color-gold-bg)', color: 'var(--color-gold)', border: '1px solid var(--color-gold-pale)' }}>Recent</span>}
                </div>
                {!isOpen && ch.summary && (
                  <p
                    className="truncate mt-0.5"
                    style={{
                      fontSize: isJustRead || isRecent ? 12 : 11,
                      color: isJustRead || isRecent
                        ? 'var(--color-ink-400)'
                        : 'var(--color-ink-300)',
                    }}
                  >{ch.summary.slice(0, 80)}…</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {notesByChapter[ch.num] > 0 && (
                  <span className="text-[10px] text-ink-300 italic tabular-nums">
                    {notesByChapter[ch.num]}✎
                  </span>
                )}
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
                {notesByChapter[ch.num] > 0 && (
                  <p className="text-[11px] text-ink-300 italic mt-3">
                    {notesByChapter[ch.num] === 1
                      ? 'One thought written here.'
                      : `${notesByChapter[ch.num]} thoughts written here.`}
                  </p>
                )}
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
