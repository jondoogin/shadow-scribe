import { useState, useEffect, useMemo } from 'react'
import { generatePresence } from '../../utils/companionPresence.js'
import { useSettings } from '../../context/SettingsContext.jsx'

export default function CompanionInsights({ book }) {
  const { settings } = useSettings()
  const observations = useMemo(
    () => generatePresence(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.mysteries?.length, book.notes?.length, book.chapters,
     book.readingLog?.length, book.characters?.main?.length, settings.spoilerMode]
  )
  const [idx,  setIdx]  = useState(0)
  const [fade, setFade] = useState(true)

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
        <span className="text-[10px] flex-shrink-0 opacity-70" style={{ color:'var(--ca, #B8860B)' }}>✦</span>
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
