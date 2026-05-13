import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BookCover from '../shared/BookCover.jsx'
import StatusBadge from '../shared/StatusBadge.jsx'
import ProgressBar from '../shared/ProgressBar.jsx'
import WeightedProgressBar from '../shared/WeightedProgressBar.jsx'
import ReadingMomentum from './ReadingMomentum.jsx'
import { Ico } from '../shared/icons.jsx'
import { getProgress } from '../../utils/progress.js'
import { getChapterLabel } from '../../utils/chapterHelpers.js'
import { MOOD_CONFIG } from '../../data/config.js'
import { fmtDate } from '../../utils/date.js'
import { useBooks } from '../../context/BooksContext.jsx'

const TEMPERAMENT_CONFIG = [
  { k: 'curious',      l: 'Curious',      d: 'Notices and wonders'       },
  { k: 'analytical',   l: 'Analytical',   d: 'Finds structure in story'  },
  { k: 'emotional',    l: 'Emotional',    d: 'Feels the current'         },
  { k: 'imaginative',  l: 'Imaginative',  d: 'Reads between the lines'   },
  { k: 'quiet',        l: 'Quiet',        d: 'Still, watchful'           },
  { k: 'searching',    l: 'Searching',    d: 'Looking for something'     },
]

const MOODS = Object.keys(MOOD_CONFIG)
const RING_GAP = '#FFFDF9'

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
    body:   'Begin reading again? Your notes, reflections, and mysteries will stay with you.',
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
  const activeMood   = book.mood || 'gold'
  const rereadCount  = book.rereadCount || 0
  const navigate     = useNavigate()
  const { deleteBook } = useBooks()

  const [hoveredMood,   setHoveredMood]   = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingMeta,   setEditingMeta]   = useState(false)
  const [metaForm,      setMetaForm]      = useState({ title: book.title, author: book.author, temperament: book.temperament || '' })
  const menuRef = useRef()
  const displayMood = hoveredMood || activeMood

  // Close stewardship menu on outside click
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
    a.click(); URL.revokeObjectURL(url)
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
      onUpdateBook({
        status: 'reading',
        currentChapter: 0,
        chapters: book.chapters.map(c => ({ ...c, completed: false })),
        lastUpdated: today,
        restartedAt: today,
        rereadCount: rereadCount + 1,
      })
      return
    }
    if (action === 'archive') { onUpdateBook({ archived: true, lastUpdated: today }) }
  }

  // Context-sensitive lifecycle actions
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
    actions.push({ key: 'pause',   label: 'put this aside',         confirm: false })
    actions.push({ key: 'finish',  label: atEnd ? 'the story ends here ✦' : 'mark as finished', confirm: true })
  } else if (isWant) {
    actions.push({ key: 'begin',   label: 'begin reading',          confirm: false })
  }

  return (
    <div className="bg-cream-50 border-b border-ink-200">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-6">
        <div className="flex gap-5 items-start">
          <div className="flex-shrink-0" style={{ boxShadow:'var(--shadow-panel)', borderRadius:12 }}>
            <BookCover book={book} className="w-[76px] h-[114px]" rounded="rounded-xl" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl font-bold text-ink-900 leading-tight mb-0.5 line-clamp-2">{book.title}</h1>

            {/* ── Author row: name · edit · ··· menu ── */}
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
              <div className="flex items-center gap-1.5 mb-3">
                <p className="text-[13px] text-ink-500">{book.author}</p>
                <button onClick={openEditMeta} className="text-[11px] text-ink-300 hover:text-ink-500 transition-colors italic py-1 px-0.5">· edit</button>
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
                          Edit companion
                        </button>
                        <button onClick={() => { handleExport(); setMenuOpen(false) }}
                          className="w-full text-left text-[13px] text-ink-700 hover:bg-ink-100 px-3 py-2 rounded-lg transition-colors">
                          Export companion
                        </button>
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

            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={book.status} />
              {book.series && (
                <span className="text-[11px] text-ink-400">{book.series.name} #{book.series.position}</span>
              )}
              {rereadCount > 0 && (
                <span className="text-[11px] text-ink-300 italic">{ordinal(rereadCount + 1)} reading</span>
              )}
            </div>

            <div className="mt-4 space-y-2 max-w-sm">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-500">
                  {(() => {
                    const ch = book.chapters?.find(c => c.num === book.currentChapter)
                    return ch ? getChapterLabel(ch, book.format) : `${book.format === 'audiobook' ? 'Part' : 'Chapter'} ${book.currentChapter}`
                  })()} of {book.totalChapters}
                </span>
                <span className="font-bold tabular-nums" style={{ color:'var(--ca, #B8860B)' }}>{pct}%</span>
              </div>
              <WeightedProgressBar book={book} height="h-2" />
              {book.series?.total > 0 && (
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] text-ink-400 mb-1.5">
                    <span>Series progress</span>
                    <span>Book {book.series.position} of {book.series.total}</span>
                  </div>
                  <ProgressBar value={(book.series.position / book.series.total) * 100} color="sage" height="h-1" />
                </div>
              )}
            </div>

            {/* ── Active: update button + momentum ── */}
            {!isFinished ? (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={onOpenUpdate}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-semibold transition-all hover:text-white"
                    style={{
                      color:'var(--ca, #B8860B)',
                      background:'var(--ca-bg, #FDF8EC)',
                      borderColor:'var(--ca-border, #E8D090)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='var(--ca, #B8860B)'; e.currentTarget.style.color='white' }}
                    onMouseLeave={e => { e.currentTarget.style.background='var(--ca-bg, #FDF8EC)'; e.currentTarget.style.color='var(--ca, #B8860B)' }}
                  >
                    <Ico.Refresh /> Tell the companion where you are
                  </button>
                </div>
                <ReadingMomentum book={book} />
              </>
            ) : (
              // ── Finished: quiet completion statement ──
              <div className="mt-4">
                <p className="text-[12px] text-ink-400 italic">
                  {book.completedAt ? fmtCompleted(book.completedAt) : 'The story is complete.'}
                </p>
              </div>
            )}

            {/* ── Mood selector ── */}
            <div className="mt-4 pt-3 border-t border-ink-100">
              <div className="flex items-center gap-2 flex-wrap">
                {MOODS.map(m => {
                  const cfg      = MOOD_CONFIG[m]
                  const isActive = m === activeMood
                  const isHov    = hoveredMood === m
                  return (
                    <button
                      key={m}
                      onClick={() => onUpdateBook({
                        mood: m,
                        coverBg: `linear-gradient(160deg,${MOOD_CONFIG[m].color}CC 0%,${MOOD_CONFIG[m].color}66 100%)`,
                      })}
                      onMouseEnter={() => setHoveredMood(m)}
                      onMouseLeave={() => setHoveredMood(null)}
                      aria-label={cfg.label}
                      aria-pressed={isActive}
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 transition-all duration-200"
                      style={{
                        background: cfg.color,
                        boxShadow: isActive || isHov
                          ? `0 0 0 1.5px ${RING_GAP}, 0 0 0 3px ${cfg.ring}`
                          : 'none',
                        opacity: hoveredMood && !isHov && !isActive ? 0.3 : 1,
                        transform: isHov && !isActive ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  )
                })}
                <span
                  className="text-[11px] text-ink-400 italic ml-0.5 select-none"
                  style={{ transition: 'opacity 0.18s ease', opacity: hoveredMood ? 0.85 : 0.45 }}
                >
                  {MOOD_CONFIG[displayMood]?.descriptor}
                </span>
              </div>
            </div>

            {/* ── Lifecycle actions ── */}
            {actions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-ink-100">
                {pendingAction && CONFIRM[pendingAction] ? (
                  <div className="animate-fade-in">
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
                ) : (
                  <div className="flex items-center flex-wrap">
                    {actions.map((a, i) => (
                      <span key={a.key} className="flex items-center">
                        {i > 0 && (
                          <span className="text-ink-200 mx-2 select-none text-[11px]" aria-hidden="true">·</span>
                        )}
                        <button
                          onClick={() => a.confirm ? setPendingAction(a.key) : performAction(a.key)}
                          className={`text-[11px] italic transition-colors ${
                            a.key === 'finish' && atEnd
                              ? 'text-ink-600 hover:text-ink-800'
                              : 'text-ink-400 hover:text-ink-600'
                          }`}>
                          {a.label}
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
