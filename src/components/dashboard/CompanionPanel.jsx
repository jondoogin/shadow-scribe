import { useState, useEffect, useMemo, useRef } from 'react'
import { generatePresence }                      from '../../utils/companionPresence.js'
import { generateCompanionReflections }          from '../../utils/aiExtractor.js'
import {
  assembleReflectionContext,
  hashContext,
  shouldRegenerate,
  generateRuleBasedReflections,
  getActiveReflections,
  markReflectionSurfaced,
  suppressReflection,
  deduplicateReflections,
  isReflectionPoolSaturated,
} from '../../utils/reflectionEngine.js'
import { computePresenceVisibility, shouldYieldToBook } from '../../utils/invisiblePresence.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useBooks }    from '../../context/BooksContext.jsx'
import { isMysteryVisible, getEffectiveMode } from '../../utils/spoiler.js'
import { mysteryHauntScore, hauntLevel }       from '../../utils/hauntScore.js'

// ── Secondary tension signal (from CompanionInsights logic) ──────────────────
function deriveSecondarySignal(book, settings) {
  const mode      = getEffectiveMode(book, settings)
  const notes     = book.notes     || []
  const mysteries = book.mysteries || []
  const currentCh = book.currentChapter || 0
  const log       = book.readingLog || []

  function shorten(text, max = 50) {
    return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
  }

  const openMyst   = mysteries.filter(m => !m.resolved && isMysteryVisible(book, m, mode))
  const suspected  = openMyst.filter(m => m.status === 'suspected' && m.chapter && (currentCh - m.chapter) >= 4)
  if (suspected.length >= 2) return `${suspected.length} threads are still circling toward answers.`
  if (suspected.length === 1) {
    const age = currentCh - (suspected[0].chapter || 0)
    const txt = suspected[0].text
    if (age >= 8) {
      if (txt && txt.length <= 55) return `"${shorten(txt, 55)}" — your suspicion keeps deepening.`
      return `A suspicion from ch. ${suspected[0].chapter || 1} keeps deepening — ${age} chapters on.`
    }
  }

  const evolving = openMyst.filter(m => m.status === 'evolving' && m.chapter && (currentCh - m.chapter) >= 4)
  if (evolving.length >= 2) return `${evolving.length} threads keep changing shape.`
  if (evolving.length === 1) {
    const txt = evolving[0].text
    if (txt && txt.length <= 55) return `"${shorten(txt, 55)}" — keeps reframing itself.`
    return "One question keeps changing shape as you read."
  }

  const lingering = openMyst
    .filter(m => m.chapter && (currentCh - m.chapter) >= 7)
    .sort((a, b) => (a.chapter || 0) - (b.chapter || 0))
  if (lingering.length >= 2) return `${lingering.length} threads from early on are still pulling.`
  if (lingering.length === 1) {
    const age = currentCh - (lingering[0].chapter || 0)
    const txt = lingering[0].text
    if (txt && txt.length <= 60) return `"${txt}" — ${age} chapters and still circling.`
    return `"${shorten(txt, 48)}" — still in motion, ${age} chapters on.`
  }

  const theoryNotes = notes.filter(n => n.tag === 'theory')
  if (theoryNotes.length >= 2) {
    const latest = theoryNotes[theoryNotes.length - 1]
    const revised = theoryNotes.filter(n => n.revisedAt)
    if (revised.length >= 2) {
      if (latest.text.length <= 55) return `"${latest.text}" — still shifting.`
      return "Several of your theories have been revised."
    }
    if (latest.text.length <= 55) return `"${latest.text}" — still forming.`
    return "Your theories are accumulating."
  }

  const confusingNotes = notes.filter(n => n.tag === 'confusing')
  if (confusingNotes.length >= 3 && theoryNotes.length < 2) {
    return "Several passages keep resisting explanation."
  }

  const lastDate = [...(log.map(e => (typeof e === 'object' ? e.date : e)))].sort().pop()
  if (lastDate) {
    const gapDays = Math.floor((Date.now() - new Date(lastDate)) / 86400000)
    if (gapDays > 30) return "The story has been waiting. Everything in it still holds."
    if (gapDays > 14) return "Some time away from this. The threads are still live."
    if (gapDays > 7)  return "A week since your last session. The story hasn't moved on."
  }

  return null
}

