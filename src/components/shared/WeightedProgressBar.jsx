import { useState } from 'react'
import { getChapterWeight, getTotalWeight, getChapterLabel, isSpecialChapter } from '../../utils/chapterHelpers.js'
import { getChapterTitle, getEffectiveMode } from '../../utils/spoiler.js'
import { useSettings } from '../../context/SettingsContext.jsx'

export default function WeightedProgressBar({ book, height = 'h-2', className = '' }) {
  const { settings } = useSettings()
  const mode = getEffectiveMode(book, settings)
  const [hovered, setHovered] = useState(null)
  const chapters    = book.chapters || []
  const totalWeight = getTotalWeight(chapters)

  if (!chapters.length) return (
    <div className={`w-full bg-ink-200 rounded-full ${height} ${className}`} />
  )

  // How many dividers to show based on chapter count
  const showDivider = (i) => {
    const n = chapters.length
    if (n <= 12) return true
    if (n <= 24) return i % 2 === 0
    return i % 5 === 0 || isSpecialChapter(chapters[i])
  }

  return (
    <div className={`relative select-none ${className}`}>
      {/* Bar */}
      <div className={`flex w-full rounded-full overflow-hidden bg-ink-200 ${height}`}>
        {chapters.map((ch, i) => {
          const weight    = getChapterWeight(ch)
          const widthPct  = (weight / totalWeight) * 100
          const completed = ch.completed
          const isCurrent = ch.num === book.currentChapter && !ch.completed
          const isLast    = i === chapters.length - 1
          const special   = isSpecialChapter(ch)

          return (
            <div
              key={ch.num}
              style={{
                width:       `${widthPct}%`,
                background:  completed ? 'var(--ca, #B8860B)'
                           : isCurrent ? 'color-mix(in srgb, var(--ca, #B8860B) 35%, transparent)'
                           : 'transparent',
                borderRight: (!isLast && showDivider(i))
                  ? '1px solid rgba(255,255,255,0.45)'
                  : 'none',
                flexShrink: 0,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          )
        })}
      </div>

      {/* Hover tooltip */}
      {hovered !== null && (() => {
        const ch = chapters[hovered]
        if (!ch) return null
        const leftPct = chapters.slice(0, hovered).reduce(
          (s, c) => s + getChapterWeight(c), 0
        ) / totalWeight * 100
        const midPct  = leftPct + (getChapterWeight(ch) / totalWeight * 50)
        const clampedLeft = Math.min(Math.max(midPct, 5), 95)

        return (
          <div
            className="absolute bottom-full mb-2 pointer-events-none z-20"
            style={{ left: `${clampedLeft}%`, transform: 'translateX(-50%)' }}
          >
            <div className="bg-ink-900 text-white text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg leading-tight">
              <span className="text-ink-400 mr-1">{getChapterLabel(ch, book.format)}</span>
              {getChapterTitle(book, ch, mode)}
            </div>
            <div
              className="w-1.5 h-1.5 bg-ink-900 rotate-45 mx-auto"
              style={{ marginTop: '-3px' }}
            />
          </div>
        )
      })()}
    </div>
  )
}
