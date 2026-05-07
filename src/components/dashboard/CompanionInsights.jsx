import { useState, useEffect, useMemo } from 'react'
import { generateInsights } from '../../utils/insights.js'

export default function CompanionInsights({ book }) {
  const insights = useMemo(
    () => generateInsights(book),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.mysteries?.length, book.notes?.length, book.chapters]
  )
  const [idx,  setIdx]  = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    if (insights.length < 2) return
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i + 1) % insights.length); setFade(true) }, 280)
    }, 7000)
    return () => clearInterval(t)
  }, [insights.length])

  if (!insights.length) return null

  return (
    <div className="insight-strip">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-3 flex items-center gap-3">
        <span className="text-[11px] momentum-dot flex-shrink-0" style={{ color:'var(--ca, #B8860B)' }}>✦</span>
        <p
          className="text-[12px] text-ink-500 italic leading-relaxed flex-1 transition-opacity duration-300"
          style={{ opacity: fade ? 1 : 0 }}
        >
          {insights[idx]}
        </p>
        {insights.length > 1 && (
          <div className="flex gap-1 flex-shrink-0">
            {insights.map((_, i) => (
              <button
                key={i}
                onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true) }, 280) }}
                className="w-1 h-1 rounded-full transition-all"
                style={{ background: i === idx ? 'var(--ca, #B8860B)' : 'var(--color-ink-300)' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
