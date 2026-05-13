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
} from '../../utils/reflectionEngine.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useBooks }    from '../../context/BooksContext.jsx'

export default function CompanionInsights({ book }) {
  const { settings }   = useSettings()
  const { updateBook } = useBooks()

  const [idx,  setIdx]  = useState(0)
  const [fade, setFade] = useState(true)

  // Refs for markReflectionSurfaced — avoids adding reflectionCache to effect deps
  const surfacedThisSessionRef = useRef(new Set())
  const reflectionCacheRef     = useRef(book.reflectionCache)
  useEffect(() => { reflectionCacheRef.current = book.reflectionCache }, [book.reflectionCache])

  // ── Presence observations (immediate, contextual) ─────────────────────────
  const presence = useMemo(
    () => generatePresence(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.mysteries?.length, book.notes?.length, book.chapters,
     book.readingLog?.length, book.characters?.main?.length,
     settings.spoilerMode, settings.insightStyle]
  )

  // ── Cached reflections (synthesized, retrospective) ───────────────────────
  const cachedReflections = useMemo(
    () => getActiveReflections(book, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.reflectionCache?.contextHash, book.reflectionCache?.reflections?.length]
  )

  // ── Combined pool: weave reflections into the presence stream ─────────────
  // Reflections appear at positions 1 and 4 (after the arc observation,
  // and mid-way through) so they feel interspersed rather than appended.
  // reflectionIndexMap tracks which pool indices correspond to reflections (id lookup).
  const { observations, reflectionIndexMap } = useMemo(() => {
    const map = {}
    if (!cachedReflections.length) return { observations: presence, reflectionIndexMap: map }
    const pool = [...presence]
    if (cachedReflections[0]) {
      const pos = Math.min(1, pool.length)
      pool.splice(pos, 0, cachedReflections[0].text)
      map[pos] = cachedReflections[0].id
    }
    if (cachedReflections[1] && pool.length >= 4) {
      const pos = Math.min(4, pool.length)
      pool.splice(pos, 0, cachedReflections[1].text)
      map[pos] = cachedReflections[1].id
    }
    return { observations: pool.filter(Boolean), reflectionIndexMap: map }
  }, [presence, cachedReflections])

  // ── Reflection generation (triggered when context hash changes) ───────────
  useEffect(() => {
    const ctx  = assembleReflectionContext(book, settings)
    // Require a minimum of meaningful content before generating
    if (ctx.noteCount < 3 && ctx.openMysteries.length < 2) return

    const hash = hashContext(ctx)
    if (!shouldRegenerate(book, hash)) return

    // Rule-based path — synchronous, always available
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

    // AI path — async, only when key is set and there's enough content
    // Fires silently in background; failures fall back to rule-based cache
    if (settings.anthropicKey?.trim() && ctx.noteCount >= 5) {
      Promise.resolve()
        .then(() => generateCompanionReflections(ctx, settings.anthropicKey))
        .then(aiReflections => {
          if (!aiReflections?.length) return
          // AI reflections prepended; rule-based serve as fallback
          updateBook(book.id, {
            reflectionCache: {
              contextHash:  hash,
              generatedAt:  new Date().toISOString(),
              reflections:  [...aiReflections, ...ruleReflections],
              aiEnhanced:   true,
            },
          })
        })
        .catch(() => { /* silent — rule-based cache remains */ })
    }
  // Only re-run when data that affects reflections actually changes.
  // Deliberately excludes book.reflectionCache to avoid a save→trigger loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, book.notes?.length, book.currentChapter, book.readingLog?.length,
      book.mysteries?.length, settings.insightStyle])

  // ── Mark reflections surfaced when carousel shows them ───────────────────
  // Uses reflectionCacheRef (not book.reflectionCache in deps) to avoid
  // the save→trigger loop. surfacedThisSessionRef prevents multiple writes
  // for the same reflection within a single session.
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
  useEffect(() => {
    if (observations.length < 2) return
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i + 1) % observations.length); setFade(true) }, 280)
    }, 7000)
    return () => clearInterval(t)
  }, [observations.length])

  if (!observations.length) return null

  return (
    <div className="insight-strip">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-3.5 flex items-center gap-3">
        <span className="text-[10px] flex-shrink-0 opacity-70" style={{ color: 'var(--ca, #B8860B)' }}>✦</span>
        <p
          className="text-[13px] text-ink-500 italic leading-relaxed flex-1"
          style={{ opacity: fade ? 1 : 0, transition: 'opacity 420ms ease' }}
        >
          {observations[idx]}
        </p>
        {observations.length > 1 && (
          <div className="flex gap-1.5 flex-shrink-0">
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
  )
}
