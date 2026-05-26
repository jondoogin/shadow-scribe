import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { generatePresence, generatePresenceDebug } from '../../utils/companionPresence.js'
import { generateCompanionReflections }          from '../../utils/aiExtractor.js'
import {
  assembleReflectionContext,
  hashContext,
  shouldRegenerate,
  generateRuleBasedReflections,
  getActiveReflections,
  markReflectionSurfaced,
} from '../../utils/reflectionEngine.js'
import { computePresenceVisibility, shouldYieldToBook } from '../../utils/invisiblePresence.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useBooks }    from '../../context/BooksContext.jsx'
import { isMysteryVisible, getEffectiveMode } from '../../utils/spoiler.js'

// ── Secondary tension signal ──────────────────────────────────────────────────
// Derives the most emotionally charged unresolved signal from the book.
// Quotes specific reader text where possible for companion familiarity.
// Returns a string or null.

function deriveSecondarySignal(book, settings) {
  const mode       = getEffectiveMode(book, settings)
  const notes      = book.notes      || []
  const mysteries  = book.mysteries  || []
  const currentCh  = book.currentChapter || 0
  const log        = book.readingLog  || []

  function shorten(text, max = 50) {
    if (!text) return ''
    return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
  }

  // 1. Actively suspected mysteries — deepening suspicion (momentum-first)
  const openMyst = mysteries.filter(m => !m.resolved && isMysteryVisible(book, m, mode))
  const suspected = openMyst.filter(m => m.status === 'suspected' && m.chapter && (currentCh - m.chapter) >= 4)
  if (suspected.length >= 2) {
    return `${suspected.length} threads are still circling toward answers without reaching them.`
  }
  if (suspected.length === 1) {
    const age = currentCh - (suspected[0].chapter || 0)
    const txt = suspected[0].text
    if (age >= 8) {
      if (txt && txt.length <= 55) return `"${shorten(txt, 55)}" — your suspicion keeps deepening.`
      return `A suspicion from ch. ${suspected[0].chapter || 1} keeps deepening — ${age} chapters on.`
    }
  }

  // 2. Evolving mysteries — still in motion
  const evolving = openMyst.filter(m => m.status === 'evolving' && m.chapter && (currentCh - m.chapter) >= 4)
  if (evolving.length >= 2) {
    return `${evolving.length} threads keep changing shape. The story hasn't settled them.`
  }
  if (evolving.length === 1) {
    const txt = evolving[0].text
    if (txt && txt.length <= 55) return `"${shorten(txt, 55)}" — keeps reframing itself.`
    return "One question keeps changing shape as you read. It hasn't settled."
  }

  // 3. Long-open mystery — quote the specific thread when short enough
  const lingering = openMyst
    .filter(m => m.chapter && (currentCh - m.chapter) >= 7)
    .sort((a, b) => (a.chapter || 0) - (b.chapter || 0))
  if (lingering.length >= 2) {
    return `${lingering.length} threads from early on are still pulling.`
  }
  if (lingering.length === 1) {
    const age = currentCh - (lingering[0].chapter || 0)
    const txt = lingering[0].text
    if (txt && txt.length <= 60) {
      return `"${txt}" — ${age} chapters and still circling.`
    }
    return `"${shorten(txt, 48)}" — still in motion, ${age} chapters on.`
  }

  // 4. Active mystery without reader observation
  const unwatched = openMyst.filter(m => !m.observation && m.chapter && (currentCh - m.chapter) >= 4)
  if (unwatched.length >= 1) {
    const txt = unwatched[0].text
    if (unwatched.length === 1 && txt && txt.length <= 55) {
      return `"${txt}" — the story keeps carrying this.`
    }
    return `${unwatched.length === 1 ? 'A question' : `${unwatched.length} questions`} the story hasn't addressed yet.`
  }

  // 5. Theory notes — movement-first language
  const theoryNotes = notes.filter(n => n.tag === 'theory')
  if (theoryNotes.length >= 2) {
    const latest = theoryNotes[theoryNotes.length - 1]
    const revised = theoryNotes.filter(n => n.revisedAt)
    if (revised.length >= 2) {
      if (latest.text.length <= 55) return `"${latest.text}" — still shifting.`
      return "Several of your theories have been revised. The story keeps pushing back."
    }
    if (latest.text.length <= 55) return `"${latest.text}" — still forming.`
    return "Your theories are accumulating. Something is being worked out."
  }

  // 6. Confusing notes without resolution
  const confusingNotes = notes.filter(n => n.tag === 'confusing')
  if (confusingNotes.length >= 3 && theoryNotes.length < 2) {
    return "Several passages keep resisting explanation. The story may be deliberate about this."
  }

  // 7. Return after a gap
  const lastDate = [...(log.map(e => (typeof e === 'object' ? e.date : e)))].sort().pop()
  if (lastDate) {
    const gapDays = Math.floor((Date.now() - new Date(lastDate)) / 86400000)
    if (gapDays > 30) return "The story has been waiting. Everything in it still holds."
    if (gapDays > 14) return "Some time away from this. The threads are still live."
    if (gapDays > 7)  return "A week since your last session. The story hasn't moved on."
  }

  return null
}

