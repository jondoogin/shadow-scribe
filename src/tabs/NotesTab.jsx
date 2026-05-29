import { useState, useMemo, useRef, useEffect } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import NoteTag from '../components/shared/NoteTag.jsx'
import { TAG_CONFIG } from '../data/config.js'
import { fmtDate } from '../utils/date.js'
import { generateFirstIntroReflection, computeResonanceWeights } from '../utils/reflectionEngine.js'
import { detectConfidenceDrift, detectFixations } from '../utils/readerState.js'
import { noteAgeOpacity, notePatinaBorder } from '../utils/literaryPatina.js'
import { detectSingularities, noteGravityPersistence } from '../utils/emotionalGravity.js'
import { detectMotifs } from '../utils/residueMemory.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { generateNoteThreadResponse, generateNoteThreadReply, generateThreadSummary, threadFallback, detectNoteEcho, detectDominantCluster } from '../utils/companionThread.js'
import { aiEnabled } from '../utils/depthLevel.js'
import { uid } from '../utils/uid.js'
import { track } from '../utils/analytics.js'

const today = () => new Date().toISOString().split('T')[0]

// ── Literary CTA labels — tag-specific, not "Keep" ───────────────────────────
const CTA_LABELS = {
  theory:    'Hold this →',
  confusing: 'Leave open →',
  quote:     'Carry this →',
  favorite:  'Mark this →',
  character: 'Note this →',
  theme:     'Leave this →',
}

// ── Notes intimacy — companion micro-presence ─────────────────────────────────
// rereadCount: how many completed rereads this book has. Used to detect when
// first-reading notes are visible beneath the current reading — reread sediment.
function deriveNotesPresence(notes, rereadCount = 0) {
  if (notes.length < 3) return null
  const theoryCount    = notes.filter(n => n.tag === 'theory').length
  const confusingCount = notes.filter(n => n.tag === 'confusing').length
  const quoteCount     = notes.filter(n => n.tag === 'quote').length
  const charCount      = notes.filter(n => n.tag === 'character').length
  const favCount       = notes.filter(n => n.tag === 'favorite').length
  const revisedCount   = notes.filter(n => n.revisedAt).length
  const reflectedCount = notes.filter(n => n.reflection).length
  const collapsedTheories = notes.filter(n => n.tag === 'theory' && n.revisedAt).length

  // ── Reread sediment — first-reading certainty visible beneath the new one ──
  // Only fires on actual rerereads with enough archival material to be meaningful.
  if (rereadCount > 0) {
    const archival = notes.filter(n =>
      n.rereadEra !== undefined && n.rereadEra < rereadCount
    )
    const current = notes.filter(n =>
      (n.rereadEra ?? rereadCount) >= rereadCount
    )
    if (archival.length >= 3) {
      // Emotional inversion — if the dominant cluster shifted between readings,
      // the two layers are not just layered, they're in a different key entirely.
      if (current.length >= 3) {
        const archivalCluster = detectDominantCluster(archival)
        const currentCluster  = detectDominantCluster(current)
        if (archivalCluster && currentCluster && archivalCluster.label !== currentCluster.label)
          return "The emotional register has shifted between readings. What felt like one thing before now feels like another."
      }
      const archivalCollapsed = archival.filter(n => n.tag === 'theory' && n.revisedAt).length
      if (archivalCollapsed >= 1)
        return "What was certain in the first reading has already aged. The two layers don't quite agree."
      const archivalTheories = archival.filter(n => n.tag === 'theory').length
      if (archivalTheories >= 2)
        return "The first reading is still visible here — its certainties beside a newer uncertainty."
      if (archival.length >= 4)
        return "Two readings, layered. The earlier one is still legible beneath this one."
    }
  }

  if (collapsedTheories >= 2)
    return "More than one theory has been revised. The story keeps resisting what you were certain about."
  if (collapsedTheories === 1 && theoryCount >= 2)
    return "One of your theories has been revised. The story changed the terms."
  if (revisedCount >= 2 && theoryCount >= 2)
    return "Your earliest theories don't quite hold anymore. Something is still moving."
  if (revisedCount >= 2 && confusingCount >= 2)
    return "You keep returning to what unsettled you. The confusion is becoming something else."
  if (revisedCount >= 2 && reflectedCount >= 2)
    return "You've been returning to these. Something is still moving."
  if (revisedCount >= 3)
    return "Several of these thoughts have been revised since you first wrote them."
  if (reflectedCount >= 3)
    return "You keep adding to earlier thoughts. A second layer is forming."
  if (theoryCount >= 3 && confusingCount >= 2)
    return "You've been building theories and holding questions at the same time."
  if (theoryCount >= 4)
    return "The theories are accumulating. You've been reading ahead of the text."
  if (confusingCount >= 4)
    return "Several things here have unsettled you — which is rarely accidental."
  if (charCount >= 3)
    return "The people in this story keep finding their way into what you write."
  if (quoteCount >= 3)
    return "You've been holding onto certain lines."
  if (favCount >= 3)
    return "You've marked several moments. They tend to cluster where the story is most alive."
  if (notes.length >= 5) {
    const { arc } = detectConfidenceDrift(notes)
    if (arc === 'collapsing')
      return "You wrote with more certainty earlier. Something has been unsettling that."
    if (arc === 'building')
      return "Your interpretations have been growing more certain as the reading deepened."
    if (arc === 'oscillating')
      return "These notes keep moving between conviction and doubt. The story hasn't settled the question."
  }
  if (notes.length >= 6) {
    const fixations = detectFixations(notes)
    if (fixations.length) {
      const top = fixations[0]
      return `"${top.word}" keeps appearing in what you write. Something about it hasn't resolved.`
    }
    // Dominant emotional cluster — the emotional territory this reading has inhabited
    const cluster = detectDominantCluster(notes)
    if (cluster) {
      if (cluster.label === 'grief')    return "Loss and absence keep appearing in what you write. Something in this story is touching that register."
      if (cluster.label === 'fear')     return "Something in this reading keeps landing in fear or dread. It has been accumulating."
      if (cluster.label === 'wonder')   return "Strange, liminal, uncanny — your notes keep returning to that territory."
      if (cluster.label === 'guilt')    return "Moral weight keeps appearing in these notes. Something about conscience or complicity."
      if (cluster.label === 'power')    return "The pressure and struggle in this story has been staying with you."
      if (cluster.label === 'identity') return "Questions of self and belonging keep appearing in what you write."
      if (cluster.label === 'love')     return "Warmth and connection keep appearing in these notes. Something in the story is holding you."
    }
  }
  if (notes.length >= 8)
    return `${notes.length} thoughts kept here. A reading is forming.`
  return null
}

