import { useState, useEffect, useRef } from 'react'
import { Ico } from '../shared/icons.jsx'
import ProgressBar from '../shared/ProgressBar.jsx'
import SectionLabel from '../shared/SectionLabel.jsx'

export default function ChapterUpdateModal({ book, onClose, onUpdateBook }) {
  const [input,  setInput]  = useState('')
  const [done,   setDone]   = useState(false)
  const [prevCh, setPrevCh] = useState(book.currentChapter)
  const [newCh,  setNewCh]  = useState(book.currentChapter)
  const ref = useRef()

  useEffect(() => { ref.current?.focus() }, [])

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const detect = text => {
    const m = text.match(/chapter\s+(\d+)|ch\.?\s*(\d+)|part\s+(\d+)|pt\.?\s*(\d+)|#(\d+)/i)
    return m ? parseInt(m[1]||m[2]||m[3]||m[4]||m[5]) : null
  }

  const handleUpdate = () => {
    const today = new Date().toISOString().split('T')[0]
    const n = Math.min(detect(input) || book.currentChapter + 1, book.totalChapters)
    setPrevCh(book.currentChapter)
    onUpdateBook({
      currentChapter: n,
      chapters: book.chapters.map(c => c.num <= n ? { ...c, completed: true } : c),
      lastUpdated: today,
      readingLog: [...new Set([...(book.readingLog || []), today])],
    })
    setNewCh(n); setDone(true)
  }

  const ch        = book.chapters.find(c => c.num === newCh)
  const pct       = Math.round((newCh / book.totalChapters) * 100)
  const openMyst  = book.mysteries.filter(m => !m.resolved)
  const allChars  = [...(book.characters?.main || []), ...(book.characters?.secondary || [])]
  const newlyMet  = allChars.filter(c => {
    const n = parseInt(c.lastSeen?.match(/\d+/)?.[0] || '0')
    return n > prevCh && n <= newCh
  })
  const newMyst   = book.mysteries.filter(m => m.chapter > prevCh && m.chapter <= newCh)
  const milestone = [25, 50, 75, 100].find(m => prevCh / book.totalChapters * 100 < m && pct >= m)
  const label     = book.format === 'audiobook' ? 'Part' : 'Chapter'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      data-mood={book.mood || 'gold'}
      style={{ background:'rgba(28,25,23,.45)', backdropFilter:'blur(6px)' }}>
      <div className="w-full max-w-lg bg-cream-50 rounded-2xl overflow-hidden animate-slide-up"
        style={{ boxShadow:'var(--shadow-modal)' }}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200">
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color:'var(--ca, #B8860B)' }}>✦</span>
            <p className="font-serif font-semibold text-ink-900">Where are you in the story?</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors p-0.5 rounded-lg hover:bg-ink-100">
            <Ico.X />
          </button>
        </div>

        <div className="px-6 py-5">
          {!done ? (
            <>
              <p className="text-[13px] text-ink-500 mb-4 italic">Just tell me — I'll take care of the rest.</p>
              <textarea ref={ref} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdate() } }}
                placeholder={`"Just finished ${label} ${book.currentChapter + 1}" · "Starting Part III"…`}
                rows={3}
                className="w-full border border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 placeholder-ink-400 bg-white resize-none transition-all mb-3"
              />
              <div className="flex gap-2 flex-wrap mb-5">
                {[1, 2, 3].map(off => {
                  const n = book.currentChapter + off
                  if (n > book.totalChapters) return null
                  return (
                    <button key={n} onClick={() => setInput(`Just finished ${label} ${n}`)}
                      className="text-[12px] px-3 py-1.5 rounded-full border border-ink-200 text-ink-600 transition-all bg-white hover:text-white"
                      onMouseEnter={e => { e.currentTarget.style.background='var(--ca, #B8860B)'; e.currentTarget.style.borderColor='var(--ca, #B8860B)'; e.currentTarget.style.color='white' }}
                      onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.borderColor=''; e.currentTarget.style.color='' }}>
                      → {label} {n}
                    </button>
                  )
                })}
              </div>
              <button onClick={handleUpdate}
                className="w-full py-3 text-white rounded-xl font-semibold text-sm transition-all"
                style={{ background:'var(--ca, #B8860B)' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '.88' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                Update companion ✦
              </button>
            </>
          ) : (
            <div className="animate-slide-up space-y-3">
              <div className="rounded-xl p-4 text-center border"
                style={{ background:'var(--ca-bg, #FDF8EC)', borderColor:'var(--ca-border, #E8D090)' }}>
                <p className="text-2xl mb-1">{milestone ? '✦' : '◆'}</p>
                <p className="font-serif font-semibold text-ink-900 mb-1">
                  {milestone ? `${milestone}% — a real milestone.` : `${label} ${newCh} — noted.`}
                </p>
                <p className="text-[12px] text-ink-500 mb-3">
                  {pct}% of the way through <em>{book.title}</em>
                </p>
                <ProgressBar value={pct} height="h-2.5" accentVar />
              </div>

              {newlyMet.length > 0 && (
                <div className="bg-cream-50 border border-ink-200 rounded-xl p-4">
                  <SectionLabel>Newly encountered</SectionLabel>
                  {newlyMet.map(c => (
                    <p key={c.id} className="text-[12px] text-ink-700 flex items-start gap-2 mb-1">
                      <span className="text-ink-400 mt-px flex-shrink-0">◦</span>
                      <span><strong className="font-semibold">{c.name}</strong> — {c.role}</span>
                    </p>
                  ))}
                </div>
              )}

              {ch?.summary && (
                <div className="bg-white border border-ink-200 rounded-xl p-4">
                  <SectionLabel>What just happened</SectionLabel>
                  <p className="text-[13px] text-ink-700 leading-relaxed">{ch.summary}</p>
                  {ch.reflection && (
                    <p className="text-[12px] text-ink-500 italic mt-2.5 pt-2.5 border-t border-ink-100">"{ch.reflection}"</p>
                  )}
                </div>
              )}

              {newMyst.length > 0 && (
                <div className="bg-ember-bg border border-ember-pale rounded-xl p-4">
                  <SectionLabel>Threads the story just opened</SectionLabel>
                  {newMyst.map(m => (
                    <p key={m.id} className="text-[12px] text-ink-700 flex items-start gap-2 mb-1.5">
                      <span className="text-ember flex-shrink-0 mt-px">◆</span>{m.text}
                    </p>
                  ))}
                </div>
              )}

              {newMyst.length === 0 && openMyst.length > 0 && (
                <div className="bg-ember-bg border border-ember-pale rounded-xl p-4">
                  <SectionLabel>Still unresolved</SectionLabel>
                  {openMyst.slice(0, 2).map(m => (
                    <p key={m.id} className="text-[12px] text-ink-700 flex items-start gap-2 mb-1.5">
                      <span className="text-ember flex-shrink-0 mt-px">◆</span>{m.text}
                    </p>
                  ))}
                </div>
              )}

              <button onClick={onClose}
                className="w-full py-3 bg-ink-900 text-white rounded-xl font-semibold text-sm hover:bg-ink-800 transition-all">
                Return to the companion ✦
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
