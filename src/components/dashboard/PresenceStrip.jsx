import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal }               from 'react-dom'
import { generatePresence, generatePresenceDebug } from '../../utils/companionPresence.js'
import { generateCompanionReflections }             from '../../utils/aiExtractor.js'
import {
  assembleReflectionContext,
  hashContext,
  shouldRegenerate,
  generateRuleBasedReflections,
  getActiveReflections,
  markReflectionSurfaced,
} from '../../utils/reflectionEngine.js'
import { computePresenceVisibility, shouldYieldToBook } from '../../utils/invisiblePresence.js'
import { uid } from '../../utils/uid.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useBooks }    from '../../context/BooksContext.jsx'

const today = () => new Date().toISOString().split('T')[0]

const DESTS = [
  { k: 'note',    l: 'Note',    tag: 'theme'  },
  { k: 'theory',  l: 'Theory',  tag: 'theory' },
  { k: 'mystery', l: 'Mystery', tag: null     },
]

function CompanionDebugPanel({ book, settings }) {
  const debug = useMemo(
    () => generatePresenceDebug(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.id, book.currentChapter, book.notes?.length, book.mysteries?.length,
     book.readingLog?.length, settings.insightStyle]
  )
  return (
    <div style={{
      position: 'fixed', bottom: 12, right: 12, zIndex: 9997,
      background: 'rgba(10,26,30,.92)', color: '#8ECFBA',
      borderRadius: 8, padding: '10px 14px', fontSize: 11,
      fontFamily: 'monospace', maxWidth: 320, lineHeight: 1.5,
      border: '1px solid rgba(100,180,160,.3)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{ color: '#B8D4B0', fontWeight: 700, marginBottom: 6, fontSize: 10, letterSpacing: '0.08em' }}>
        ✦ COMPANION DEBUG
      </div>
      <div><span style={{ color: '#6AAFB0' }}>visibility</span> {debug.visibility} → eff. {debug.effectiveVisibility}</div>
      <div><span style={{ color: '#6AAFB0' }}>cap</span> {debug.cap} &nbsp;<span style={{ color: '#6AAFB0' }}>surfaced</span> {debug.surfacedCount}</div>
      <div><span style={{ color: '#6AAFB0' }}>interrupt</span> {debug.interruptionRisk} &nbsp;<span style={{ color: '#6AAFB0' }}>gravity↓</span> {debug.gravityPressure}</div>
      <div><span style={{ color: '#6AAFB0' }}>narr.dom</span> {debug.narrativeDominance} &nbsp;<span style={{ color: '#6AAFB0' }}>pct</span> {debug.pct}%</div>
      <div style={{ marginTop: 4, color: debug.atmosphereMode ? '#F0B84A' : '#6AAFB0' }}>
        {debug.atmosphereMode ? '⬡ atmosphere mode' : debug.yieldsToBook ? '⬡ yields to book' : debug.solitudeProtected ? '⬡ solitude protected' : '● active'}
        {debug.selfSustaining && <span style={{ color: '#C0A060' }}> · self-sustaining</span>}
      </div>
      <div style={{ marginTop: 6, borderTop: '1px solid rgba(100,180,160,.2)', paddingTop: 6 }}>
        {debug.surfaced.map((s, i) => (
          <div key={i} style={{ color: i === 0 ? '#D4C8A8' : '#8ECFBA', marginBottom: 2 }}>
            {i === 0 ? '↳ arc' : `↳ obs ${i}`}: {s.slice(0, 52)}{s.length > 52 ? '…' : ''}
          </div>
        ))}
        {debug.surfaced.length === 0 && <div style={{ color: '#705040' }}>— no observations surfaced</div>}
      </div>
    </div>
  )
}

export default function PresenceStrip({ book, onUpdateBook }) {
  const { settings }   = useSettings()
  const { updateBook } = useBooks()

  const [idx,     setIdx]     = useState(0)
  const [fade,    setFade]    = useState(true)
  const [open,    setOpen]    = useState(false)
  const [text,    setText]    = useState('')
  const [dest,    setDest]    = useState('note')
  const inputRef              = useRef()

  const debugMode = typeof window !== 'undefined' &&
    localStorage.getItem('lantern_debug_companion') === '1'

  // ── Presence visibility ─────────────────────────────────────────────────────
  const presenceVisibility = useMemo(
    () => computePresenceVisibility(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.notes?.length, book.readingLog?.length,
     book.rereadCount, settings.insightStyle]
  )
  const devMode          = !!settings.devMode
  const deepFaded        = presenceVisibility < 0.40
  const faded            = presenceVisibility < 0.65
  // devMode: always-on 3s carousel for testing; otherwise normal presence-weighted intervals
  const carouselInterval = devMode ? 3000 : deepFaded ? null : faded ? 18000 : 12000
  // devMode: full opacity so companion is always visible during testing
  const stripOpacity     = devMode ? 1.0 : presenceVisibility < 0.40 ? 0.45 : presenceVisibility < 0.65 ? 0.68 : 1.0

  // ── Narrative yield ──────────────────────────────────────────────────────────
  const yieldsToBook = useMemo(
    () => shouldYieldToBook(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.notes?.length, book.readingLog?.length,
     book.rereadCount, book.mysteries?.length, settings.insightStyle]
  )

  const surfacedThisSessionRef = useRef(new Set())
  const reflectionCacheRef     = useRef(book.reflectionCache)
  useEffect(() => { reflectionCacheRef.current = book.reflectionCache }, [book.reflectionCache])

  // ── Presence observations ───────────────────────────────────────────────────
  const presence = useMemo(
    () => generatePresence(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.mysteries?.length, book.notes?.length, book.chapters,
     book.readingLog?.length, book.characters?.main?.length,
     settings.spoilerMode, settings.insightStyle]
  )

  // ── Cached reflections ──────────────────────────────────────────────────────
  const cachedReflections = useMemo(
    () => getActiveReflections(book, 1, devMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.reflectionCache?.contextHash, book.reflectionCache?.reflections?.length, devMode]
  )

  // ── Combined pool ───────────────────────────────────────────────────────────
  const { observations, reflectionIndexMap } = useMemo(() => {
    const map = {}
    if (!cachedReflections.length) return { observations: presence, reflectionIndexMap: map }
    const pool = [...presence]
    if (cachedReflections[0] && pool.length >= 1) {
      const pos = Math.min(1, pool.length)
      pool.splice(pos, 0, cachedReflections[0].text)
      map[pos] = cachedReflections[0].id
    }
    return { observations: pool.filter(Boolean), reflectionIndexMap: map }
  }, [presence, cachedReflections])

  // ── Reflection generation ───────────────────────────────────────────────────
  useEffect(() => {
    const ctx  = assembleReflectionContext(book, settings)
    if (ctx.noteCount < 3 && ctx.openMysteries.length < 2) return
    const hash = hashContext(ctx)
    if (!shouldRegenerate(book, hash)) return
    const ruleReflections = generateRuleBasedReflections(ctx, settings.insightStyle)
    if (!ruleReflections.length) return
    updateBook(book.id, {
      reflectionCache: { contextHash: hash, generatedAt: new Date().toISOString(), reflections: ruleReflections, aiEnhanced: false },
    })
    if (settings.anthropicKey?.trim() && ctx.noteCount >= 5) {
      Promise.resolve()
        .then(() => generateCompanionReflections(ctx, settings.anthropicKey))
        .then(aiReflections => {
          if (!aiReflections?.length) return
          updateBook(book.id, {
            reflectionCache: { contextHash: hash, generatedAt: new Date().toISOString(), reflections: [...aiReflections, ...ruleReflections], aiEnhanced: true },
          })
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, book.notes?.length, book.currentChapter, book.readingLog?.length, book.mysteries?.length, settings.insightStyle])

  // ── Mark reflections surfaced ───────────────────────────────────────────────
  useEffect(() => {
    const reflId = reflectionIndexMap[idx]
    if (!reflId) return
    if (surfacedThisSessionRef.current.has(reflId)) return
    surfacedThisSessionRef.current.add(reflId)
    const cache = reflectionCacheRef.current
    if (!cache?.reflections?.length) return
    const updated = markReflectionSurfaced(cache.reflections, reflId)
    updateBook(book.id, { reflectionCache: { ...cache, reflections: updated } })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, reflectionIndexMap, book.id, updateBook])

  // ── Auto-advance carousel ───────────────────────────────────────────────────
  // Recursive setTimeout instead of setInterval — adds ±1.5s jitter per rotation
  // so the cadence feels environmental rather than mechanical.
  useEffect(() => {
    if (observations.length < 2 || open) return
    if (!carouselInterval) return
    let timer
    const advance = () => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i + 1) % observations.length); setFade(true) }, 300)
      const jitter = Math.floor(Math.random() * 3000) - 1500
      timer = setTimeout(advance, carouselInterval + jitter)
    }
    const initJitter = Math.floor(Math.random() * 3000) - 1500
    timer = setTimeout(advance, carouselInterval + initJitter)
    return () => clearTimeout(timer)
  }, [observations.length, carouselInterval, open])

  // Focus input when form opens
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  const hasObservation = observations.length > 0 && !yieldsToBook
  const obs = hasObservation ? observations[idx] : null

  const submit = () => {
    const t = text.trim()
    if (!t) return
    if (dest === 'mystery') {
      onUpdateBook({
        mysteries: [...(book.mysteries || []), {
          id: uid('myst_'),
          text: t,
          status: 'open',
          chapter: book.currentChapter || 1,
          resolved: false,
          rereadEra: book.rereadCount || 0,
        }],
      })
    } else {
      onUpdateBook({
        notes: [...(book.notes || []), {
          id: uid('n_'),
          text: t,
          tag: dest === 'theory' ? 'theory' : 'theme',
          date: today(),
          chapter: book.currentChapter,
          rereadEra: book.rereadCount || 0,
        }],
      })
    }
    setText('')
    setOpen(false)
  }

  return (
    <>
      {debugMode && createPortal(<CompanionDebugPanel book={book} settings={settings} />, document.body)}

      <div
        className="presence-strip-wrapper"
        style={{ opacity: stripOpacity, transition: 'opacity 1200ms ease' }}
      >
        <div
          className="max-w-[1000px] mx-auto px-5 sm:px-10"
          style={{ paddingTop: 9, paddingBottom: open ? 14 : 9 }}
        >
          {/* ── Main row ── */}
          <div className="flex items-center gap-4 min-h-[22px]">

            {/* Left: ✦ + observation */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span
                className="flex-shrink-0 leading-none companion-spark"
                style={{
                  fontSize: 8,
                  color: 'var(--color-gold-accent)',
                  opacity: obs ? 0.55 : 0.18,
                  transition: 'opacity 600ms ease',
                }}
              >✦</span>
              <p
                className="font-serif italic truncate"
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: obs ? 'var(--color-text-dim)' : 'var(--color-ink-300)',
                  opacity: fade ? 1 : 0,
                  transition: 'opacity 300ms ease',
                }}
              >
                {obs || 'The companion is quiet.'}
              </p>
            </div>

            {/* Right: Add a thought */}
            {!open && (
              <button
                onClick={() => setOpen(true)}
                className="flex-shrink-0 font-serif italic transition-opacity hover:opacity-80"
                style={{ fontSize: 11, color: 'var(--color-text-dim)' }}
              >
                leave a mark…
              </button>
            )}
          </div>

          {/* ── Capture form ── */}
          {open && (
            <div className="mt-3 animate-fade-in">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                  if (e.key === 'Escape') { setOpen(false); setText('') }
                }}
                placeholder="A thought, question, or thread…"
                rows={2}
                className="w-full resize-none outline-none placeholder-ink-300 leading-relaxed"
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                  background: 'transparent',
                  borderBottom: '1px solid var(--color-ink-100)',
                  paddingBottom: 8,
                  marginBottom: 10,
                }}
              />
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {DESTS.map(d => (
                    <button
                      key={d.k}
                      onClick={() => setDest(d.k)}
                      className="transition-all"
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: dest === d.k ? 'var(--color-gold-accent)' : 'transparent',
                        color: dest === d.k ? 'white' : 'var(--color-text-dim)',
                        border: dest === d.k ? '1px solid transparent' : '1px solid var(--color-ink-200)',
                      }}
                    >
                      {d.l}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    onClick={() => { setOpen(false); setText('') }}
                    className="transition-opacity hover:opacity-75"
                    style={{ fontSize: 11, color: 'var(--color-text-dim)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    className="font-medium transition-opacity hover:opacity-75"
                    style={{ fontSize: 11, color: 'var(--color-gold-accent)' }}
                  >
                    Keep →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
