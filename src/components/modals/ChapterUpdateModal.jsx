import { useState, useEffect, useRef } from 'react'
import { uid } from '../../utils/uid.js'
import { track } from '../../utils/analytics.js'
import { Ico } from '../shared/icons.jsx'
import ProgressBar from '../shared/ProgressBar.jsx'
import { getEffectiveMode, isMysteryVisible } from '../../utils/spoiler.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { logDates } from '../../utils/date.js'
import {
  pickCompletionReflection,
  pickReturnReflection,
  markReflectionSurfaced,
} from '../../utils/reflectionEngine.js'

// ── Dry literary observation ─────────────────────────────────────────────────
// One quiet, observant line beneath the progress bar.
// Not congratulations. Not encouragement. Just a literary fact.
function getDryObservation({ isFirst, pct, chaptersRead, gapDays, milestone }) {
  if (isFirst)            return "It begins."
  if (gapDays >= 21)      return "The story waited. It holds."
  if (gapDays >= 7)       return "You came back."
  if (milestone === 25)   return "A quarter of the way in. The story is still deciding what it's about."
  if (milestone === 50)   return "Halfway. The compass has turned."
  if (milestone === 75)   return "Three-quarters. The exits are beginning to close."
  if (milestone === 100)  return "You've read it all now."
  if (pct >= 90)          return "The last pages always remember the first."
  if (chaptersRead >= 6)  return "A long stretch. The story has moved."
  if (chaptersRead >= 3)  return "A good reading."
  if (chaptersRead === 2) return "Two chapters further in."
  if (chaptersRead === 1) return "One chapter carried."
  return "Noted."
}