// ── Companion thread timing ───────────────────────────────────────────────────
function calcNoteDelay(text, tag) {
  const words     = text.trim().split(/\s+/).filter(Boolean).length
  const questions = (text.match(/\?/g) || []).length
  const sentences = (text.match(/[.!?]+/g) || []).length
  const uncertain   = /\b(maybe|perhaps|wonder|not sure|unsure|i think|unclear|don't know)\b/i.test(text)
  const emotional   = /\b(feel|felt|moved|devastating|haunting|beautiful|grief|loss|afraid|dread|scary|terrifying|horrifying|heartbreaking|overwhelming|terrible|awful|sad|angry|furious|devastated)\b/i.test(text)
  const hasEllipsis = /\.{2,}/.test(text)
  const isShort = words < 8
  let delay = isShort ? 800 : 1000
  delay += Math.min(words * 38, 1100)
  delay += sentences * 75
  delay += questions * 320
  if (tag === 'theory' || tag === 'confusing') delay += 500
  if (tag === 'favorite') delay += 250
  if (uncertain)   delay += 450
  if (emotional)   delay += 350
  if (hasEllipsis) delay += 300
  const jitter = (Math.random() * 440) - 220
  return Math.min(Math.max(delay + jitter, 700), 4800)
}

function generateNoteCompanionResponse(note, isFirst) {
  if (isFirst) return generateFirstIntroReflection({ tag: note.tag })
  const { tag, text = '' } = note
  const hasQ      = /\?/.test(text)
  const isHeavy   = /\b(scary|terrifying|horrifying|heartbreaking|overwhelming|terrible|awful|sad|angry|furious|devastated|feel|felt|moved|devastating|haunting|grief|loss|afraid|dread)\b/i.test(text)
  if (tag === 'theory')    return hasQ ? "A theory still framed as a question." : "Held here until the text responds."
  if (tag === 'confusing') return "Not yet resolved — keep it open."
  if (tag === 'favorite')  return "Something here has caught and held."
  if (tag === 'quote')     return "Worth carrying forward."
  if (hasQ)                return "That question is staying open."
  if (tag === 'character') return "This person is staying with you."
  if (isHeavy)             return "Something here has real weight."
  return "Noted."
}

export default function NotesTab({ book, onUpdateBook }) {
  const { settings } = useSettings()

  // ── Filter + search state ─────────────────────────────────────────────────
  const [activeTag,     setActiveTag]     = useState(null)
  const [search,        setSearch]        = useState('')
  const [searchVisible, setSearchVisible] = useState(false)

  // ── Note entry state — writing surface always present ────────────────────
  const [newNote,       setNewNote]       = useState('')
  const [newTag,        setNewTag]        = useState('theme')
  const [noteExpanded,  setNoteExpanded]  = useState(false)
  const [recentNoteId,  setRecentNoteId]  = useState(null)
  const textareaRef = useRef()

  // ── Companion thread state ────────────────────────────────────────────────
  const [thinkingNoteId,  setThinkingNoteId]  = useState(null)
  const [noteEchoes,      setNoteEchoes]      = useState({})
  const [replyNoteId,     setReplyNoteId]     = useState(null)   // which note has reply input open
  const [replyText,       setReplyText]       = useState('')
  const [compactingNoteId, setCompactingNoteId] = useState(null) // settling in progress
  const thinkingTimerRef = useRef(null)

  // ── Ref to current notes — needed for async AI callbacks ─────────────────
  const bookNotesRef = useRef(book.notes)
  useEffect(() => { bookNotesRef.current = book.notes }, [book.notes])

  // ── Echo rarity — resurfacing is earned, not mechanical ──────────────────
  // Minimum 2 non-echo notes between each echo. Starts at 2 so the first
  // eligible note can receive an echo. Resets to 0 each time an echo fires.
  // Using a ref (not state) because this doesn't drive rendering.
  const echoGapRef = useRef(2)

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editingId,      setEditingId]      = useState(null)
  const [editText,       setEditText]       = useState('')
  const [editTag,        setEditTag]        = useState('theme')

  // ── Reflection state ──────────────────────────────────────────────────────
  const [reflectingId,   setReflectingId]   = useState(null)
  const [reflectText,    setReflectText]    = useState('')

  // ── Deletion state ────────────────────────────────────────────────────────
  const [deletingId,     setDeletingId]     = useState(null)
  const [removingReflId, setRemovingReflId] = useState(null)

  // ── Mystery chapters — companion cross-reference residue ─────────────────
  const mysteryChapters = useMemo(
    () => new Set((book.mysteries || []).filter(m => !m.resolved && m.chapter).map(m => m.chapter)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.mysteries?.length]
  )

  // ── Resonance weights + singularities ────────────────────────────────────
  const resonanceWeights = useMemo(
    () => computeResonanceWeights(book.notes || []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.notes?.length]
  )
  const singularityNums = useMemo(() => {
    const motifs = detectMotifs(book.notes || [], book.currentChapter || Infinity)
    return new Set(detectSingularities(book, resonanceWeights, motifs).map(s => s.num))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.notes?.length, book.mysteries?.length, resonanceWeights])

  const q = search.trim().toLowerCase()
  const visible = useMemo(
    () => book.notes
      .filter(n => !activeTag || n.tag === activeTag)
      .filter(n => !q || n.text.toLowerCase().includes(q) || (n.reflection || '').toLowerCase().includes(q)),
    [book.notes, activeTag, q]
  )
  // Newest first — writer witnesses their own note arriving
  const visibleReversed = useMemo(() => [...visible].reverse(), [visible])
  const tagCounts = useMemo(() => {
    const counts = {}
    book.notes.forEach(n => { counts[n.tag] = (counts[n.tag] || 0) + 1 })
    return counts
  }, [book.notes])

  const usedTags = useMemo(() =>
    [...new Set(book.notes.map(n => n.tag))]
      .sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0)),
    [book.notes, tagCounts]
  )

  // ── Textarea expansion ────────────────────────────────────────────────────
  const handleTextareaFocus = () => {
    setNoteExpanded(true)
    // On mobile, the keyboard pushes the viewport up. After a brief delay
    // (to let the keyboard animation start), scroll the textarea into view
    // so it isn't hidden below the keyboard.
    if ('ontouchstart' in window) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 350)
    }
  }
  const handleTextareaBlur  = () => {
    // Delay so clicking tag/save buttons still works
    setTimeout(() => {
      if (!newNote.trim()) setNoteExpanded(false)
    }, 180)
  }

  // Clear recent note highlight after animation
  useEffect(() => {
    if (!recentNoteId) return
    const t = setTimeout(() => setRecentNoteId(null), 1800)
    return () => clearTimeout(t)
  }, [recentNoteId])

  const addNote = () => {
    if (!newNote.trim()) return
    const isFirstNote = book.notes.length === 0 && !book.companionIntroResponded
    const note = {
      id: uid('n_'),
      text: newNote.trim(),
      tag: newTag,
      date: today(),
      rereadEra: book.rereadCount || 0,
      // Chapter stamped at creation so echoes and archaeology can be chapter-aware
      ...(book.currentChapter > 0 ? { chapter: book.currentChapter } : {}),
    }
    if (isFirstNote) track('first_note', { tag: newTag, format: book.format })
    const updates = { notes: [...book.notes, note] }
    if (isFirstNote) {
      updates.companionIntroResponded = true
      const introText = generateFirstIntroReflection({ tag: newTag })
      const introId = uid('intro_')
      updates.reflectionCache = {
        contextHash: introId,
        generatedAt: new Date().toISOString(),
        reflections: [{
          id: introId,
          text: introText,
          type: 'intro',
          priority: 3,
          surfaceCount: 0,
          lastSurfaced: null,
          suppressed: false,
          generatedAt: new Date().toISOString(),
        }],
        aiEnhanced: false,
      }
    }
    // ── Echo detection — scan old notes before update ────────────────────
    // Must happen before onUpdateBook so we search the pre-addition corpus.
    // Gated by echoGapRef: minimum 2 non-echo notes between each echo.
    // This keeps resurfacing occasional and earned, not mechanical.
    const canEcho = !isFirstNote && echoGapRef.current >= 2
    const echo    = canEcho ? detectNoteEcho(note, book.notes, book.rereadCount || 0) : null
    if (echo) {
      setNoteEchoes(prev => ({ ...prev, [note.id]: echo }))
      echoGapRef.current = 0           // reset gap — next echo must wait 2+ notes
    } else if (!isFirstNote) {
      echoGapRef.current += 1          // accumulate gap toward next echo window
    }

    onUpdateBook(updates)
    setNewNote('')
    setNoteExpanded(false)
    setRecentNoteId(note.id)

    // ── Companion thread — gated by Depth Level ──────────────────────────
    // Quiet mode: note saves as a record, no companion engagement.
    if (!aiEnabled(book, settings)) return
    const apiKey   = settings?.anthropicKey
    const minDelay = calcNoteDelay(note.text, note.tag)
    if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current)

    // ── Persist companion initial response to note.thread ────────────────
    const persistThread = (noteId, text) => {
      onUpdateBook({
        notes: bookNotesRef.current.map(n =>
          n.id === noteId ? { ...n, thread: [{ role: 'companion', text, date: today() }] } : n
        ),
      })
    }

    if (isFirstNote) {
      setThinkingNoteId(note.id)
      const introText = generateNoteCompanionResponse(note, true)
      thinkingTimerRef.current = setTimeout(() => {
        setThinkingNoteId(null)
        persistThread(note.id, introText)
      }, minDelay)
    } else {
      setThinkingNoteId(note.id)
      const startTime = Date.now()
      generateNoteThreadResponse(note, book, apiKey || '', { echo })
        .then(aiText => {
          const elapsed   = Date.now() - startTime
          const remaining = Math.max(0, minDelay - elapsed)
          thinkingTimerRef.current = setTimeout(() => {
            setThinkingNoteId(null)
            persistThread(note.id, aiText)
          }, remaining)
        })
        .catch(() => {
          const elapsed   = Date.now() - startTime
          const remaining = Math.max(0, minDelay - elapsed)
          thinkingTimerRef.current = setTimeout(() => {
            setThinkingNoteId(null)
            persistThread(note.id, threadFallback(note.tag))
          }, remaining)
        })
    }
    // No key, non-first: companion is quietly absent (echo still shows if found)
  }

  useEffect(() => () => { if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current) }, [])

  const startEdit = (note) => {
    setEditingId(note.id); setEditText(note.text); setEditTag(note.tag)
    setReflectingId(null); setDeletingId(null); setRemovingReflId(null)
  }

  const saveEdit = (note) => {
    const newText = editText.trim()
    if (!newText) return
    const changed = newText !== note.text || editTag !== note.tag
    onUpdateBook({
      notes: book.notes.map(n => n.id === note.id ? {
        ...n, text: newText, tag: editTag,
        revisedAt: changed ? today() : n.revisedAt,
      } : n),
    })
    setEditingId(null)
  }

  const deleteNote = (noteId) => {
    onUpdateBook({ notes: book.notes.filter(n => n.id !== noteId) })
    setDeletingId(null)
  }

  const startReflect = (note) => {
    setReflectingId(note.id); setReflectText(note.reflection || '')
    setEditingId(null); setRemovingReflId(null)
  }

  const saveReflection = (note) => {
    const text = reflectText.trim()
    onUpdateBook({
      notes: book.notes.map(n => n.id === note.id ? {
        ...n,
        reflection:     text || undefined,
        reflectionDate: text ? today() : undefined,
      } : n),
    })
    setReflectingId(null); setReflectText('')
  }

  const removeReflection = (noteId) => {
    onUpdateBook({
      notes: book.notes.map(n => n.id === noteId
        ? { ...n, reflection: undefined, reflectionDate: undefined } : n
      ),
    })
    setRemovingReflId(null)
  }

  // ── Thread reply — user replies to companion in a note thread ────────────
  const submitThreadReply = (note) => {
    const text = replyText.trim()
    if (!text) return
    // Quiet mode: persist the user reply but don't fire a companion response.
    const allowAi    = aiEnabled(book, settings)
    const apiKey     = settings?.anthropicKey
    const userMsg    = { role: 'user', text, date: today() }
    const newThread  = [...(note.thread || []), userMsg]

    // 1. Persist user message immediately
    onUpdateBook({ notes: bookNotesRef.current.map(n => n.id === note.id ? { ...n, thread: newThread } : n) })
    setReplyText('')
    setReplyNoteId(null)

    // Quiet mode: user reply stays in thread, no companion response fires.
    if (!allowAi) return

    setThinkingNoteId(note.id)

    // 2. Generate companion reply
    generateNoteThreadReply(newThread, note, book, apiKey || '')
      .then(companionText => {
        const companionMsg = { role: 'companion', text: companionText, date: today() }
        setThinkingNoteId(null)
        const latestNote = bookNotesRef.current.find(n => n.id === note.id)
        onUpdateBook({
          notes: bookNotesRef.current.map(n =>
            n.id === note.id ? { ...n, thread: [...(latestNote?.thread || newThread), companionMsg] } : n
          ),
        })
      })
      .catch(() => {
        const companionMsg = { role: 'companion', text: threadFallback(note.tag), date: today() }
        setThinkingNoteId(null)
        const latestNote = bookNotesRef.current.find(n => n.id === note.id)
        onUpdateBook({
          notes: bookNotesRef.current.map(n =>
            n.id === note.id ? { ...n, thread: [...(latestNote?.thread || newThread), companionMsg] } : n
          ),
        })
      })
  }

  // ── Settle thread — compact to a companion summary ────────────────────────
  const settleThread = (note) => {
    const apiKey = settings?.anthropicKey
    setCompactingNoteId(note.id)
    generateThreadSummary(note.thread || [], note, book, apiKey || '')
      .then(summary => {
        setCompactingNoteId(null)
        onUpdateBook({
          notes: bookNotesRef.current.map(n =>
            n.id === note.id ? { ...n, threadSummary: summary, threadCollapsed: true } : n
          ),
        })
      })
      .catch(() => {
        // Collapse without summary on error
        setCompactingNoteId(null)
        onUpdateBook({
          notes: bookNotesRef.current.map(n =>
            n.id === note.id ? { ...n, threadCollapsed: true } : n
          ),
        })
      })
  }

  const notesPresence = deriveNotesPresence(book.notes, book.rereadCount || 0)

  return (
    <div className="max-w-2xl">

      {/* ── Writing surface — dominant, editorial, always at top ────────── */}
      {/* This is the primary gesture. It should feel like opening the page.  */}
      <div className="note-write-area" style={{ marginBottom: 28 }}>
        <textarea
          ref={textareaRef}
          value={newNote}
          onChange={e => { setNewNote(e.target.value); if (e.target.value.trim()) setNoteExpanded(true) }}
          onFocus={handleTextareaFocus}
          onBlur={handleTextareaBlur}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && noteExpanded && newNote.trim()) {
              e.preventDefault(); addNote()
            }
            if (e.key === 'Escape') { setNewNote(''); setNoteExpanded(false) }
          }}
          placeholder="A thought, a question, a theory…"
          inputMode="text"
          enterKeyHint={noteExpanded ? 'done' : 'enter'}
          rows={noteExpanded ? 4 : 2}
          style={{
            width:        '100%',
            resize:       'none',
            outline:      'none',
            background:   'transparent',
            fontSize:     17,
            lineHeight:   1.72,
            fontFamily:   'var(--font-serif)',
            fontStyle:    'italic',
            color:        'var(--color-text-primary)',
            border:       'none',
            borderLeft:   noteExpanded
              ? '2px solid var(--color-accent)'
              : '2px solid var(--color-hairline)',
            paddingLeft:  20,
            paddingBottom: 10,
            caretColor:   'var(--color-accent)',
            transition:   'border-color 600ms cubic-bezier(0.2,0.9,0.2,1)',
          }}
        />
        {noteExpanded && (
          <div className="flex items-center justify-end gap-4 mt-3 animate-fade-in">
            <button
              onClick={() => { setNewNote(''); setNoteExpanded(false) }}
              style={{ fontSize: 11, color: 'var(--color-ink-300)', fontStyle: 'italic' }}
              className="transition-colors hover:text-ink-500"
            >
              cancel
            </button>
            <button
              onClick={addNote}
              style={{ fontSize: 11, color: 'var(--ca, #B8860B)', fontWeight: 500 }}
              className="transition-opacity hover:opacity-75"
            >
              Keep →
            </button>
          </div>
        )}
      </div>

      {/* ── Notes presence — companion intimacy ─────────────────────────── */}
      {notesPresence && (
        <p className="italic mb-6 leading-relaxed" style={{ fontSize: 12, color: 'var(--color-ink-500)' }}>
          {notesPresence}
        </p>
      )}

      {/* ── Filter row + search as secondary reveal ──────────────────────── */}
      {book.notes.length > 0 && (
        <div className="flex items-center justify-between mb-6 gap-2">
          <div className="flex items-center notes-filter-row gap-0 pb-0.5 min-w-0 flex-1">
            <button onClick={() => setActiveTag(null)}
              className={`filter-link ${!activeTag ? 'active' : ''}`}>
              All
            </button>
            {usedTags.map(t => (
              <span key={t} className="flex items-center">
                <span className="mx-2 select-none" style={{ color: 'var(--color-ink-200)', fontSize: 9 }}>·</span>
                <button onClick={() => setActiveTag(t === activeTag ? null : t)}
                  className={`filter-link ${activeTag === t ? 'active' : ''}`}>
                  {TAG_CONFIG[t]?.label ?? t}
                  {tagCounts[t] > 1 && (
                    <span style={{
                      marginLeft: 4,
                      fontSize: 9,
                      opacity: activeTag === t ? 0.7 : 0.45,
                      fontFamily: 'var(--font-sans)',
                      fontStyle: 'normal',
                    }}>
                      {tagCounts[t]}
                    </span>
                  )}
                </button>
              </span>
            ))}
          </div>

          {/* Search — secondary reveal, not dominant ── */}
          <div className="flex items-center flex-shrink-0">
            {searchVisible ? (
              <div className="flex items-center gap-2 animate-fade-in">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="search…"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Escape') { setSearchVisible(false); setSearch('') } }}
                  style={{
                    fontSize:      12,
                    background:    'transparent',
                    outline:       'none',
                    borderBottom:  '1px solid var(--color-ink-200)',
                    color:         'var(--color-ink-600)',
                    paddingBottom: 2,
                    width:         110,
                    fontStyle:     'italic',
                  }}
                />
                <button
                  onClick={() => { setSearchVisible(false); setSearch('') }}
                  style={{ fontSize: 11, color: 'var(--color-ink-300)' }}
                  className="transition-colors hover:text-ink-500"
                >
                  <Ico.X />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchVisible(true)}
                className="italic transition-colors hover:text-ink-500"
                style={{ fontSize: 11, color: 'var(--color-ink-300)', whiteSpace: 'nowrap' }}
              >
                search notes
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Note list — newest first ─────────────────────────────────────── */}
      {book.notes.length === 0 ? (
        <p className="italic" style={{ fontSize: 13, color: 'var(--color-ink-300)', marginTop: 4 }}>
          Theories, favourite lines, confusions, hunches.
        </p>
      ) : visible.length === 0 ? (
        <div className="py-14 text-center">
          <p className="italic" style={{ fontSize: 13, color: 'var(--color-ink-400)' }}>
            {q
              ? 'Nothing surfaces for that search.'
              : activeTag === 'theory'    ? 'No theories yet — something will present itself.'
              : activeTag === 'confusing' ? 'Nothing marked as confusing. The story may be holding its cards.'
              : activeTag === 'quote'     ? 'No lines marked yet.'
              : activeTag === 'character' ? 'No character notes yet.'
              : activeTag === 'favorite'  ? 'Nothing marked as a favourite yet.'
              : 'No notes here yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleReversed.map((note, i) => {
            const isEditing      = editingId      === note.id
            const isReflecting   = reflectingId   === note.id
            const isDeleting     = deletingId     === note.id
            const isRemovingRefl = removingReflId === note.id
            const isRecent       = note.id        === recentNoteId

            const persistence  = noteGravityPersistence(note, resonanceWeights, singularityNums)
            const ageOpacity   = Math.min(1, noteAgeOpacity(note, resonanceWeights) * persistence)
            const patinaBorder = notePatinaBorder(note, resonanceWeights)

            const isArchival = note.rereadEra !== undefined && note.rereadEra < (book.rereadCount || 0)

            // Geological break: entering archival stratum from above (current → archival)
            const precedingNote = visibleReversed[i - 1]
            const precedingIsCurrentEra = i > 0 && (
              precedingNote.rereadEra === undefined ||
              precedingNote.rereadEra >= (book.rereadCount || 0)
            )
            const geologicalBreak = isArchival && precedingIsCurrentEra

            return (
              <div
                key={note.id}
                className={`note-card ${isArchival ? 'p-5 note-archival' : 'p-4'} ${isRecent ? 'note-land' : ''}`}
                style={{
                  background:  isArchival ? 'var(--color-card-archival, #F5EFE4)' : 'var(--color-card-base)',
                  opacity:     ageOpacity < 1 ? ageOpacity : undefined,
                  borderColor: patinaBorder ?? undefined,
                  marginTop:   geologicalBreak ? '2rem' : undefined,
                }}
              >
                {isDeleting ? (
                  <div className="animate-fade-in">
                    <p className="mb-4 leading-relaxed" style={{ fontSize: 13, color: 'var(--color-ink-600)' }}>
                      Remove this thought from the companion?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeletingId(null)}
                        className="px-3 py-1.5 rounded-lg border border-ink-200 transition-colors hover:border-ink-300"
                        style={{ fontSize: 12, color: 'var(--color-ink-600)' }}>
                        Keep it
                      </button>
                      <button onClick={() => deleteNote(note.id)}
                        className="px-3 py-1.5 rounded-lg font-semibold text-white bg-ember hover:opacity-80 transition-opacity"
                        style={{ fontSize: 12 }}>
                        Yes, remove it
                      </button>
                    </div>
                  </div>

                ) : isEditing ? (
                  <div className="animate-fade-in">
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} autoFocus
                      className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm text-ink-800 bg-cream-200 resize-none mb-3" />
                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {Object.keys(TAG_CONFIG).map(t => (
                          <button key={t} onClick={() => setEditTag(t)}
                            className={`text-[11px] px-2.5 py-[3px] rounded-full font-medium transition-all ${TAG_CONFIG[t].cls} ${editTag === t ? 'ring-2 ring-gold ring-offset-1' : ''}`}>
                            {TAG_CONFIG[t].label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => { setDeletingId(note.id); setEditingId(null) }}
                        className="italic transition-colors hover:text-ember"
                        style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
                        Remove note
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg border border-ink-200 transition-colors"
                          style={{ fontSize: 12, color: 'var(--color-ink-500)' }}>
                          Cancel
                        </button>
                        <button onClick={() => saveEdit(note)}
                          className="px-3 py-1.5 rounded-lg font-semibold btn-accent"
                          style={{ fontSize: 12 }}>
                          Save
                        </button>
                      </div>
                    </div>
                  </div>

                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <p className={`flex-1 ${isArchival ? 'leading-loose' : 'leading-relaxed'}`}
                        style={{ fontSize: 13, color: 'var(--color-ink-700)' }}>
                        {note.text}
                      </p>
                      <NoteTag tag={note.tag} />
                    </div>

                    {/* Companion residue — chapter cross-reference */}
                    {note.chapter && mysteryChapters.has(note.chapter) && (
                      <p className="companion-echo mt-1.5" style={{ fontSize: 10 }}>
                        A thread from this chapter is still in motion.
                      </p>
                    )}

                    {/* Reflection display */}
                    {note.reflection && !isReflecting && (
                      <div className="mt-3 pl-3 border-l-2 border-ink-200">
                        <p className="italic leading-relaxed" style={{ fontSize: 12, color: 'var(--color-ink-500)' }}>
                          {note.reflection}
                        </p>
                        {note.reflectionDate && (
                          <p className="mt-0.5" style={{ fontSize: 10, color: 'var(--color-ink-300)' }}>
                            {fmtDate(note.reflectionDate)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Reflection input */}
                    {isReflecting && (
                      <div className="mt-3 pl-3 border-l-2 border-ink-200 animate-fade-in">
                        <textarea value={reflectText} onChange={e => setReflectText(e.target.value)} rows={2}
                          autoFocus
                          placeholder="A later thought…"
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveReflection(note) } }}
                          className="w-full bg-transparent resize-none outline-none placeholder-ink-300 leading-relaxed"
                          style={{ fontSize: 12, color: 'var(--color-ink-600)' }} />
                        <div className="flex gap-3 mt-1.5">
                          <button onClick={() => { setReflectingId(null); setReflectText('') }}
                            className="transition-colors hover:text-ink-600"
                            style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
                            Cancel
                          </button>
                          <button onClick={() => saveReflection(note)}
                            className="font-medium transition-colors hover:text-ink-800"
                            style={{ fontSize: 11, color: 'var(--color-ink-600)' }}>
                            Save
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Companion thread ────────────────────────────────── */}
                    {(thinkingNoteId === note.id || note.thread?.length > 0) && (
                      <div style={{ marginTop: 10, marginLeft: 2, paddingLeft: 12, borderLeft: '1px solid rgba(184,134,11,.15)' }}>

                        {/* COLLAPSED: show summary + expand */}
                        {note.threadCollapsed ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, paddingTop: 1 }}>
                              <span style={{ fontSize: 9, color: 'var(--ca, #B8860B)', marginTop: 4, flexShrink: 0, opacity: 0.65 }}>✦</span>
                              <p style={{ fontSize: 13, fontFamily: 'var(--font-sans)', lineHeight: 1.6, color: 'var(--color-ink-700)', fontStyle: 'italic', margin: 0 }}>
                                {note.threadSummary || 'Thread settled.'}
                              </p>
                            </div>
                            <button
                              onClick={() => onUpdateBook({ notes: book.notes.map(n => n.id === note.id ? { ...n, threadCollapsed: false } : n) })}
                              style={{ fontSize: 10, color: 'var(--color-ink-200)', fontStyle: 'italic', marginTop: 5, marginLeft: 16 }}
                              className="transition-colors hover:text-ink-400"
                            >
                              ↓ expand thread
                            </button>
                          </>
                        ) : (
                          <>
                            {/* THINKING: initial companion response pending */}
                            {thinkingNoteId === note.id && (!note.thread || note.thread.length === 0) && (
                              <div style={{ display: 'flex', gap: 5, paddingTop: 3, paddingBottom: 3 }}>
                                {[[2.3, 0], [3.1, 0.7], [1.9, 1.5]].map(([dur, d], idx) => (
                                  <span key={idx} style={{ fontSize: 9, color: 'var(--ca, #B8860B)', animation: `companionPulse ${dur}s ease-in-out infinite`, animationDelay: `${d}s`, display: 'inline-block' }}>✦</span>
                                ))}
                              </div>
                            )}

                            {/* THREAD MESSAGES */}
                            {(note.thread || []).map((msg, idx) => (
                              <div key={idx} style={{ marginBottom: idx < note.thread.length - 1 ? 8 : 0 }}>
                                {msg.role === 'companion' ? (
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, paddingTop: 1 }}>
                                    <span className="companion-glyph-settle" style={{ fontSize: 9, color: 'var(--ca, #B8860B)', marginTop: 4, flexShrink: 0, opacity: 0.65 }}>✦</span>
                                    <p className="companion-text-surface" style={{ fontSize: 13, fontFamily: 'var(--font-sans)', lineHeight: 1.6, color: 'var(--color-ink-700)', margin: 0 }}>
                                      {msg.text}
                                    </p>
                                  </div>
                                ) : (
                                  <p style={{ paddingLeft: 16, fontSize: 12, color: 'var(--color-ink-400)', fontStyle: 'italic', margin: 0, lineHeight: 1.55, paddingTop: 1 }}>
                                    {msg.text}
                                  </p>
                                )}
                              </div>
                            ))}

                            {/* THINKING: thread reply pending */}
                            {thinkingNoteId === note.id && note.thread?.length > 0 && (
                              <div style={{ display: 'flex', gap: 5, paddingTop: 5, paddingLeft: 0 }}>
                                {[[2.3, 0], [3.1, 0.7], [1.9, 1.5]].map(([dur, d], idx) => (
                                  <span key={idx} style={{ fontSize: 9, color: 'var(--ca, #B8860B)', animation: `companionPulse ${dur}s ease-in-out infinite`, animationDelay: `${d}s`, display: 'inline-block' }}>✦</span>
                                ))}
                              </div>
                            )}

                            {/* REPLY INPUT — visible when thread ends with companion message */}
                            {note.thread?.length > 0 &&
                             note.thread[note.thread.length - 1]?.role === 'companion' &&
                             thinkingNoteId !== note.id && (
                              <div style={{ paddingLeft: 16, marginTop: 7 }}>
                                {replyNoteId === note.id ? (
                                  <input
                                    autoFocus
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) { e.preventDefault(); submitThreadReply(note) }
                                      if (e.key === 'Escape') { setReplyNoteId(null); setReplyText('') }
                                    }}
                                    placeholder="a reply…"
                                    style={{ fontSize: 12, background: 'transparent', outline: 'none', borderBottom: '1px solid var(--color-hairline)', color: 'var(--color-ink-500)', paddingBottom: 2, width: '100%', fontStyle: 'italic', caretColor: 'var(--color-accent)' }}
                                  />
                                ) : (
                                  <button
                                    onClick={() => { setReplyNoteId(note.id); setReplyText('') }}
                                    style={{ fontSize: 10, color: 'var(--color-ink-200)', fontStyle: 'italic' }}
                                    className="transition-colors hover:text-ink-400"
                                  >
                                    reply
                                  </button>
                                )}
                              </div>
                            )}

                            {/* SETTLE — after ≥2 user turns (≥4 messages: C U C U) */}
                            {note.thread?.length >= 4 && thinkingNoteId !== note.id && replyNoteId !== note.id && (
                              <div style={{ paddingLeft: 16, marginTop: 7 }}>
                                {compactingNoteId === note.id ? (
                                  <span style={{ fontSize: 10, color: 'var(--color-ink-300)', fontStyle: 'italic' }}>settling…</span>
                                ) : (
                                  <button
                                    onClick={() => settleThread(note)}
                                    style={{ fontSize: 10, color: 'var(--color-ink-200)', fontStyle: 'italic' }}
                                    className="transition-colors hover:text-ink-400"
                                  >
                                    settle thread →
                                  </button>
                                )}
                              </div>
                            )}

                            {/* RE-COLLAPSE — for threads that were settled and re-opened */}
                            {note.threadSummary && !note.threadCollapsed && (
                              <button
                                onClick={() => onUpdateBook({ notes: book.notes.map(n => n.id === note.id ? { ...n, threadCollapsed: true } : n) })}
                                style={{ fontSize: 10, color: 'var(--color-ink-200)', fontStyle: 'italic', marginTop: 6, paddingLeft: 16 }}
                                className="transition-colors hover:text-ink-400"
                              >
                                ↑ collapse
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* ── Note echo — older resonance surfaces after thinking ── */}
                    {/* Era echoes (from a previous reading) are labeled          */}
                    {/* differently — they carry the weight of first-reading      */}
                    {/* certainty returning into a reread.                        */}
                    {noteEchoes[note.id] && thinkingNoteId !== note.id && (
                      <div
                        className="animate-fade-in"
                        style={{
                          marginTop: noteReplies[note.id] ? 8 : 10,
                          marginLeft: 2,
                          paddingLeft: 12,
                          // Era echoes carry a subtly different border — a different era's ink
                          borderLeft: noteEchoes[note.id].__echoType === 'era'
                            ? '1px solid rgba(184,134,11,.12)'
                            : '1px solid rgba(28,20,16,.07)',
                        }}
                      >
                        <p style={{ fontSize: 10, color: 'var(--color-ink-300)', fontStyle: 'italic', marginBottom: 3 }}>
                          {noteEchoes[note.id].__echoType === 'era'
                            ? noteEchoes[note.id].chapter
                              ? `· from your first reading, ch. ${noteEchoes[note.id].chapter}`
                              : '· from your first reading'
                            : noteEchoes[note.id].chapter
                              ? `· an earlier note, ch. ${noteEchoes[note.id].chapter}`
                              : '· an earlier note'
                          }
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--color-ink-400)', lineHeight: 1.5, fontStyle: 'italic' }}>
                          {(noteEchoes[note.id].text || '').length > 120
                            ? noteEchoes[note.id].text.slice(0, 120) + '…'
                            : noteEchoes[note.id].text}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        <p style={{ fontSize: 10, color: 'var(--color-ink-300)', fontFamily: 'var(--font-sans)' }}>
                          {fmtDate(note.date)}
                        </p>
                        {note.chapter && (
                          <span style={{ fontSize: 10, color: 'var(--color-ink-300)' }}>· ch. {note.chapter}</span>
                        )}
                        {note.revisedAt && (
                          <span style={{ fontSize: 10, color: 'var(--color-ink-300)', fontStyle: 'italic' }}>· revisited</span>
                        )}
                        {isArchival && (
                          <span className="italic" style={{ fontSize: 9, color: 'var(--color-ink-300)' }}>· earlier reading</span>
                        )}
                      </div>
                      {isRemovingRefl ? (
                        <div className="flex items-center gap-2 animate-fade-in">
                          <span className="italic" style={{ fontSize: 11, color: 'var(--color-ink-500)' }}>Remove this reflection?</span>
                          <button onClick={() => setRemovingReflId(null)}
                            className="transition-colors hover:text-ink-600"
                            style={{ fontSize: 10, color: 'var(--color-ink-300)' }}>
                            Keep it
                          </button>
                          <button onClick={() => removeReflection(note.id)}
                            className="font-medium transition-colors hover:opacity-75"
                            style={{ fontSize: 11, color: 'var(--color-ember, #9B2335)' }}>
                            Yes
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {!isReflecting && note.reflection && (
                            <button onClick={() => setRemovingReflId(note.id)}
                              className="italic transition-colors hover:text-ember"
                              style={{ fontSize: 10, color: 'var(--color-ink-300)' }}>
                              remove
                            </button>
                          )}
                          {!isReflecting && (
                            <button onClick={() => startReflect(note)}
                              className="italic transition-colors hover:text-ink-500"
                              style={{ fontSize: 10, color: 'var(--color-ink-300)' }}>
                              {note.reflection ? 'add to this' : 'reflect'}
                            </button>
                          )}
                          <button onClick={() => startEdit(note)}
                            className="transition-colors hover:text-ink-600"
                            style={{ fontSize: 10, color: 'var(--color-ink-300)' }}>
                            edit
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
