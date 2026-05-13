import { useState, useEffect, useRef } from 'react'
import { Ico } from '../shared/icons.jsx'
import ProgressBar from '../shared/ProgressBar.jsx'
import SectionLabel from '../shared/SectionLabel.jsx'
import { getEffectiveMode, isMysteryVisible } from '../../utils/spoiler.js'
import { useSettings } from '../../context/SettingsContext.jsx'

const DURATION_CONFIG = [
  { k: 'brief',    l: 'A brief return'   },
  { k: 'steady',   l: 'A steady stretch' },
  { k: 'immersed', l: 'Pulled you in'    },
]

export default function ChapterUpdateModal({ book, onClose, onUpdateBook }) {
  const [input,            setInput]            = useState('')
  const [selectedChapter,  setSelectedChapter]  = useState(null)
  const [showAllChapters,  setShowAllChapters]  = useState(false)
  const [durationEstimate, setDurationEstimate] = useState(null)
  const [done,             setDone]             = useState(false)
  const [isFirst,          setIsFirst]          = useState(false)
  const [prevCh,           setPrevCh]           = useState(book.currentChapter)
  const [newCh,            setNewCh]            = useState(book.currentChapter)
  const inputRef       = useRef()
  const dialogRef      = useRef()
  const closeButtonRef = useRef()
  const { settings } = useSettings()
  const mode = getEffectiveMode(book, settings)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { if (done) closeButtonRef.current?.focus() }, [done])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const handleKey = e => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ))
      if (!focusable.length) return
      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      const outside = !dialog.contains(document.activeElement)
      if (e.shiftKey) {
        if (outside || document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (outside || document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const detect = text => {
    const m = text.match(/chapter\s+(\d+)|ch\.?\s*(\d+)|part\s+(\d+)|pt\.?\s*(\d+)|#(\d+)/i)
    return m ? parseInt(m[1]||m[2]||m[3]||m[4]||m[5]) : null
  }

  const resolveChapter = () => {
    // Chip selection takes precedence; freeform text is fallback
    if (selectedChapter != null) return selectedChapter
    return detect(input) ?? (book.currentChapter + 1)
  }

  const handleUpdate = () => {
    const today = new Date().toISOString().split('T')[0]
    const n = Math.min(resolveChapter(), book.totalChapters)
    const currentLog = book.readingLog || []
    const firstSession = currentLog.length === 0
    setPrevCh(book.currentChapter)
    setIsFirst(firstSession)

    const entry = {
      id: `s_${Date.now()}`,
      date: today,
      startChapter: book.currentChapter,
      endChapter: n,
      rereadEra: book.rereadCount || 0,
      ...(durationEstimate ? { durationEstimate } : {}),
    }

    onUpdateBook({
      currentChapter: n,
      chapters: book.chapters.map(c => c.num <= n ? { ...c, completed: true } : c),
      lastUpdated: today,
      readingLog: [...currentLog, entry],
    })
    setNewCh(n); setDone(true)
  }

  // All chapters after current (for expanded list)
  const remainingChapters = Array.from(
    { length: book.totalChapters - book.currentChapter },
    (_, i) => book.currentChapter + i + 1
  )
  const quickChips = remainingChapters.slice(0, 3)

  const ch        = book.chapters.find(c => c.num === newCh)
  const pct       = Math.round((newCh / book.totalChapters) * 100)
  const bookAtNew = { ...book, currentChapter: newCh }
  const revealAt  = c => c.revealChapter ?? parseInt(c.lastSeen?.match(/\d+/)?.[0] || '0')
  const allChars  = [...(book.characters?.main || []), ...(book.characters?.secondary || [])]
  const newlyMet  = allChars.filter(c => { const at = revealAt(c); return at > prevCh && at <= newCh })
  const openMyst  = book.mysteries.filter(m => !m.resolved && isMysteryVisible(bookAtNew, m, mode))
  const newMyst   = book.mysteries.filter(m => m.chapter > prevCh && m.chapter <= newCh && isMysteryVisible(bookAtNew, m, mode))
  const milestone = [25, 50, 75, 100].find(m => prevCh / book.totalChapters * 100 < m && pct >= m)
  const label     = book.format === 'audiobook' ? 'Part' : 'Chapter'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      data-mood={book.mood || 'gold'}
      style={{ background:'rgba(28,25,23,.45)', backdropFilter:'blur(6px)' }}>
      <div ref={dialogRef}
        role="dialog" aria-modal="true" aria-labelledby="chapter-update-title"
        className="w-full max-w-lg bg-cream-50 rounded-2xl overflow-hidden animate-slide-up modal-sheet flex flex-col"
        style={{ boxShadow:'var(--shadow-modal)', maxHeight:'90svh' }}>

        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-ink-200">
          <div className="flex items-center gap-2">
            <span className="font-bold" aria-hidden="true" style={{ color:'var(--ca, #B8860B)' }}>✦</span>
            <p id="chapter-update-title" className="font-serif font-semibold text-ink-900">Where have you reached?</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-ink-400 hover:text-ink-700 transition-colors p-0.5 rounded-lg hover:bg-ink-100">
            <Ico.X />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          {!done ? (
            <>
              <p className="text-[13px] text-ink-500 mb-4 italic">Just say where you are — the companion will keep the thread.</p>

              {/* Freeform textarea — not disturbed by chip selection */}
              <textarea ref={inputRef} value={input} onChange={e => { setInput(e.target.value); setSelectedChapter(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdate() } }}
                placeholder={`"Just finished ${label} ${book.currentChapter + 1}" · "Starting Part III"…`}
                rows={3}
                className="w-full border border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 placeholder-ink-400 bg-cream-50 resize-none transition-all mb-3"
              />

              {/* Quick chapter chips — set selectedChapter, preserve textarea text */}
              {quickChips.length > 0 && (
                <div className="mb-1">
                  <div className="flex gap-2 flex-wrap">
                    {quickChips.map(n => {
                      const isSelected = selectedChapter === n
                      return (
                        <button key={n}
                          onClick={() => setSelectedChapter(isSelected ? null : n)}
                          className="text-[12px] px-3 py-1.5 rounded-full border transition-all"
                          style={{
                            background:   isSelected ? 'var(--ca, #B8860B)' : '',
                            borderColor:  isSelected ? 'var(--ca, #B8860B)' : '',
                            color:        isSelected ? 'white'              : '',
                          }}
                          onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background='var(--ca, #B8860B)'; e.currentTarget.style.borderColor='var(--ca, #B8860B)'; e.currentTarget.style.color='white' }}}
                          onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background=''; e.currentTarget.style.borderColor=''; e.currentTarget.style.color='' }}}>
                          → {label} {n}
                        </button>
                      )
                    })}

                    {/* Show more chapters */}
                    {remainingChapters.length > 3 && (
                      <button
                        onClick={() => setShowAllChapters(v => !v)}
                        className="text-[12px] px-3 py-1.5 rounded-full border border-ink-200 text-ink-400 transition-all hover:bg-ink-100 hover:text-ink-600"
                      >
                        {showAllChapters ? 'less ↑' : `all ${remainingChapters.length} →`}
                      </button>
                    )}
                  </div>

                  {/* Expanded chapter list */}
                  {showAllChapters && (
                    <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-ink-100 bg-cream-50 animate-fade-in">
                      {remainingChapters.slice(3).map(n => {
                        const isSelected = selectedChapter === n
                        const chData = book.chapters.find(c => c.num === n)
                        return (
                          <button key={n}
                            onClick={() => { setSelectedChapter(isSelected ? null : n); setShowAllChapters(false) }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cream-200 border-b border-ink-100 last:border-0"
                            style={{ background: isSelected ? 'var(--ca-bg, #FDF8EC)' : '' }}
                          >
                            <span className="text-[11px] text-ink-400 flex-shrink-0 w-10">{label} {n}</span>
                            {chData?.title && (
                              <span className="text-[12px] text-ink-600 truncate">{chData.title}</span>
                            )}
                            {isSelected && <span className="ml-auto text-[10px]" style={{ color:'var(--ca, #B8860B)' }}>✦</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Selected chapter confirmation line */}
              {selectedChapter != null && (
                <p className="text-[12px] text-ink-400 italic mb-3 animate-fade-in">
                  Marking through {label} {selectedChapter}.
                </p>
              )}

              {/* Session character — optional, atmospheric */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {DURATION_CONFIG.map(d => (
                  <button key={d.k}
                    onClick={() => setDurationEstimate(v => v === d.k ? null : d.k)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                      durationEstimate === d.k
                        ? 'border-ink-400 text-ink-700 bg-ink-50'
                        : 'border-ink-100 text-ink-400 hover:border-ink-300 hover:text-ink-600'
                    }`}>
                    {d.l}
                  </button>
                ))}
              </div>

              <button onClick={handleUpdate}
                className="w-full py-3 text-white rounded-xl font-semibold text-sm transition-all mt-4"
                style={{ background:'var(--ca, #B8860B)' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '.88' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                Continue the story ✦
              </button>
            </>
          ) : (
            <div className="animate-fade-in space-y-3">
              <div className="rounded-xl p-5 text-center border"
                style={{ background:'var(--ca-bg, #FDF8EC)', borderColor:'var(--ca-border, #E8D090)' }}>
                <p className="text-base mb-2 opacity-70" style={{ color:'var(--ca, #B8860B)' }}>{milestone ? '✦' : '◆'}</p>
                <p className="font-serif text-[16px] font-semibold text-ink-900 mb-1">
                  {isFirst ? 'Your companion is awake.' : milestone ? `${milestone}% — a real milestone.` : `${label} ${newCh} — noted.`}
                </p>
                <p className="text-[13px] text-ink-500 mb-4">
                  {isFirst
                    ? `Beginning with ${label} ${newCh} of ${book.totalChapters}.`
                    : `${pct}% of the way through `}{!isFirst && <em>{book.title}</em>}
                </p>
                <ProgressBar value={pct} height="h-2.5" accentVar />
              </div>

              {newlyMet.length > 0 && (
                <div className="bg-cream-50 border border-ink-200 rounded-xl p-4">
                  <SectionLabel>Newly encountered</SectionLabel>
                  {newlyMet.map(c => (
                    <p key={c.id} className="text-[13px] text-ink-700 flex items-start gap-2 mb-1.5">
                      <span className="text-ink-300 mt-px flex-shrink-0">◦</span>
                      <span><strong className="font-medium">{c.name}</strong> <span className="text-ink-500">— {c.role}</span></span>
                    </p>
                  ))}
                </div>
              )}

              {ch?.summary && (
                <div className="bg-cream-50 border border-ink-200 rounded-xl p-4">
                  <SectionLabel>What just happened</SectionLabel>
                  <p className="text-[13px] text-ink-600 leading-relaxed">{ch.summary}</p>
                  {ch.reflection && (
                    <p className="text-[13px] text-ink-400 italic mt-3 pt-3 border-t border-ink-100">"{ch.reflection}"</p>
                  )}
                </div>
              )}

              {newMyst.length > 0 && (
                <div className="bg-ember-bg border border-ember-pale rounded-xl p-4">
                  <SectionLabel>Threads the story just opened</SectionLabel>
                  {newMyst.map(m => (
                    <p key={m.id} className="text-[13px] text-ink-600 flex items-start gap-2 mb-1.5">
                      <span className="text-ember opacity-70 flex-shrink-0 mt-px text-[10px]">◆</span>{m.text}
                    </p>
                  ))}
                </div>
              )}

              {newMyst.length === 0 && openMyst.length > 0 && (
                <div className="bg-ember-bg border border-ember-pale rounded-xl p-4">
                  <SectionLabel>Still unresolved</SectionLabel>
                  {openMyst.slice(0, 2).map(m => (
                    <p key={m.id} className="text-[13px] text-ink-600 flex items-start gap-2 mb-1.5">
                      <span className="text-ember opacity-70 flex-shrink-0 mt-px text-[10px]">◆</span>{m.text}
                    </p>
                  ))}
                </div>
              )}

              <button ref={closeButtonRef} onClick={onClose}
                className="w-full py-3 bg-ink-900 text-white rounded-xl font-semibold text-sm hover:bg-ink-800 transition-all">
                Return to the story ✦
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