// ── Debug panel ───────────────────────────────────────────────────────────────
// Visible only when localStorage.getItem('lantern_debug_companion') === '1'
// Toggle in console: localStorage.setItem('lantern_debug_companion','1') / removeItem(...)

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
      border: '1px solid rgba(100,180,160,.3)',
      backdropFilter: 'blur(8px)',
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

export default function CompanionInsights({ book }) {
  const { settings }   = useSettings()
  const { updateBook } = useBooks()

  const [idx,  setIdx]  = useState(0)
  const [fade, setFade] = useState(true)

  // Debug mode — portal renders to body, escaping any sm:hidden parent
  const debugMode = typeof window !== 'undefined' &&
    localStorage.getItem('lantern_debug_companion') === '1'

  // ── Presence visibility ────────────────────────────────────────────────────
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
  const stripOpacity     = devMode ? 1.0 : presenceVisibility < 0.40 ? 0.50 : presenceVisibility < 0.65 ? 0.72 : 1.0

  // ── Narrative yield guard ──────────────────────────────────────────────────
  const yieldsToBook = useMemo(
    () => shouldYieldToBook(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.notes?.length, book.readingLog?.length,
     book.rereadCount, book.mysteries?.length, settings.insightStyle]
  )

  const surfacedThisSessionRef = useRef(new Set())
  const reflectionCacheRef     = useRef(book.reflectionCache)
  useEffect(() => { reflectionCacheRef.current = book.reflectionCache }, [book.reflectionCache])

  // ── Presence observations ─────────────────────────────────────────────────
  const presence = useMemo(
    () => generatePresence(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.mysteries?.length, book.notes?.length, book.chapters,
     book.readingLog?.length, book.characters?.main?.length,
     settings.spoilerMode, settings.insightStyle]
  )

  // ── Secondary tension signal ───────────────────────────────────────────────
  // Only when there's enough reading context and the companion isn't fading
  const secondarySignal = useMemo(
    () => (book.notes?.length >= 1 || book.mysteries?.length >= 1)
      ? deriveSecondarySignal(book, settings)
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.notes?.length, book.mysteries?.length, book.currentChapter,
     book.readingLog?.length, settings.insightStyle]
  )

  // ── Cached reflections ─────────────────────────────────────────────────────
  // One reflection only — it earns its position rather than crowding the carousel
  const cachedReflections = useMemo(
    () => getActiveReflections(book, 1, devMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.reflectionCache?.contextHash, book.reflectionCache?.reflections?.length, devMode]
  )

  // ── Combined pool ─────────────────────────────────────────────────────────
  // Inject the best reflection at position 1 (after the arc observation)
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

  // ── Reflection generation ─────────────────────────────────────────────────
  useEffect(() => {
    const ctx  = assembleReflectionContext(book, settings)
    if (ctx.noteCount < 3 && ctx.openMysteries.length < 2) return

    const hash = hashContext(ctx)
    if (!shouldRegenerate(book, hash)) return

    const ruleReflections = generateRuleBasedReflections(ctx, settings.insightStyle)
    if (!ruleReflections.length) return

    updateBook(book.id, {
      reflectionCache: {
        contextHash:  hash,
        generatedAt:  new Date().toISOString(),
        reflections:  ruleReflections,
        aiEnhanced:   false,
      },
    })

    if (settings.anthropicKey?.trim() && ctx.noteCount >= 5) {
      Promise.resolve()
        .then(() => generateCompanionReflections(ctx, settings.anthropicKey))
        .then(aiReflections => {
          if (!aiReflections?.length) return
          updateBook(book.id, {
            reflectionCache: {
              contextHash:  hash,
              generatedAt:  new Date().toISOString(),
              reflections:  [...aiReflections, ...ruleReflections],
              aiEnhanced:   true,
            },
          })
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, book.notes?.length, book.currentChapter, book.readingLog?.length,
      book.mysteries?.length, settings.insightStyle])

  // ── Mark reflections surfaced ─────────────────────────────────────────────
  useEffect(() => {
    const reflId = reflectionIndexMap[idx]
    if (!reflId) return
    if (surfacedThisSessionRef.current.has(reflId)) return
    surfacedThisSessionRef.current.add(reflId)
    const cache = reflectionCacheRef.current
    if (!cache?.reflections?.length) return
    const updated = markReflectionSurfaced(cache.reflections, reflId)
    updateBook(book.id, {
      reflectionCache: { ...cache, reflections: updated },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, reflectionIndexMap, book.id, updateBook])

  // ── Auto-advance carousel ─────────────────────────────────────────────────
  // Recursive setTimeout instead of setInterval — adds ±1.5s jitter per rotation
  // so the cadence feels environmental rather than mechanical.
  useEffect(() => {
    if (observations.length < 2) return
    if (!carouselInterval) return
    let timer
    const advance = () => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i + 1) % observations.length); setFade(true) }, 280)
      const jitter = Math.floor(Math.random() * 3000) - 1500
      timer = setTimeout(advance, carouselInterval + jitter)
    }
    const initJitter = Math.floor(Math.random() * 3000) - 1500
    timer = setTimeout(advance, carouselInterval + initJitter)
    return () => clearTimeout(timer)
  }, [observations.length, carouselInterval])

  if (!observations.length || yieldsToBook) return null

  // Show secondary signal whenever available — it adds unresolved tension context regardless of slot
  const showSecondary = secondarySignal && !deepFaded

  return (
    <>
    {debugMode && createPortal(
      <CompanionDebugPanel book={book} settings={settings} />,
      document.body
    )}
    <div
      className="companion-presence-zone"
      style={{ opacity: stripOpacity, transition: 'opacity 1200ms ease' }}
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-6 flex items-start gap-3">
        <span
          className="text-[10px] flex-shrink-0 mt-[3px] companion-spark"
          style={{ color: 'var(--ca, #B8860B)' }}
        >✦</span>
        <div className="flex-1 min-w-0">
          {/* Primary — arc/continuity/reflection */}
          <p
            className="text-[14px] text-ink-600 italic leading-relaxed font-serif"
            style={{ opacity: fade ? 1 : 0, transition: 'opacity 420ms ease' }}
          >
            {observations[idx]}
          </p>
          {/* Secondary — active tension signal */}
          {showSecondary && (
            <p
              className="text-[11.5px] text-ink-400 mt-1.5 leading-relaxed"
              style={{ opacity: fade ? 0.9 : 0, transition: 'opacity 420ms ease 80ms' }}
            >
              {secondarySignal}
            </p>
          )}
        </div>
        {observations.length > 2 && (
          <div className="flex gap-1.5 flex-shrink-0 mt-1">
            {observations.map((_, i) => (
              <button
                key={i}
                onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true) }, 280) }}
                className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                style={{ background: i === idx ? 'var(--ca, #B8860B)' : 'var(--color-ink-200)' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
