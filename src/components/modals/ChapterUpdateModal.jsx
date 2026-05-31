import { useState, useEffect, useRef } from 'react'
import { uid } from '../../utils/uid.js'
import { track } from '../../utils/analytics.js'
import { Ico } from '../shared/icons.jsx'
import ProgressBar from '../shared/ProgressBar.jsx'
import { getEffectiveMode, isMysteryVisible } from '../../utils/spoiler.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { logDates, localDateKey } from '../../utils/date.js'
import {
  pickCompletionReflection,
  pickReturnReflection,
  markReflectionSurfaced,
} from '../../utils/reflectionEngine.js'
import { generateSessionReflection } from '../../utils/companionThread.js'
import { aiEnabled, bookDepth } from '../../utils/depthLevel.js'
import { liveItems } from '../../utils/live.js'

// ── Natural language chapter parser ──────────────────────────────────────────
// Accepts flexible phrasing and returns a chapter number, or null if unparseable.
// Examples: "chapter five", "fifth", "just finished 12", "finished the book",
//           "done", "completed it", "part 3", "i'm on 7", "up to chapter 8"
const WORD_TO_NUM = {
  one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
  eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
  seventeen:17,eighteen:18,nineteen:19,twenty:20,
  'twenty-one':21,'twenty-two':22,'twenty-three':23,'twenty-four':24,
  'twenty-five':25,'twenty-six':26,'twenty-seven':27,'twenty-eight':28,
  'twenty-nine':29,thirty:30,
  first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,
  ninth:9,tenth:10,eleventh:11,twelfth:12,thirteenth:13,fourteenth:14,
  fifteenth:15,sixteenth:16,seventeenth:17,eighteenth:18,nineteenth:19,
  twentieth:20,
}
const FINISH_PHRASES = /\b(finish(ed)?(\s+the\s+book)?|done|completed?\s*(it|the\s+book)?|just\s+completed?\s*(it)?|read\s+it\s+all|that'?s?\s+it|the\s+end|last\s+chapter|final\s+chapter|all\s+(of\s+)?it|all\s+done)\b/i

function parseChapterNlp(text, totalChapters) {
  const t = text.trim().toLowerCase()
  if (!t) return null

  // "finished the book", "done", "completed it", "last chapter"
  if (FINISH_PHRASES.test(t)) return totalChapters

  // Numeric digit with context — "chapter 12", "part 12", "section 12", "up to 12",
  // "just finished 12", "i'm on 7", "through 5", "at chapter 3", "currently on 4"
  const digitMatch = t.match(/\b(\d+)\b/)
  if (digitMatch) {
    const n = parseInt(digitMatch[1], 10)
    if (n >= 1 && n <= totalChapters) return n
    // Out-of-range digit — return null so the user sees no false parse
    if (n > totalChapters) return totalChapters
  }

  // Word numbers and ordinals — "chapter five", "fifth", "the third", "section two"
  for (const [word, num] of Object.entries(WORD_TO_NUM)) {
    const re = new RegExp(`\\b${word}\\b`)
    if (re.test(t) && num <= totalChapters) return num
  }

  return null
}

// ── Companion note response ───────────────────────────────────────────────────
// A single quiet observation responding to the reader's session note.
// Not advice. Not summary. Just noticing what they noticed.
const NOTE_REPLIES = [
  "That's worth keeping. The story just gave you something to carry.",
  "What you noticed will matter — or it already has, and you caught it.",
  "The observation belongs in the manuscript. It's tracking something real.",
  "The response is trustworthy. The text earned it.",
]
function generateNoteReply(note) {
  const n = note.toLowerCase()
  if (/unsettl|strange|weird|uneasy|uncomfortable/.test(n))
    return "The discomfort is the point. The story put it there deliberately."
  if (/confus|don.t understand|don.t get|unclear/.test(n))
    return "Worth holding the confusion open. Something is forming that hasn't resolved yet."
  if (/love|beautiful|amaz|brilliant|perfect/.test(n))
    return "That response is trustworthy. The story earned it."
  if (/sad|cry|mov|touch|griev/.test(n))
    return "Something accumulated to produce that. The story was working toward it."
  if (/surpris|shock|unexpect|didn.t expect/.test(n))
    return "The surprise is worth examining. The text was quietly setting something up."
  if (/wonder|curious|question|why|how/.test(n))
    return "That question has weight. The story may be setting up the conditions."
  return NOTE_REPLIES[Math.floor(Math.random() * NOTE_REPLIES.length)]
}

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
  const depth    = bookDepth(book, settings)

  // ── Form state ─────────────────────────────────────────────────────────────
  const defaultChapter = Math.min(book.currentChapter + 1, book.totalChapters)
  const [selectedChapter, setSelectedChapter] = useState(defaultChapter)
  const [sessionNote,     setSessionNote]     = useState('')

  // ── Post-update state ──────────────────────────────────────────────────────
  const [done,                 setDone]                 = useState(false)
  const [visibleCards,         setVisibleCards]         = useState(0)
  const [companionNoteReply,   setCompanionNoteReply]   = useState('')
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

  // Focus chapter select on mount
  const selectRef = useRef()
  useEffect(() => {
    const t = setTimeout(() => selectRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  // Focus close button when done
  useEffect(() => { if (done) closeButtonRef.current?.focus() }, [done])

  // Staggered card emergence — each card surfaces after a contemplative delay
  useEffect(() => {
    if (!done) { setVisibleCards(0); return }
    const timers = [
      setTimeout(() => setVisibleCards(1), 300),   // progress
      setTimeout(() => setVisibleCards(2), 1100),  // companion note reply (if any)
      setTimeout(() => setVisibleCards(3), 2000),  // characters
      setTimeout(() => setVisibleCards(4), 2900),  // chapter summary
      setTimeout(() => setVisibleCards(5), 3800),  // threads + close
    ]
    return () => timers.forEach(clearTimeout)
  }, [done])

  const handleUpdate = () => {
    const today = localDateKey()
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

    // Quiet depth: no companion reflections surface; don't consume from the pool
    const reflection = aiEnabled(book, settings)
      ? (gap !== null && gap >= 7)
        ? pickReturnReflection(book)
        : pickCompletionReflection(book)
      : null
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
      noteCount: liveItems(book.notes).length,
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

    // ── Companion session reflection ──────────────────────────────────────
    // Gated by Depth Level. Quiet mode: no companion reply card at all.
    // Resonant/Saturated: show keyword fallback instantly, upgrade to AI.
    if (sessionNote.trim() && aiEnabled(book, settings)) {
      const fallback = generateNoteReply(sessionNote)
      setCompanionNoteReply(fallback)
      const apiKey = settings?.anthropicKey
      generateSessionReflection(
        sessionNote.trim(),
        book,
        { chaptersRead, prevCh: book.currentChapter, newCh: n, progressAfter },
        apiKey || ''
      )
        .then(aiReply => { if (aiReply) setCompanionNoteReply(aiReply) })
        .catch(() => { /* keep fallback */ })
    }
    setDone(true)
  }

  // ── Computed values for done state ─────────────────────────────────────────
  const pct      = Math.round((newCh / book.totalChapters) * 100)
  const bookAtNew = { ...book, currentChapter: newCh }
  const revealAt  = c => c.revealChapter ?? parseInt(c.lastSeen?.match(/\d+/)?.[0] || '0')
  const allChars  = [...(book.characters?.main || []), ...(book.characters?.secondary || [])]
  const newlyMet  = allChars.filter(c => { const at = revealAt(c); return at > prevCh && at <= newCh })
  const openMyst  = liveItems(book.mysteries).filter(m => !m.resolved && isMysteryVisible(bookAtNew, m, mode))
  const newMyst   = liveItems(book.mysteries).filter(m => m.chapter > prevCh && m.chapter <= newCh && isMysteryVisible(bookAtNew, m, mode))
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
        style={{ boxShadow: 'var(--shadow-modal)', maxHeight: 'min(90svh, calc(100dvh - env(keyboard-inset-height, 0px) - 16px))' }}
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
              {/* Chapter selection — dropdown is primary */}
              <div className="mb-5">
                {remainingChapters.length === 0 ? (
                  <p className="italic" style={{ fontSize: 13, color: 'var(--color-ink-400)', padding: '20px 0', lineHeight: 1.7 }}>
                    All chapters have been read.
                  </p>
                ) : (
                  <select
                    ref={selectRef}
                    id="chapter-select"
                    value={selectedChapter}
                    onChange={e => setSelectedChapter(parseInt(e.target.value))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleUpdate() } }}
                    className="w-full rounded-xl px-4 py-3 border border-ink-200 bg-cream-50 transition-colors"
                    style={{ fontSize: 14, color: 'var(--color-ink-700)', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-ink-400)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--color-ink-200)' }}
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
                  onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 320)}
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
                  {/* Quiet: companion stays silent; the number is enough */}
                  {depth !== 'quiet' && (
                    <p className="italic mt-3" style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>
                      {observationText}
                    </p>
                  )}
                </div>
              )}

              {/* Card 1b — companion response to session note */}
              {visibleCards >= 2 && companionNoteReply && (
                <div
                  className="card-surface"
                  style={{
                    paddingLeft: 18,
                    borderLeft: '2px solid color-mix(in srgb, var(--color-accent) 28%, transparent)',
                    background: 'transparent',
                    boxShadow: 'none',
                    paddingTop: 4,
                    paddingBottom: 4,
                  }}
                >
                  <p
                    className="italic leading-relaxed"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 14,
                      lineHeight: 1.68,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {companionNoteReply}
                  </p>
                </div>
              )}

              {/* Card 2 — newly encountered characters */}
              {visibleCards >= 3 && newlyMet.length > 0 && (
                <div
                  className="rounded-xl p-4 card-surface"
                  style={{
                    background: 'var(--color-card-base)',
                    border: '1px solid var(--color-separator-soft)',
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
              {visibleCards >= 4 && ch?.summary && (
                <div
                  className="rounded-xl p-4 card-surface"
                  style={{
                    background: 'var(--color-card-base)',
                    border: '1px solid var(--color-separator-soft)',
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
              {visibleCards >= 5 && (newMyst.length > 0 || openMyst.length > 0) && (
                <div
                  className="rounded-xl p-4 card-surface"
                  style={{
                    background: 'var(--color-card-base)',
                    border: '1px solid var(--color-separator-soft)',
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
              {visibleCards >= 5 && hasReflection && (
                <p className="italic text-center px-2 pt-1 leading-relaxed card-surface"
                  style={{ fontSize: 12, color: 'var(--color-ink-400)', animationDelay: '200ms' }}>
                  <span style={{ fontSize: 8, color: 'var(--ca, #B8860B)', opacity: 0.55 }}>✦</span>
                  {' '}{completionReflection.text}
                </p>
              )}

              {/* Close — appears last */}
              {visibleCards >= 5 && (
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
