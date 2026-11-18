import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BookCover from '../shared/BookCover.jsx'
import { Ico } from '../shared/icons.jsx'
import { getProgress } from '../../utils/progress.js'
import { fmtDate } from '../../utils/date.js'
import { useBooks } from '../../context/BooksContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { aiExtractNarrative } from '../../utils/aiExtractor.js'
import { parseEpub } from '../../utils/epubParser.js'
import { track } from '../../utils/analytics.js'
import { generateCompletionAfterimageLine } from '../../utils/crossBookMemory.js'
import { mysteryHauntScore } from '../../utils/hauntScore.js'
import { liveItems } from '../../utils/live.js'
import { callNumber, statusLabel, Holes } from '../../catalogue/parts.jsx'

const TEMPERAMENT_CONFIG = [
  { k: 'curious',      l: 'Curious',      d: 'Notices and wonders'       },
  { k: 'analytical',   l: 'Analytical',   d: 'Finds structure in story'  },
  { k: 'emotional',    l: 'Emotional',    d: 'Feels the current'         },
  { k: 'imaginative',  l: 'Imaginative',  d: 'Reads between the lines'   },
  { k: 'quiet',        l: 'Quiet',        d: 'Still, watchful'           },
  { k: 'searching',    l: 'Searching',    d: 'Looking for something'     },
]

function ordinal(n) {
  if (n === 11 || n === 12 || n === 13) return n + 'th'
  const r = n % 10
  if (r === 1) return n + 'st'
  if (r === 2) return n + 'nd'
  if (r === 3) return n + 'rd'
  return n + 'th'
}

function fmtCompleted(iso) {
  const d = fmtDate(iso)
  if (d === 'Today')     return 'The story ended here today.'
  if (d === 'Yesterday') return 'The story ended here yesterday.'
  return `The story ended here — ${d}.`
}

// Returns a literary label for a reading gap (used at 5+ days for active, always for paused).
function formatGapLabel(days, paused = false) {
  if (paused) {
    if (days >= 60) return `Set aside ${Math.round(days / 30)} months ago.`
    if (days >= 35) return 'Set aside over a month ago.'
    if (days >= 21) return `Set aside ${Math.round(days / 7)} weeks ago.`
    if (days >= 14) return 'Set aside two weeks ago.'
    return 'Set aside a week ago.'
  }
  // active reader returning
  if (days >= 60) return `${Math.round(days / 30)} months away from this story.`
  if (days >= 35) return 'Over a month since you last read.'
  if (days >= 21) return `${Math.round(days / 7)} weeks away from this story.`
  if (days >= 14) return 'Two weeks away from this story.'
  if (days >=  7) return 'A week away from this story.'
  if (days >=  5) return 'Nearly a week since your last visit.'
  return `${days} days since your last visit.`
}

const todayISO = () => new Date().toISOString().split('T')[0]

const CONFIRM = {
  finish: {
    body:   "The reading ends here. Everything you've written and noticed stays with this companion.",
    cancel: 'Not yet',
    ok:     "It's done",
  },
  restart: {
    body:   'Begin this story again? Your notes, threads, and observations stay — they become the record of a first reading.',
    cancel: 'Keep it as it is',
    ok:     'Begin again',
  },
  archive: {
    body:   'Move this companion to the archive? It will remain there, unchanged, until you return.',
    cancel: 'Keep it here',
    ok:     'Archive',
  },
}

