import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BookCover from '../shared/BookCover.jsx'
import ReadingMomentum from './ReadingMomentum.jsx'
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

const todayISO = () => new Date().toISOString().split('T')[0]

const CONFIRM = {
  finish: {
    body:   'Mark this companion as finished?',
    cancel: 'Not yet',
    ok:     "Yes, it's done",
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
  const hasAiKey = !!settings.anthropicKey?.trim()

  const [pendingAction,  setPendingAction]  = useState(null)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [editingMeta,    setEditingMeta]    = useState(false)
  const [metaForm,       setMetaForm]       = useState({ title: book.title, author: book.author, temperament: book.temperament || '' })
  const [reextracting,   setReextracting]   = useState(false)
  const [reextractMsg,   setReextractMsg]   = useState(null)
  const menuRef    = useRef()
  const epubRef    = useRef()

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
    setMetaForm({ title: book.title, author: book.author, temperament: book.temperament || '' })
    setEditingMeta(true)
    setMenuOpen(false)
    setConfirmDelete(false)
  }

  const saveMeta = () => {
    const t = metaForm.title.trim()
    const a = metaForm.author.trim()
    if (!t) return
    onUpdateBook({ title: t, author: a, ...(metaForm.temperament ? { temperament: metaForm.temperament } : {}) })
    setEditingMeta(false)
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
        settings.anthropicKey,
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

  // Quiet annotation: series position + reread count
  const metaAnnotation = [
    book.series?.name && `${book.series.name} · book ${book.series.position}${book.series.total > 0 ? ` of ${book.series.total}` : ''}`,
    rereadCount > 0 && `${ordinal(rereadCount + 1)} reading`,
  ].filter(Boolean).join('  ·  ')

  return (
    <div style={{ borderBottom: '1px solid rgba(28,20,16,.04)' }}>
      {/* Hidden EPUB file input for re-extraction */}
      <input ref={epubRef} type="file" accept=".epub" className="hidden" onChange={handleEpubFile} />

      <div className="max-w-[1000px] mx-auto px-5 sm:px-10 py-6">
        <div className="flex gap-4 sm:gap-5 items-start">

          {/* ── Cover — atmospheric thumbnail, reduced ── */}
          <div
            className="flex-shrink-0 mt-1"
            style={{
              boxShadow: '0 2px 10px rgba(0,0,0,.13), 0 1px 3px rgba(0,0,0,.07)',
              borderRadius: 8,
            }}
          >
            <BookCover book={book} className="w-[50px] h-[75px]" rounded="rounded-[8px]" />
          </div>

          {/* ── Document column ── */}
          <div className="flex-1 min-w-0">

            {/* Title — document opening, no label above it */}
            <h1
              className="font-serif line-clamp-2"
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                color: 'var(--color-ink-900)',
                marginBottom: 5,
              }}
            >
              {book.title}
            </h1>

            {/* Author row + edit + stewardship menu */}
            {editingMeta ? (
              <div className="mb-3 space-y-2 animate-fade-in">
                <input
                  value={metaForm.title}
                  onChange={e => setMetaForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] text-ink-800 bg-cream-50"
                  placeholder="Title"
                />
                <input
                  value={metaForm.author}
                  onChange={e => setMetaForm(f => ({ ...f, author: e.target.value }))}
                  className="w-full border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] text-ink-800 bg-cream-50"
                  placeholder="Author"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {TEMPERAMENT_CONFIG.map(t => (
                    <button key={t.k}
                      onClick={() => setMetaForm(f => ({ ...f, temperament: f.temperament === t.k ? '' : t.k }))}
                      className="text-[11px] px-2.5 py-1 rounded-full border transition-all"
                      style={{
                        background:  metaForm.temperament === t.k ? 'var(--ca, #B8860B)' : '',
                        borderColor: metaForm.temperament === t.k ? 'var(--ca, #B8860B)' : '',
                        color:       metaForm.temperament === t.k ? 'white' : '',
                      }}>
                      {t.l}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingMeta(false)} className="text-[12px] text-ink-500 hover:text-ink-700 px-3 py-1.5 rounded-lg border border-ink-200 transition-colors">Cancel</button>
                  <button onClick={saveMeta} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white transition-colors" style={{ background:'var(--ca, #B8860B)' }}>Save</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <p
                  className="font-serif italic truncate"
                  style={{ fontSize: 14, color: 'var(--color-ink-500)' }}
                >
                  {book.author}
                </p>
                <button onClick={openEditMeta} className="text-[11px] text-ink-300 hover:text-ink-500 transition-colors italic py-1 px-0.5 flex-shrink-0">· edit</button>
                <div className="relative ml-auto flex-shrink-0" ref={menuRef}>
                  <button
                    onClick={() => { setMenuOpen(v => !v); setConfirmDelete(false) }}
                    aria-label="Manage companion"
                    className="text-ink-500 hover:text-ink-700 transition-colors p-2 rounded-lg hover:bg-ink-100">
                    <Ico.Dots />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-8 w-52 bg-cream-50 border border-ink-200 rounded-xl shadow-lg animate-fade-in z-20">
                      <div className="p-1.5">
                        <button onClick={openEditMeta}
                          className="w-full text-left text-[13px] text-ink-700 hover:bg-ink-100 px-3 py-2 rounded-lg transition-colors">
                          Edit
                        </button>
                        <button onClick={() => { handleExport(); setMenuOpen(false) }}
                          className="w-full text-left text-[13px] text-ink-700 hover:bg-ink-100 px-3 py-2 rounded-lg transition-colors">
                          Save a copy
                        </button>
                        {hasAiKey && (
                          <button onClick={handleReextractClick}
                            className="w-full text-left text-[13px] text-ink-700 hover:bg-ink-100 px-3 py-2 rounded-lg transition-colors">
                            ✦ Re-extract with Claude…
                          </button>
                        )}
                      </div>
                      <div className="border-t border-ink-100 mx-3" />
                      <div className="p-1.5">
                        {!confirmDelete ? (
                          <button onClick={() => setConfirmDelete(true)}
                            className="w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors hover:bg-ember-bg"
                            style={{ color:'var(--color-ember, #9B2335)' }}>
                            Remove companion…
                          </button>
                        ) : (
                          <div className="px-3 py-2 animate-fade-in">
                            <p className="text-[12px] text-ink-600 leading-relaxed mb-3">
                              This companion will be removed permanently — notes, threads, and all.
                            </p>
                            <div className="flex gap-2">
                              <button onClick={() => setConfirmDelete(false)}
                                className="text-[12px] text-ink-500 hover:text-ink-700 px-2.5 py-1.5 rounded-lg border border-ink-200 transition-colors">
                                Keep it
                              </button>
                              <button onClick={handleDelete}
                                className="text-[12px] font-semibold text-white px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                                style={{ background:'var(--color-ember, #9B2335)' }}>
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Series · reread count — quiet annotation, below author */}
            {metaAnnotation && !editingMeta && (
              <p
                className="italic mb-1"
                style={{ fontSize: 11, color: 'var(--color-ink-300)' }}
              >
                {metaAnnotation}
              </p>
            )}

            {/* ── Finished: post-completion afterimage / archival statement ── */}
            {/* Recently-finished books (≤ 30 days) show a quiet earned observation;  */}
            {/* older completions settle into the archival date line.                 */}
            {isFinished && (() => {
              const daysAgo    = book.completedAt
                ? Math.floor((Date.now() - new Date(book.completedAt).getTime()) / 86_400_000)
                : 9999
              const recentFinish = daysAgo <= 30
              const afterimage   = recentFinish ? generateCompletionAfterimageLine(book) : null
              return (
                <div className="mt-3">
                  <p className="italic" style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>
                    {afterimage ?? (book.completedAt ? fmtCompleted(book.completedAt) : 'The story is complete.')}
                  </p>
                  {recentFinish && daysAgo > 2 && book.completedAt && (
                    <p className="italic" style={{ fontSize: 11, color: 'var(--color-ink-300)', marginTop: 3 }}>
                      {fmtCompleted(book.completedAt)}
                    </p>
                  )}
                </div>
              )
            })()}

            {/* ── Reading gap archaeology — active book, unvisited for 7+ days ── */}
            {/* For books still marked "reading" but untouched for a week or more, */}
            {/* surface the last note as a quiet re-entry anchor. Not a prompt —   */}
            {/* just a thread to pick back up. Only shows if there are notes.      */}
            {isReading && !atEnd && !editingMeta && !pendingAction && (() => {
              const daysAway = book.lastUpdated
                ? Math.floor((Date.now() - new Date(book.lastUpdated).getTime()) / 86_400_000)
                : 0
              if (daysAway < 7) return null
              const lastNote = (book.notes || []).slice(-1)[0]
              if (!lastNote) return null
              const lastText = lastNote.text || ''
              // Most haunted unresolved mystery — only surface if gap ≥ 14 days and
              // there's a mystery with meaningful weight (avoids cluttering short gaps)
              const hauntedMystery = daysAway >= 14
                ? (book.mysteries || [])
                    .filter(m => !m.resolved)
                    .sort((a, b) => mysteryHauntScore(b, book) - mysteryHauntScore(a, book))
                    .find(m => mysteryHauntScore(m, book) >= 1.5)
                : null
              return (
                <div
                  className="animate-fade-in"
                  style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(28,20,16,.04)' }}
                >
                  <p
                    className="italic leading-relaxed"
                    style={{ fontSize: 11, color: 'var(--color-ink-300)', marginBottom: hauntedMystery ? 4 : 0 }}
                  >
                    "{lastText.length > 110 ? lastText.slice(0, 110) + '…' : lastText}"
                  </p>
                  {hauntedMystery && (
                    <p
                      className="italic"
                      style={{ fontSize: 11, color: 'var(--color-ink-300)', opacity: 0.72 }}
                    >
                      <span style={{ fontSize: 8, color: 'var(--ca, #B8860B)', opacity: 0.5, marginRight: 5 }}>✦</span>
                      {hauntedMystery.text.length > 85
                        ? hauntedMystery.text.slice(0, 85) + '…'
                        : hauntedMystery.text}
                    </p>
                  )}
                </div>
              )
            })()}

            {/* ── Abandoned archaeology — paused book, long silence ──────────── */}
            {/* When a paused book has been silent for 14+ days, quietly surface  */}
            {/* what was in motion when the reader set it down. Not a prompt to   */}
            {/* return — just archaeology. The story holding its place.           */}
            {isPaused && !editingMeta && !pendingAction && (() => {
              const daysAway = book.lastUpdated
                ? Math.floor((Date.now() - new Date(book.lastUpdated).getTime()) / 86_400_000)
                : 0
              if (daysAway < 14) return null

              const durationStr = daysAway >= 60
                ? `${Math.round(daysAway / 30)} months`
                : `${Math.round(daysAway / 7)} weeks`

              const lastNote        = (book.notes || []).slice(-1)[0]
              const lastNoteText    = lastNote?.text || ''
              // Sort unresolved mysteries by haunt score — surface the most haunted one specifically
              const openMysteriesArr = (book.mysteries || [])
                .filter(m => !m.resolved)
                .sort((a, b) => mysteryHauntScore(b, book) - mysteryHauntScore(a, book))
              const topMystery       = openMysteriesArr[0] ?? null
              const openCount        = openMysteriesArr.length

              return (
                <div
                  className="animate-fade-in"
                  style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(28,20,16,.05)' }}
                >
                  <p
                    className="italic"
                    style={{ fontSize: 11, color: 'var(--color-ink-400)', marginBottom: lastNote || openCount > 0 ? 5 : 0 }}
                  >
                    Set aside {durationStr} ago.
                  </p>
                  {lastNote && (
                    <p
                      className="italic leading-relaxed"
                      style={{
                        fontSize: 11,
                        color: 'var(--color-ink-300)',
                        marginBottom: openCount > 0 ? 4 : 0,
                      }}
                    >
                      "{lastNoteText.length > 110 ? lastNoteText.slice(0, 110) + '…' : lastNoteText}"
                    </p>
                  )}
                  {topMystery && (
                    <p
                      className="italic leading-relaxed"
                      style={{ fontSize: 11, color: 'var(--color-ink-300)', marginBottom: openCount > 1 ? 3 : 0 }}
                    >
                      "{topMystery.text.length > 90 ? topMystery.text.slice(0, 90) + '…' : topMystery.text}"
                    </p>
                  )}
                  {openCount > 1 && (
                    <p className="italic" style={{ fontSize: 11, color: 'var(--color-ink-300)' }}>
                      {openCount - 1} other {openCount - 1 === 1 ? 'thread' : 'threads'} still open.
                    </p>
                  )}
                </div>
              )
            })()}

            {/* ── Completion pathway — all chapters read, not yet marked finished ── */}
            {/* When atEnd, the "Continue" ritual gives way to a quiet completion    */}
            {/* ceremony. No confetti. No achievement. Just the story ending.        */}
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
                  className="transition-all"
                  style={{
                    fontFamily:    'var(--font-serif)',
                    fontSize:      15,
                    fontWeight:    400,
                    letterSpacing: '-0.01em',
                    color:         'var(--color-ink-700)',
                    padding:       '9px 20px',
                    border:        '1px solid var(--color-ink-200)',
                    borderRadius:  7,
                    background:    'transparent',
                    display:       'inline-flex',
                    alignItems:    'center',
                    gap:           10,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-ink-400)'; e.currentTarget.style.color = 'var(--color-ink-900)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-ink-200)'; e.currentTarget.style.color = 'var(--color-ink-700)' }}
                >
                  The story ends here
                  <span style={{ fontSize: 9, color: 'var(--ca, #B8860B)', opacity: 0.65 }}>✦</span>
                </button>
              </div>
            )}

            {/* ── Primary ritual action — progress update ─────────────────────── */}
            {/* This is the central ritual of Lantern. Elevated in hierarchy above  */}
            {/* lifecycle actions. Not a button — a ceremonial anchor.              */}
            {(isReading || isPaused) && !atEnd && !editingMeta && !pendingAction && (
              <div className="mt-4">
                <button
                  onClick={onOpenUpdate}
                  className="transition-all"
                  style={{
                    fontFamily:    'var(--font-serif)',
                    fontSize:      15,
                    fontWeight:    400,
                    letterSpacing: '-0.01em',
                    color:         'var(--color-ink-700)',
                    padding:       '9px 20px',
                    border:        '1px solid var(--color-ink-200)',
                    borderRadius:  7,
                    background:    'transparent',
                    display:       'inline-flex',
                    alignItems:    'center',
                    gap:           8,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-ink-400)'; e.currentTarget.style.color = 'var(--color-ink-900)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-ink-200)'; e.currentTarget.style.color = 'var(--color-ink-700)' }}
                >
                  {isPaused
                    ? `Return to chapter ${book.currentChapter || 1}`
                    : (book.readingLog?.length ?? 0) === 0
                      ? 'Begin your first chapter'
                      : book.currentChapter > 0
                        ? `Continue from chapter ${book.currentChapter}`
                        : 'Begin your first chapter'}
                  <span style={{ fontSize: 13, color: 'var(--color-ink-400)' }}>→</span>
                </button>
              </div>
            )}

            {/* ── Confirm dialog — surfaces whenever an action awaits confirmation ── */}
            {/* Decoupled from actions.length so it renders even when atEnd clears  */}
            {/* the action list (completion pathway uses setPendingAction directly). */}
            {pendingAction && CONFIRM[pendingAction] && !editingMeta && (
              <div className="mt-3 animate-fade-in">
                <p className="text-[12px] text-ink-600 italic mb-3 leading-relaxed">
                  {CONFIRM[pendingAction].body}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPendingAction(null)}
                    className="text-[12px] text-ink-600 hover:text-ink-800 px-3 py-1.5 rounded-lg border border-ink-200 transition-colors">
                    {CONFIRM[pendingAction].cancel}
                  </button>
                  <button onClick={() => { performAction(pendingAction); setPendingAction(null) }}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-lg btn-accent">
                    {CONFIRM[pendingAction].ok}
                  </button>
                </div>
              </div>
            )}

            {/* ── Lifecycle actions — secondary register ─────────────────────── */}
            {/* These are subordinate to the ritual action above.                 */}
            {actions.length > 0 && !pendingAction && !editingMeta && (
              <div className="mt-3">
                <div className="flex items-center flex-wrap">
                  {actions.map((a, i) => (
                    <span key={a.key} className="flex items-center">
                      {i > 0 && (
                        <span className="text-ink-200 mx-2 select-none text-[11px]" aria-hidden="true">·</span>
                      )}
                      <button
                        onClick={() => a.confirm ? setPendingAction(a.key) : performAction(a.key)}
                        className="text-[11px] italic transition-colors text-ink-400 hover:text-ink-600">
                        {a.label}
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Reading momentum — ambient pacing awareness ── */}
            {!isFinished && <ReadingMomentum book={book} />}

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

          </div>
        </div>
      </div>
    </div>
  )
}