export default function CompanionPanel({ book }) {
  const { settings }   = useSettings()
  const { updateBook } = useBooks()

  const [idx,       setIdx]      = useState(0)
  const [fade,      setFade]     = useState(true)
  const [hovered,   setHovered]  = useState(false)
  const longPressTimer           = useRef(null)

  // ── Presence visibility ──────────────────────────────────────────────────
  const presenceVisibility = useMemo(
    () => computePresenceVisibility(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.notes?.length, book.readingLog?.length,
     book.rereadCount, settings.insightStyle]
  )
  const deepFaded        = presenceVisibility < 0.40
  const faded            = presenceVisibility < 0.65
  const carouselInterval = deepFaded ? null : faded ? 18000 : 12000
  const panelOpacity     = presenceVisibility < 0.40 ? 0.55 : presenceVisibility < 0.65 ? 0.78 : 1.0

  // ── Narrative yield ──────────────────────────────────────────────────────
  const yieldsToBook = useMemo(
    () => shouldYieldToBook(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.notes?.length, book.readingLog?.length,
     book.rereadCount, book.mysteries?.length, settings.insightStyle]
  )

  const surfacedThisSessionRef = useRef(new Set())
  const reflectionCacheRef     = useRef(book.reflectionCache)
  useEffect(() => { reflectionCacheRef.current = book.reflectionCache }, [book.reflectionCache])

  // ── Presence observations ────────────────────────────────────────────────
  const presence = useMemo(
    () => generatePresence(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.mysteries?.length, book.notes?.length, book.chapters,
     book.readingLog?.length, book.characters?.main?.length,
     settings.spoilerMode, settings.insightStyle]
  )

  // ── Cached reflections — deduplicated before entering the carousel ────────
  const cachedReflections = useMemo(
    () => deduplicateReflections(getActiveReflections(book, 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.reflectionCache?.contextHash, book.reflectionCache?.reflections?.length]
  )

  // ── Combined observations pool ───────────────────────────────────────────
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

  // ── Secondary tension ────────────────────────────────────────────────────
  const secondarySignal = useMemo(
    () => (book.notes?.length >= 1 || book.mysteries?.length >= 1)
      ? deriveSecondarySignal(book, settings)
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.notes?.length, book.mysteries?.length, book.currentChapter,
     book.readingLog?.length, settings.insightStyle]
  )

  // ── Open questions from mysteries ────────────────────────────────────────
  const mode = getEffectiveMode(book, settings)
  const openQuestions = useMemo(() => {
    const mysts = (book.mysteries || [])
      .filter(m => !m.resolved && isMysteryVisible(book, m, mode))
      .sort((a, b) => mysteryHauntScore(b, book) - mysteryHauntScore(a, book))
      .slice(0, 3)
    return mysts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.mysteries?.length, book.currentChapter, mode])

  // ── Reflection generation ────────────────────────────────────────────────
  useEffect(() => {
    const ctx  = assembleReflectionContext(book, settings)
    if (ctx.noteCount < 3 && ctx.openMysteries.length < 2) return
    const hash = hashContext(ctx)
    if (!shouldRegenerate(book, hash)) return
    const ruleReflections = generateRuleBasedReflections(ctx, settings.insightStyle)
    if (!ruleReflections.length) return
    updateBook(book.id, {
      reflectionCache: {
        contextHash: hash,
        generatedAt: new Date().toISOString(),
        reflections: ruleReflections,
        aiEnhanced:  false,
      },
    })
    if (settings.anthropicKey?.trim() && ctx.noteCount >= 5) {
      Promise.resolve()
        .then(() => generateCompanionReflections(ctx, settings.anthropicKey))
        .then(aiReflections => {
          if (!aiReflections?.length) return
          updateBook(book.id, {
            reflectionCache: {
              contextHash: hash,
              generatedAt: new Date().toISOString(),
              reflections: [...aiReflections, ...ruleReflections],
              aiEnhanced:  true,
            },
          })
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, book.notes?.length, book.currentChapter, book.readingLog?.length,
      book.mysteries?.length, settings.insightStyle])

  // ── Mark reflections surfaced ────────────────────────────────────────────
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

  // ── Suppress current reflection (dismiss gesture) ────────────────────────
  const suppressCurrent = () => {
    const reflId = reflectionIndexMap[idx]
    if (!reflId) return
    const cache = reflectionCacheRef.current
    if (!cache?.reflections?.length) return
    const updated = suppressReflection(cache.reflections, reflId)
    updateBook(book.id, { reflectionCache: { ...cache, reflections: updated } })
    // Advance to next observation quietly
    setFade(false)
    setTimeout(() => { setIdx(i => (i + 1) % Math.max(observations.length - 1, 1)); setFade(true) }, 280)
  }

  // ── Auto-advance carousel ────────────────────────────────────────────────
  useEffect(() => {
    if (observations.length < 2) return
    if (!carouselInterval) return
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i + 1) % observations.length); setFade(true) }, 280)
    }, carouselInterval)
    return () => clearInterval(t)
  }, [observations.length, carouselInterval])

  // Companion renders even when empty — it's architectural, not conditional.
  // Without observations it shows the book title as ambient label.
  const hasContent = observations.length > 0 && !yieldsToBook

  const isCurrentReflection = !!reflectionIndexMap[idx]
  const poolSaturated       = isReflectionPoolSaturated(book)

  return (
    <div
      className="companion-foil-outer"
      style={{ opacity: panelOpacity, transition: 'opacity 1200ms ease' }}
    >
      <div className="companion-foil-inner">

        {/* COMPANION label */}
        <p className="companion-label mb-4">Companion</p>

        {hasContent ? (
          <>
            {/* Primary observation — dismiss on hover (desktop) or long-press (mobile) */}
            <div
              className="mb-3 relative"
              style={{
                background: isCurrentReflection
                  ? 'color-mix(in srgb, var(--ca-bg, transparent) 40%, transparent)'
                  : 'transparent',
                transition: 'background 900ms ease',
                borderRadius: 8,
              }}
              onMouseEnter={() => isCurrentReflection && setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onTouchStart={() => {
                if (!isCurrentReflection) return
                longPressTimer.current = setTimeout(() => suppressCurrent(), 600)
              }}
              onTouchEnd={() => clearTimeout(longPressTimer.current)}
              onTouchMove={() => clearTimeout(longPressTimer.current)}
            >
              <p
                className="companion-thought"
                style={{ opacity: fade ? 1 : 0, transition: 'opacity 420ms ease' }}
              >
                {observations[idx]}
              </p>
              {/* Dismiss button — hover only on desktop, hidden otherwise */}
              {hovered && isCurrentReflection && (
                <button
                  onClick={suppressCurrent}
                  title="Dismiss this thought"
                  style={{
                    position: 'absolute', top: 0, right: 0,
                    fontSize: 10, lineHeight: 1,
                    color: 'var(--color-ink-300)',
                    background: 'transparent',
                    border: 'none', cursor: 'pointer',
                    padding: '2px 4px',
                    transition: 'color 150ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-ink-600)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-ink-300)' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Secondary tension signal */}
            {secondarySignal && !deepFaded && (
              <p
                className="font-serif italic"
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--color-text-dim)',
                  opacity: fade ? 0.85 : 0,
                  transition: 'opacity 420ms ease 80ms',
                  marginBottom: 12,
                }}
              >
                {secondarySignal}
              </p>
            )}

            {/* Carousel dots */}
            {observations.length > 2 && (
              <div className="flex gap-1.5 mb-3">
                {observations.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setFade(false)
                      setTimeout(() => { setIdx(i); setFade(true) }, 280)
                    }}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      background: i === idx
                        ? 'var(--color-gold-accent)'
                        : 'var(--color-separator)',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Next thought button */}
            {observations.length > 1 && (
              <button
                onClick={() => {
                  setFade(false)
                  setTimeout(() => { setIdx(i => (i + 1) % observations.length); setFade(true) }, 280)
                }}
                className="font-serif italic"
                style={{
                  fontSize: 12,
                  color: 'var(--color-gold-accent)',
                  opacity: 0.75,
                  transition: 'opacity .18s ease',
                  display: 'block',
                  marginBottom: openQuestions.length > 0 ? 0 : undefined,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.75' }}
              >
                next thought →
              </button>
            )}
          </>
        ) : (
          // Silent companion — either no content yet, or pool saturated
          poolSaturated ? (
            <p
              className="font-serif italic"
              style={{
                fontSize: 13,
                lineHeight: 1.65,
                color: 'var(--color-text-dim)',
                opacity: 0.7,
              }}
            >
              Add more notes to deepen the manuscript.
            </p>
          ) : (
            <p
              className="companion-thought ambient-breathe"
              style={{ fontSize: 15 }}
            >
              {book.title}
            </p>
          )
        )}

        {/* Open Questions section */}
        {openQuestions.length > 0 && (
          <>
            <hr className="companion-section-divider" />
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-text-dim)',
                marginBottom: 10,
              }}
            >
              Open Questions
            </p>
            <div className="space-y-2">
              {openQuestions.map((m, i) => {
                const hl = hauntLevel(mysteryHauntScore(m, book))
                const haunted = hl === 'haunted' || hl === 'persistent'
                return (
                  <div key={m.id ?? i} className="flex items-start gap-2">
                    <span
                      style={{
                        fontSize: 9,
                        color: haunted ? 'var(--color-gold-accent)' : 'var(--color-text-dim)',
                        opacity: haunted ? 0.85 : 0.45,
                        flexShrink: 0,
                        marginTop: 3,
                      }}
                    >✦</span>
                    <p
                      className="font-serif italic line-clamp-2"
                      style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {m.text}
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