export default function CompanionHeader({ book, onOpenUpdate, onUpdateBook }) {
  const pct          = getProgress(book)
  const rereadCount  = book.rereadCount || 0
  const navigate     = useNavigate()
  const { deleteBook } = useBooks()

  const { settings } = useSettings()
  const hasAiKey = true // proxy available for alpha testers without personal key

  const [pendingAction,  setPendingAction]  = useState(null)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [editingMeta,    setEditingMeta]    = useState(false)
  const [metaForm,       setMetaForm]       = useState({ title: book.title, author: book.author, temperament: book.temperament || '', totalChapters: String(book.totalChapters || ''), depthLevel: book.depthLevel || 'resonant' })
  const [reextracting,   setReextracting]   = useState(false)
  const [reextractMsg,   setReextractMsg]   = useState(null)
  const menuRef        = useRef()
  const epubRef        = useRef()
  const titleInputRef  = useRef()
  const confirmBtnRef  = useRef()

  // Keyboard support for confirm dialog
  useEffect(() => {
    if (!pendingAction) return
    const onKey = e => {
      if (e.key === 'Enter')  { performAction(pendingAction); setPendingAction(null) }
      if (e.key === 'Escape') { setPendingAction(null) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction])

  // Auto-focus confirm button
  useEffect(() => {
    if (pendingAction) setTimeout(() => confirmBtnRef.current?.focus(), 60)
  }, [pendingAction])

  useEffect(() => {
    if (!menuOpen) return
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false); setConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const openEditMeta = () => {
    setMetaForm({ title: book.title, author: book.author, temperament: book.temperament || '', totalChapters: String(book.totalChapters || ''), depthLevel: book.depthLevel || 'resonant' })
    setEditingMeta(true)
    setMenuOpen(false)
    setConfirmDelete(false)
    setTimeout(() => titleInputRef.current?.focus(), 60)
  }

  const saveMeta = () => {
    const t = metaForm.title.trim()
    const a = metaForm.author.trim()
    if (!t) return
    const chapNum = parseInt(metaForm.totalChapters, 10)
    const chapUpdate = chapNum > 0 && chapNum !== book.totalChapters
      ? {
          totalChapters: chapNum,
          chapters: Array.from({ length: chapNum }, (_, i) => {
            const existing = book.chapters.find(c => c.num === i + 1)
            return existing || { num: i + 1, title: null, summary: null, completed: (i + 1) <= book.currentChapter }
          }),
        }
      : {}
    onUpdateBook({ title: t, author: a, depthLevel: metaForm.depthLevel || 'resonant', ...(metaForm.temperament ? { temperament: metaForm.temperament } : {}), ...chapUpdate })
    setEditingMeta(false)
  }

  const handleMetaKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveMeta() }
    if (e.key === 'Escape') { setEditingMeta(false) }
  }

  const handleExport = () => {
    const data = JSON.stringify(book, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${book.title.replace(/\s+/g, '-').toLowerCase()}-companion.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  const handleReextractClick = () => {
    setMenuOpen(false)
    setReextractMsg(null)
    epubRef.current?.click()
  }

  const handleEpubFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setReextracting(true)
    setReextractMsg(null)
    try {
      const parsed = await parseEpub(file)
      const { chapterContents } = parsed
      if (!chapterContents || Object.keys(chapterContents).length === 0) {
        throw new Error('No chapter content found in that EPUB.')
      }
      const result = await aiExtractNarrative(
        chapterContents,
        book.chapters,
        settings.anthropicKey || '',
        { title: book.title, author: book.author },
      )
      const { characters, summaries, mysteries, extractionMeta } = result
      const updates = { narrativeExtracted: true, extractionMeta }
      if (characters.main.length > 0 || characters.secondary.length > 0) updates.characters = characters
      if (mysteries.length > 0) updates.mysteries = mysteries
      updates.chapters = book.chapters.map(ch => ({
        ...ch,
        summary: summaries[ch.num] ?? ch.summary ?? null,
      }))
      onUpdateBook(updates)
      setReextractMsg({ ok: true, text: `AI extraction complete — ${extractionMeta.characterCount} characters, ${extractionMeta.summariesGenerated} summaries, ${extractionMeta.mysteryCount} mysteries.` })
      setTimeout(() => setReextractMsg(null), 6000)
    } catch (err) {
      setReextractMsg({ ok: false, text: err.message })
      setTimeout(() => setReextractMsg(null), 6000)
    } finally {
      setReextracting(false)
    }
  }

  const handleDelete = () => {
    deleteBook(book.id)
    navigate('/')
  }

  const isFinished = book.status === 'finished'
  const isPaused   = book.status === 'paused'
  const isReading  = book.status === 'reading'
  const isWant     = book.status === 'want'
  const isArchived = !!book.archived
  const atEnd      = pct >= 100

  const performAction = (action) => {
    const today = todayISO()
    if (action === 'pause')   { onUpdateBook({ status: 'paused',  pausedAt: today, lastUpdated: today }); return }
    if (action === 'resume')  { onUpdateBook({ status: 'reading', lastUpdated: today }); return }
    if (action === 'begin')   { onUpdateBook({ status: 'reading', lastUpdated: today }); return }
    if (action === 'restore') { onUpdateBook({ archived: false,   lastUpdated: today }); return }
    if (action === 'finish')  {
      track('book_completed', { format: book.format, rereadCount })
      onUpdateBook({
        status: 'finished',
        completedAt: today,
        currentChapter: book.totalChapters,
        chapters: book.chapters.map(c => ({ ...c, completed: true })),
        lastUpdated: today,
      })
      return
    }
    if (action === 'restart') {
      track('reread_started', { rereadCount: rereadCount + 1, format: book.format })
      onUpdateBook({
        status:          'reading',
        currentChapter:  0,
        chapters:        book.chapters.map(c => ({ ...c, completed: false })),
        lastUpdated:     today,
        restartedAt:     today,
        rereadCount:     rereadCount + 1,
        reflectionCache: null,
        mysteries:       (book.mysteries || []).map(m => ({ ...m, archivedEra: rereadCount })),
      })
      return
    }
    if (action === 'archive') { onUpdateBook({ archived: true, lastUpdated: today }) }
  }

  const actions = []
  if (isArchived) {
    actions.push({ key: 'restore', label: 'restore to shelf',       confirm: false })
  } else if (isFinished) {
    actions.push({ key: 'restart', label: 'begin again',            confirm: true  })
    actions.push({ key: 'archive', label: 'archive this companion', confirm: true  })
  } else if (isPaused) {
    actions.push({ key: 'resume',  label: 'pick this back up',      confirm: false })
    actions.push({ key: 'finish',  label: 'mark as finished',       confirm: true  })
  } else if (isReading) {
    if (!atEnd) {
      // atEnd: primary completion block handles these — no redundant actions in secondary row
      actions.push({ key: 'pause',  label: 'put this aside',  confirm: false })
      actions.push({ key: 'finish', label: 'mark as finished', confirm: true })
    }
  } else if (isWant) {
    actions.push({ key: 'begin',   label: 'begin reading',          confirm: false })
  }

  // Status changes (put aside, mark finished, archive…) live in the ⋯ menu;
  // only the ones that are the next step for the book stay on the card.
  const cardActions = actions.filter(a => a.key === 'begin' || a.key === 'restore')
  const menuActions = actions.filter(a => !cardActions.includes(a))

  // Quiet annotation: series position + reread count
  const metaAnnotation = [
    book.series?.name && `${book.series.name} · book ${book.series.position}${book.series.total > 0 ? ` of ${book.series.total}` : ''}`,
    rereadCount > 0 && `${ordinal(rereadCount + 1)} reading`,
  ].filter(Boolean).join('  ·  ')

  // ── Detail block — rendered in-column on desktop, full-width below on mobile ──
  const detailBlock = (
    <>
      {/* ── Finished: post-completion afterimage / archival statement ── */}
      {isFinished && (() => {
        const daysAgo      = book.completedAt
          ? Math.floor((Date.now() - new Date(book.completedAt).getTime()) / 86_400_000)
          : 9999
        const recentFinish = daysAgo <= 30
        const veryFresh    = daysAgo <= 2    // still in the immediate aftermath
        const afterimage   = recentFinish ? generateCompletionAfterimageLine(book) : null
        return (
          <div className="mt-3 animate-fade-in">
            {veryFresh && afterimage ? (
              // Fresh completion — companion glyph + more presence
              <div className="flex items-start gap-2">
                <span style={{ fontSize: 9, color: 'var(--ca, #B8860B)', marginTop: 3, opacity: 0.55, flexShrink: 0 }}>✦</span>
                <p className="italic leading-relaxed" style={{ fontSize: 13, color: 'var(--color-ink-500)', lineHeight: 1.6 }}>
                  {afterimage}
                </p>
              </div>
            ) : (
              <p className="italic" style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>
                {afterimage ?? (book.completedAt ? fmtCompleted(book.completedAt) : 'The story is complete.')}
              </p>
            )}
            {recentFinish && daysAgo > 2 && book.completedAt && (
              <p className="italic" style={{ fontSize: 11, color: 'var(--color-ink-300)', marginTop: 3 }}>
                {fmtCompleted(book.completedAt)}
              </p>
            )}
          </div>
        )
      })()}

      {/* ── Reading gap archaeology — active book, away for 3+ days ── */}
      {isReading && !atEnd && !editingMeta && !pendingAction && (() => {
        const daysAway = book.lastUpdated
          ? Math.floor((Date.now() - new Date(book.lastUpdated).getTime()) / 86_400_000)
          : 0
        if (daysAway < 3) return null

        const containerStyle = {
          marginTop: 12,
          padding: '10px 12px',
          background: 'color-mix(in srgb, var(--ca) 5%, transparent)',
          borderLeft: '2px solid color-mix(in srgb, var(--ca) 22%, transparent)',
          borderRadius: '0 6px 6px 0',
        }
        const labelStyle = { fontSize: 11, color: 'var(--color-ink-400)', marginBottom: 6, letterSpacing: '0.01em' }

        const lastNote = liveItems(book.notes).slice(-1)[0]

        // No notes written: show gap label + chapter anchor for 7+ day gaps
        if (!lastNote) {
          if (daysAway < 7) return null
          return (
            <div className="animate-fade-in" style={containerStyle}>
              <p className="italic" style={labelStyle}>{formatGapLabel(daysAway)}</p>
              {book.currentChapter > 0 && (
                <p className="italic" style={{ fontSize: 12, color: 'var(--color-ink-400)', marginTop: 2 }}>
                  {book.format === 'audiobook' ? 'Part' : 'Chapter'} {book.currentChapter}.
                </p>
              )}
            </div>
          )
        }

        const lastText = lastNote.text || ''
        const hauntedMystery = daysAway >= 7
          ? liveItems(book.mysteries)
              .filter(m => !m.resolved)
              .sort((a, b) => mysteryHauntScore(b, book) - mysteryHauntScore(a, book))
              .find(m => mysteryHauntScore(m, book) >= 1.5)
          : null
        return (
          <div className="animate-fade-in" style={containerStyle}>
            {/* Gap label — shown at 5+ days (was 7+); short gaps let the quote speak alone */}
            {daysAway >= 5 && (
              <p className="italic" style={labelStyle}>{formatGapLabel(daysAway)}</p>
            )}
            <p
              className="italic leading-relaxed"
              style={{ fontSize: 13, color: 'var(--color-ink-500)', marginBottom: hauntedMystery ? 6 : 0 }}
            >
              "{lastText.length > 110 ? lastText.slice(0, 110) + '…' : lastText}"
            </p>
            {hauntedMystery && (
              <p className="italic leading-relaxed" style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>
                <span style={{ fontSize: 9, color: 'var(--ca, #B8860B)', opacity: 0.75, marginRight: 5 }}>✦</span>
                {hauntedMystery.text.length > 85
                  ? hauntedMystery.text.slice(0, 85) + '…'
                  : hauntedMystery.text}
              </p>
            )}
          </div>
        )
      })()}

      {/* ── Abandoned archaeology — paused book, set aside 7+ days ── */}
      {isPaused && !editingMeta && !pendingAction && (() => {
        const daysAway = book.lastUpdated
          ? Math.floor((Date.now() - new Date(book.lastUpdated).getTime()) / 86_400_000)
          : 0
        if (daysAway < 7) return null

        const lastNote         = liveItems(book.notes).slice(-1)[0]
        const lastNoteText     = lastNote?.text || ''
        const openMysteriesArr = liveItems(book.mysteries)
          .filter(m => !m.resolved)
          .sort((a, b) => mysteryHauntScore(b, book) - mysteryHauntScore(a, book))
        const topMystery       = openMysteriesArr[0] ?? null
        const openCount        = openMysteriesArr.length

        return (
          <div
            className="animate-fade-in"
            style={{
              marginTop: 12,
              padding: '10px 12px',
              background: 'color-mix(in srgb, var(--ca) 5%, transparent)',
              borderLeft: '2px solid color-mix(in srgb, var(--ca) 18%, transparent)',
              borderRadius: '0 6px 6px 0',
            }}
          >
            <p
              className="italic"
              style={{ fontSize: 11, color: 'var(--color-ink-400)', marginBottom: lastNote || openCount > 0 ? 6 : 0, letterSpacing: '0.01em' }}
            >
              {formatGapLabel(daysAway, true)}
            </p>
            {lastNote && (
              <p
                className="italic leading-relaxed"
                style={{
                  fontSize: 13,
                  color: 'var(--color-ink-500)',
                  marginBottom: openCount > 0 ? 6 : 0,
                }}
              >
                "{lastNoteText.length > 110 ? lastNoteText.slice(0, 110) + '…' : lastNoteText}"
              </p>
            )}
            {topMystery && (
              <p
                className="italic leading-relaxed"
                style={{ fontSize: 12, color: 'var(--color-ink-400)', marginBottom: openCount > 1 ? 4 : 0 }}
              >
                <span style={{ fontSize: 9, color: 'var(--ca, #B8860B)', opacity: 0.75, marginRight: 5 }}>✦</span>
                {topMystery.text.length > 90 ? topMystery.text.slice(0, 90) + '…' : topMystery.text}
              </p>
            )}
            {openCount > 1 && (
              <p className="italic" style={{ fontSize: 11, color: 'var(--color-ink-400)', opacity: 0.85 }}>
                {openCount - 1} other {openCount - 1 === 1 ? 'thread' : 'threads'} still open.
              </p>
            )}
          </div>
        )
      })()}

      {/* ── Completion pathway ── */}
      {(isReading || isPaused) && atEnd && !editingMeta && !pendingAction && (
        <div className="mt-4 animate-fade-in">
          <p
            className="italic"
            style={{ fontSize: 12, color: 'var(--color-ink-400)', marginBottom: 10, lineHeight: 1.6 }}
          >
            The final chapter.
          </p>
          <button
            onClick={() => setPendingAction('finish')}
            style={{
              fontFamily:    'var(--font-serif)',
              fontSize:      14,
              fontWeight:    400,
              letterSpacing: '-0.01em',
              color:         'var(--color-text-secondary)',
              padding:       '10px 22px',
              border:        '1px solid var(--color-hairline)',
              borderRadius:  8,
              background:    'transparent',
              display:       'inline-flex',
              alignItems:    'center',
              gap:           10,
              transition:    'background 700ms cubic-bezier(0.2,0.9,0.2,1), border-color 700ms, color 700ms, box-shadow 700ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-accent)'
              e.currentTarget.style.borderColor = 'var(--color-accent)'
              e.currentTarget.style.color = 'var(--color-bg)'
              e.currentTarget.style.boxShadow = '0 0 28px 6px var(--color-glow)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'var(--color-hairline)'
              e.currentTarget.style.color = 'var(--color-text-secondary)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            The story ends here
            <span style={{ fontSize: 9, color: 'var(--color-accent)', opacity: 0.65 }}>✦</span>
          </button>
        </div>
      )}

      {/* ── Actions: one primary (the chapter update), then Read and Listen ── */}
      {!editingMeta && !pendingAction && (
        <div className="c2-actions c2-actions--stack">
          {(isReading || isPaused) && !atEnd && (
            <button type="button" className="c2-btn c2-btn--primary" onClick={onOpenUpdate}>
              {isPaused
                ? `Return to chapter ${book.currentChapter || 1}`
                : (book.readingLog?.length ?? 0) === 0
                  ? 'Begin your first chapter'
                  : book.currentChapter > 0
                    ? `Continue from chapter ${book.currentChapter}`
                    : 'Begin your first chapter'}
              <span aria-hidden="true">→</span>
            </button>
          )}
          <div className="c2-row2">
            <Link to={`/book/${book.id}/read`} className="c2-btn"><Ico.Open /> Read</Link>
            <Link to={`/book/${book.id}/listen`} className="c2-btn"><Ico.Headphones /> Listen</Link>
          </div>
        </div>
      )}

      {/* ── Confirm dialog ── */}
      {pendingAction && CONFIRM[pendingAction] && !editingMeta && (
        <div className="mt-3 animate-fade-in">
          <p className="text-[12px] text-ink-600 italic mb-3 leading-relaxed">
            {CONFIRM[pendingAction].body}
          </p>
          <div className="flex items-center gap-4">
            <button onClick={() => setPendingAction(null)}
              className="text-[12px] italic text-ink-400 hover:text-ink-600 transition-colors">
              {CONFIRM[pendingAction].cancel}
            </button>
            <button ref={confirmBtnRef} onClick={() => { performAction(pendingAction); setPendingAction(null) }}
              className="text-[12px] italic hover:opacity-75 transition-opacity"
              style={{ color: 'var(--ca, #B8860B)', fontWeight: 500 }}>
              {CONFIRM[pendingAction].ok} →
            </button>
          </div>
        </div>
      )}

      {/* ── Lifecycle actions ── */}
      {cardActions.length > 0 && !pendingAction && !editingMeta && (
        <div className="c2-links">
          {cardActions.map(a => (
            <button key={a.key} type="button" className="c2-link"
              onClick={() => a.confirm ? setPendingAction(a.key) : performAction(a.key)}>
              {a.label.charAt(0).toUpperCase() + a.label.slice(1)}
            </button>
          ))}
        </div>
      )}


      {/* ── Re-extraction status ── */}
      {reextracting && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-gold-bg border border-gold-border animate-fade-in">
          <p className="text-[12px] text-gold animate-pulse">Claude is reading the chapters…</p>
        </div>
      )}
      {reextractMsg && !reextracting && (
        <div className={`mt-3 px-3 py-2 rounded-lg border animate-fade-in ${
          reextractMsg.ok
            ? 'bg-gold-bg border-gold-border text-ink-600'
            : 'bg-ember-bg border-ember-pale text-ember'
        }`}>
          <p className="text-[12px]">{reextractMsg.text}</p>
        </div>
      )}
    </>
  )

  const unit = book.format === 'audiobook' ? 'part' : 'ch.'
  const reached = book.currentChapter || 0

  return (
    <div className="cat c2 cat--head">
      {/* Hidden EPUB file input for re-extraction */}
      <input ref={epubRef} type="file" accept=".epub" className="hidden" onChange={handleEpubFile} />

      <header className="c2-top">
        <div>
          <button type="button" className="c2-ic" onClick={() => navigate('/library')} aria-label="Back to library"><Ico.Left /></button>
        </div>
        <div className="c2-top-c" />
        <div className="c2-top-r c3-menu" ref={menuRef}>
          <button type="button" className="c2-ic" onClick={() => { setMenuOpen(v => !v); setConfirmDelete(false) }} aria-label="Manage companion" aria-expanded={menuOpen}>
            <Ico.Dots />
          </button>
          {menuOpen && (
            <div className="c3-menu-pop animate-fade-in">
              {menuActions.map(a => (
                <button key={a.key} type="button" onClick={() => { setMenuOpen(false); a.confirm ? setPendingAction(a.key) : performAction(a.key) }}>
                  {a.label.charAt(0).toUpperCase() + a.label.slice(1)}
                </button>
              ))}
              {menuActions.length > 0 && <hr />}
              <button type="button" onClick={openEditMeta}>Edit details</button>
              <button type="button" onClick={() => { handleExport(); setMenuOpen(false) }}>Save a copy</button>
              {hasAiKey && <button type="button" onClick={handleReextractClick}>Re-extract with Claude…</button>}
              <hr />
              {!confirmDelete ? (
                <button type="button" className="is-danger" onClick={() => setConfirmDelete(true)}>Remove companion…</button>
              ) : (
                <div style={{ padding: '8px 12px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 15, lineHeight: 1.45, color: 'var(--ink-2)' }}>
                    This companion will be removed permanently, notes, threads and all.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="c2-btn" onClick={() => setConfirmDelete(false)}>Keep it</button>
                    <button type="button" className="c2-btn c2-btn--primary" style={{ background: 'var(--color-ember, #9B2335)' }} onClick={handleDelete}>Remove</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <article className="c2-card">
        <div className="c2-card-head">
          <span className="c2-call">{callNumber(book)}{book.series ? ` · ${book.series.position}` : ''}</span>
        </div>

        {editingMeta ? (
          <div className="c2-edit animate-fade-in">
            <input ref={titleInputRef} value={metaForm.title} onChange={e => setMetaForm(f => ({ ...f, title: e.target.value }))} onKeyDown={handleMetaKeyDown} placeholder="Title" aria-label="Title" />
            <input value={metaForm.author} onChange={e => setMetaForm(f => ({ ...f, author: e.target.value }))} onKeyDown={handleMetaKeyDown} placeholder="Author" aria-label="Author" />
            <input type="number" min="1" max="9999" value={metaForm.totalChapters} onChange={e => setMetaForm(f => ({ ...f, totalChapters: e.target.value }))} onKeyDown={handleMetaKeyDown} placeholder={`Total chapters (currently ${book.totalChapters})`} aria-label="Total chapters" />
            <span className="c2-label" style={{ marginTop: 6 }}>Temperament</span>
            <div className="c2-chips">
              {TEMPERAMENT_CONFIG.map(t => (
                <button key={t.k} type="button" className={metaForm.temperament === t.k ? 'is-on' : ''}
                  onClick={() => setMetaForm(f => ({ ...f, temperament: f.temperament === t.k ? '' : t.k }))}>{t.l}</button>
              ))}
            </div>
            <span className="c2-label" style={{ marginTop: 6 }}>Companion depth</span>
            <div className="c2-chips">
              {[['quiet', 'Quiet'], ['resonant', 'Resonant'], ['saturated', 'Saturated']].map(([k, l]) => (
                <button key={k} type="button" className={metaForm.depthLevel === k ? 'is-on' : ''} onClick={() => setMetaForm(f => ({ ...f, depthLevel: k }))}>{l}</button>
              ))}
            </div>
            <div className="c2-actions">
              <button type="button" className="c2-btn" onClick={() => setEditingMeta(false)}>Cancel</button>
              <button type="button" className="c2-btn c2-btn--primary" onClick={saveMeta} disabled={!metaForm.title.trim()}>Save</button>
            </div>
          </div>
        ) : (
          <div className="c2-card-book">
            <div>
              <h1 className="c2-title">{book.title}</h1>
              <p className="c2-by">{book.author}</p>
              {metaAnnotation && <p className="c2-label" style={{ marginTop: 8 }}>{metaAnnotation}</p>}
            </div>
            <div className="c2-card-cover"><BookCover book={book} className="w-[56px] h-[84px]" rounded="rounded-[4px]" /></div>
          </div>
        )}

        {!editingMeta && (
          <>
            {isFinished ? (
              <dl className="c2-fields">
                <div className="c2-field"><dt>Closed</dt><dd>{book.completedAt ? fmtDate(book.completedAt) : '—'}</dd></div>
                <div className="c2-field"><dt>Notes</dt><dd>{liveItems(book.notes).length}</dd></div>
                <div className="c2-field"><dt>Status</dt><dd>{statusLabel(book).split(' · ')[0]}</dd></div>
              </dl>
            ) : (
              <dl className="c2-fields">
                <div className="c2-field"><dt>{book.format === 'audiobook' ? 'Part' : 'Chapter'}</dt><dd>{reached} of {book.totalChapters || '—'}</dd></div>
                <div className="c2-field"><dt>Read</dt><dd>{Math.round(pct)}%</dd></div>
                <div className="c2-field"><dt>Status</dt><dd>{statusLabel(book).split(' · ')[0]}</dd></div>
              </dl>
            )}
            <Holes pct={isFinished ? 100 : pct} />

            {/* Spoiler seal: the companion knows only what you have reached */}
            {isFinished ? (
              <div className="c2-seal-row c2-seal-row--open">
                <span className="c2-stamp">Open<small>all chapters</small></span>
                <p>You have finished it, so nothing is sealed. Every chapter, thread and character is open.</p>
              </div>
            ) : (
              <div className="c2-seal-row">
                <span className="c2-stamp">Sealed<small>{reached > 0 ? `after ${unit} ${reached}` : 'from the start'}</small></span>
                <p>{reached > 0
                  ? `The lamp only reaches ${unit === 'ch.' ? 'chapter' : 'part'} ${reached}. Everything after it stays sealed until you get there.`
                  : 'Nothing is lit yet. Each chapter opens as you mark it read.'}</p>
              </div>
            )}

            {detailBlock}
          </>
        )}
      </article>
    </div>
  )
}