export default function ChapterUpdateModal({ book, onClose, onUpdateBook }) {
  const label    = book.format === 'audiobook' ? 'Part' : 'Chapter'
  const { settings } = useSettings()
  const mode     = getEffectiveMode(book, settings)

  // ── Form state ─────────────────────────────────────────────────────────────
  const defaultChapter = Math.min(book.currentChapter + 1, book.totalChapters)
  const [selectedChapter, setSelectedChapter] = useState(defaultChapter)
  const [sessionNote,     setSessionNote]     = useState('')

  // ── Post-update state ──────────────────────────────────────────────────────
  const [done,                 setDone]                 = useState(false)
  const [visibleCards,         setVisibleCards]         = useState(0)
  const [isFirst,              setIsFirst]              = useState(false)
  const [prevCh,               setPrevCh]               = useState(book.currentChapter)
  const [newCh,                setNewCh]                = useState(book.currentChapter)
  const [completionReflection, setCompletionReflection] = useState(null)
  const [gapOnEntry,           setGapOnEntry]           = useState(null)
  const [observationText,      setObservationText]      = useState('')

  const dialogRef      = useRef()
  const closeButtonRef = useRef()

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Focus trap
  useEffect(() => {
    const handleKey = e => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll(
        'button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
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

  // Focus close button when done
  useEffect(() => { if (done) closeButtonRef.current?.focus() }, [done])

  // Staggered card emergence — each card surfaces after a quiet delay
  useEffect(() => {
    if (!done) { setVisibleCards(0); return }
    const timers = [
      setTimeout(() => setVisibleCards(1), 180),
      setTimeout(() => setVisibleCards(2), 820),
      setTimeout(() => setVisibleCards(3), 1480),
      setTimeout(() => setVisibleCards(4), 2100),
    ]
    return () => timers.forEach(clearTimeout)
  }, [done])

  const handleUpdate = () => {
    const today = new Date().toISOString().split('T')[0]
    const n = Math.min(selectedChapter, book.totalChapters)
    const currentLog = book.readingLog || []
    const firstSession = currentLog.length === 0
    setPrevCh(book.currentChapter)
    setIsFirst(firstSession)

    if (firstSession) track('first_session', { format: book.format })
    const dates    = logDates(currentLog)
    const lastDate = [...dates].sort().pop() ?? null
    const gap = lastDate
      ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86_400_000)
      : null
    setGapOnEntry(gap)

    const reflection = (gap !== null && gap >= 7)
      ? pickReturnReflection(book)
      : pickCompletionReflection(book)
    setCompletionReflection(reflection)

    const progressBefore = book.totalChapters
      ? Math.round((book.currentChapter / book.totalChapters) * 100) : 0
    const progressAfter = book.totalChapters
      ? Math.round((n / book.totalChapters) * 100) : 0
    const milestone = [25, 50, 75, 100].find(
      m => book.currentChapter / book.totalChapters * 100 < m && progressAfter >= m
    )

    const chaptersRead = n - book.currentChapter

    setObservationText(getDryObservation({
      isFirst: firstSession,
      pct: progressAfter,
      chaptersRead,
      gapDays: gap ?? 0,
      milestone,
    }))

    const entry = {
      id: uid('s_'),
      date: today,
      startChapter: book.currentChapter,
      endChapter: n,
      chaptersRead,
      progressBefore,
      progressAfter,
      gapDays: gap,
      isReturnSession: gap !== null && gap >= 7,
      isFinishSession: progressAfter >= 99,
      noteCount: (book.notes || []).length,
      rereadEra: book.rereadCount || 0,
      ...(sessionNote.trim() ? { sessionReflection: sessionNote.trim() } : {}),
    }

    const reflectionCacheUpdate = (reflection && book.reflectionCache?.reflections)
      ? {
          reflectionCache: {
            ...book.reflectionCache,
            reflections: markReflectionSurfaced(book.reflectionCache.reflections, reflection.id),
          },
        }
      : {}

    const newLog = [...currentLog, entry].slice(-50)

    onUpdateBook({
      currentChapter: n,
      chapters: book.chapters.map(c => c.num <= n ? { ...c, completed: true } : c),
      lastUpdated: today,
      readingLog: newLog,
      ...reflectionCacheUpdate,
    })
    setNewCh(n)
    setDone(true)
  }

  // ── Computed values for done state ─────────────────────────────────────────
  const pct      = Math.round((newCh / book.totalChapters) * 100)
  const bookAtNew = { ...book, currentChapter: newCh }
  const revealAt  = c => c.revealChapter ?? parseInt(c.lastSeen?.match(/\d+/)?.[0] || '0')
  const allChars  = [...(book.characters?.main || []), ...(book.characters?.secondary || [])]
  const newlyMet  = allChars.filter(c => { const at = revealAt(c); return at > prevCh && at <= newCh })
  const openMyst  = book.mysteries.filter(m => !m.resolved && isMysteryVisible(bookAtNew, m, mode))
  const newMyst   = book.mysteries.filter(m => m.chapter > prevCh && m.chapter <= newCh && isMysteryVisible(bookAtNew, m, mode))
  const ch        = book.chapters.find(c => c.num === newCh)
  const chaptersRead = newCh - prevCh
  const hasReflection = completionReflection && (
    chaptersRead >= 2 ||
    [25, 50, 75, 100].some(m => prevCh / book.totalChapters * 100 < m && pct >= m) ||
    pct >= 90 ||
    (gapOnEntry !== null && gapOnEntry >= 7)
  )

  // Chapter options for dropdown
  const remainingChapters = Array.from(
    { length: book.totalChapters - book.currentChapter },
    (_, i) => book.currentChapter + i + 1
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 modal-backdrop"
      style={{ background: 'rgba(28,25,23,.45)', backdropFilter: 'blur(6px)' }}
    >
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-labelledby="chapter-update-title"
        className="w-full max-w-lg bg-cream-50 rounded-2xl overflow-hidden modal-soft modal-sheet flex flex-col"
        style={{ boxShadow: 'var(--shadow-modal)', maxHeight: '90svh' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <span className="font-serif italic" style={{ fontSize: 14, color: 'var(--color-ink-600)' }}>
            {done ? book.title : 'Where have you reached?'}
          </span>
          <button onClick={onClose} aria-label="Close"
            className="text-ink-300 hover:text-ink-600 transition-colors p-0.5 rounded-lg">
            <Ico.X />
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto">
          {!done ? (
            /* ── Form ─────────────────────────────────────────────────────── */
            <div>
              {/* Chapter dropdown — or graceful end-state if all chapters read */}
              <div className="mb-5">
                {remainingChapters.length === 0 ? (
                  <p className="italic" style={{ fontSize: 13, color: 'var(--color-ink-400)', padding: '20px 0', lineHeight: 1.7 }}>
                    All chapters have been read.
                  </p>
                ) : (
                  <>
                    <label
                      htmlFor="chapter-select"
                      className="block italic mb-2"
                      style={{ fontSize: 12, color: 'var(--color-ink-400)' }}
                    >
                      Which {label.toLowerCase()} did you just finish?
                    </label>
                    <select
                      id="chapter-select"
                      value={selectedChapter}
                      onChange={e => setSelectedChapter(parseInt(e.target.value))}
                      className="w-full rounded-xl px-4 py-2.5 border border-ink-200 bg-cream-50 transition-colors"
                      style={{ fontSize: 14, color: 'var(--color-ink-800)', outline: 'none' }}
                    >
                      {remainingChapters.map(n => {
                        const chData = book.chapters.find(c => c.num === n)
                        return (
                          <option key={n} value={n}>
                            {label} {n}{chData?.title ? ` — ${chData.title}` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </>
                )}
              </div>

              {/* Expressive textarea */}
              <div className="mb-6">
                <label
                  htmlFor="session-note"
                  className="block italic mb-2"
                  style={{ fontSize: 12, color: 'var(--color-ink-400)' }}
                >
                  How did it feel?
                </label>
                <textarea
                  id="session-note"
                  value={sessionNote}
                  onChange={e => setSessionNote(e.target.value)}
                  placeholder="What surprised you, unsettled you, or is staying with you…"
                  rows={5}
                  className="w-full resize-none outline-none placeholder-ink-300 leading-relaxed"
                  style={{
                    fontSize: 14,
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    lineHeight: 1.75,
                    color: 'var(--color-ink-800)',
                    background: 'transparent',
                    borderBottom: '1px solid var(--color-ink-100)',
                    paddingBottom: 10,
                  }}
                />
              </div>

              {/* Outlined editorial CTA — restrained, not SaaS */}
              {remainingChapters.length > 0 && (
                <button
                  onClick={handleUpdate}
                  className="w-full transition-all"
                  style={{
                    fontFamily:    'var(--font-serif)',
                    fontSize:      15,
                    fontWeight:    400,
                    letterSpacing: '-0.01em',
                    color:         'var(--color-ink-700)',
                    padding:       '11px',
                    border:        '1px solid var(--color-ink-200)',
                    borderRadius:  10,
                    background:    'transparent',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-ink-400)'; e.currentTarget.style.color = 'var(--color-ink-900)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-ink-200)'; e.currentTarget.style.color = 'var(--color-ink-700)' }}
                >
                  Continue →
                </button>
              )}
            </div>
          ) : (
            /* ── Done state — staggered emergence ──────────────────────────── */
            <div className="space-y-4">

              {/* Card 1 — progress bar + dry observation */}
              {visibleCards >= 1 && (
                <div className="card-surface" style={{ paddingBottom: 8 }}>
                  <div className="flex items-baseline gap-3 mb-3">
                    <span style={{
                      fontSize: 40, fontWeight: 300, fontFamily: 'var(--font-serif)',
                      color: 'var(--ca, #B8860B)', letterSpacing: '-0.04em', lineHeight: 1,
                    }}>
                      {pct}
                    </span>
                    <span className="italic" style={{ fontSize: 15, color: 'var(--color-ink-400)', fontWeight: 300 }}>%</span>
                    <span style={{ fontSize: 12, color: 'var(--color-ink-300)' }}>
                      — {label} {newCh} of {book.totalChapters}
                    </span>
                  </div>
                  <ProgressBar value={pct} height="h-px" accentVar />
                  <p className="italic mt-3" style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>
                    {observationText}
                  </p>
                </div>
              )}

              {/* Card 2 — newly encountered characters */}
              {visibleCards >= 2 && newlyMet.length > 0 && (
                <div
                  className="rounded-xl p-4 card-surface"
                  style={{
                    background: 'var(--color-card-base)',
                    border: '1px solid rgba(28,20,16,.06)',
                    animationDelay: '40ms',
                  }}
                >
                  <p className="italic mb-3" style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
                    newly encountered
                  </p>
                  {newlyMet.map(c => (
                    <p key={c.id} className="flex items-start gap-2 mb-1.5"
                      style={{ fontSize: 13, color: 'var(--color-ink-700)' }}>
                      <span style={{ color: 'var(--color-ink-300)', marginTop: 2, flexShrink: 0 }}>◦</span>
                      <span>
                        <strong style={{ fontWeight: 500 }}>{c.name}</strong>
                        <span style={{ color: 'var(--color-ink-500)' }}> — {c.role}</span>
                      </span>
                    </p>
                  ))}
                </div>
              )}

              {/* Card 3 — chapter summary */}
              {visibleCards >= 3 && ch?.summary && (
                <div
                  className="rounded-xl p-4 card-surface"
                  style={{
                    background: 'var(--color-card-base)',
                    border: '1px solid rgba(28,20,16,.06)',
                    animationDelay: '40ms',
                  }}
                >
                  <p className="italic mb-3" style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
                    what just happened
                  </p>
                  <p className="leading-relaxed" style={{ fontSize: 13, color: 'var(--color-ink-600)' }}>
                    {ch.summary}
                  </p>
                  {ch.reflection && (
                    <p className="italic mt-3 pt-3 border-t border-ink-100"
                      style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>
                      "{ch.reflection}"
                    </p>
                  )}
                </div>
              )}

              {/* Card 4 — threads (no red — these are the richest region) */}
              {visibleCards >= 4 && (newMyst.length > 0 || openMyst.length > 0) && (
                <div
                  className="rounded-xl p-4 card-surface"
                  style={{
                    background: 'var(--color-card-base)',
                    border: '1px solid rgba(28,20,16,.06)',
                    animationDelay: '40ms',
                  }}
                >
                  <p className="italic mb-3" style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
                    {newMyst.length > 0 ? 'threads just opened' : 'threads still open'}
                  </p>
                  {(newMyst.length > 0 ? newMyst : openMyst.slice(0, 3)).map(m => (
                    <p key={m.id} className="flex items-start gap-2 mb-1.5"
                      style={{ fontSize: 13, color: 'var(--color-ink-600)' }}>
                      <span style={{
                        fontSize: 9, color: 'var(--ca, #B8860B)',
                        opacity: 0.65, flexShrink: 0, marginTop: 3,
                      }}>✦</span>
                      {m.text}
                    </p>
                  ))}
                </div>
              )}

              {/* Companion reflection — quiet, earned, surfaces after cards */}
              {visibleCards >= 4 && hasReflection && (
                <p className="italic text-center px-2 pt-1 leading-relaxed card-surface"
                  style={{ fontSize: 12, color: 'var(--color-ink-400)', animationDelay: '200ms' }}>
                  <span style={{ fontSize: 8, color: 'var(--ca, #B8860B)', opacity: 0.55 }}>✦</span>
                  {' '}{completionReflection.text}
                </p>
              )}

              {/* Close — appears last */}
              {visibleCards >= 4 && (
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="w-full transition-all card-surface"
                  style={{
                    fontFamily:    'var(--font-serif)',
                    fontSize:      14,
                    fontWeight:    400,
                    color:         'var(--color-ink-600)',
                    padding:       '11px',
                    border:        '1px solid var(--color-ink-200)',
                    borderRadius:  10,
                    background:    'transparent',
                    animationDelay: '360ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-ink-400)'; e.currentTarget.style.color = 'var(--color-ink-900)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-ink-200)'; e.currentTarget.style.color = 'var(--color-ink-600)' }}
                >
                  Return to the story →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
