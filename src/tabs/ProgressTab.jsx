import { useState } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import ProgressBar from '../components/shared/ProgressBar.jsx'
import SectionHeading from '../components/shared/SectionHeading.jsx'
import { getProgress } from '../utils/progress.js'

export default function ProgressTab({ book, onUpdateBook }) {
  const pct = getProgress(book)
  const [celebrating, setCelebrating] = useState(null)

  const toggleChapter = num => {
    const ch = book.chapters.find(c => c.num === num)
    if (!ch) return
    const wasCompleted = ch.completed
    const updated = book.chapters.map(c => c.num === num ? { ...c, completed: !c.completed } : c)
    const newCurrent = !wasCompleted
      ? Math.max(...updated.filter(c => c.completed).map(c => c.num))
      : book.currentChapter
    onUpdateBook({ chapters:updated, currentChapter:newCurrent, lastUpdated:new Date().toISOString().split('T')[0] })
    if (!wasCompleted) { setCelebrating(num); setTimeout(() => setCelebrating(null), 700) }
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-cream-50 rounded-2xl border border-ink-200 p-6 mb-8 text-center">
        <div className="font-serif text-5xl font-bold text-ink-900 tabular-nums mb-1">
          {pct}<span className="text-2xl text-ink-400 font-normal">%</span>
        </div>
        <p className="text-[13px] text-ink-500 mb-4">
          {book.chapters.filter(c => c.completed).length} of {book.totalChapters} chapters complete
        </p>
        <ProgressBar value={pct} height="h-2.5" className="max-w-xs mx-auto" />
      </div>

      <SectionHeading>Chapter Checklist</SectionHeading>
      <div className="space-y-1.5">
        {book.chapters.map(ch => {
          const isCurrent = ch.num === book.currentChapter && !ch.completed
          const isNext    = ch.num === book.currentChapter + 1 && !ch.completed
          return (
            <div
              key={ch.num}
              onClick={() => toggleChapter(ch.num)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all select-none ${
                ch.completed ? 'bg-sage-bg border border-sage-pale'
                : isCurrent  ? 'bg-gold-bg border border-gold-border'
                : 'bg-cream-50 border border-ink-200 hover:border-ink-300'
              } ${celebrating === ch.num ? 'animate-celebrate' : ''}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                ch.completed ? 'bg-sage border-sage' : isCurrent ? 'border-gold' : 'border-ink-300'
              }`}>
                {ch.completed && <span className="text-white"><Ico.Check /></span>}
                {isCurrent && !ch.completed && <span className="w-2 h-2 rounded-full bg-gold block" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span className={`text-[11px] font-bold ${ch.completed ? 'text-sage' : isCurrent ? 'text-gold' : 'text-ink-400'}`}>
                    {book.format === 'audiobook' ? 'Pt.' : 'Ch.'} {ch.num}
                  </span>
                  {isNext    && <span className="text-[10px] bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded-full">Up next</span>}
                  {isCurrent && <span className="text-[10px] bg-gold-bg text-gold border border-gold-border px-1.5 py-0.5 rounded-full">Reading now</span>}
                  {ch.important && <span className="text-gold text-[11px] leading-none">★</span>}
                </div>
                <p className={`text-[13px] font-medium truncate ${ch.completed ? 'line-through text-ink-400' : 'text-ink-700'}`}>
                  {ch.title}
                </p>
              </div>
              {celebrating === ch.num && <span className="confetti-dot text-base">✨</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
