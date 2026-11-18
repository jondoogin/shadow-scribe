import { useState, useMemo } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import SectionHeading from '../components/shared/SectionHeading.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import { liveItems } from '../utils/live.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { generateChapterSummaries } from '../utils/aiExtractor.js'
import { aiEnabled, bookDepth } from '../utils/depthLevel.js'

const RECENT_COUNT = 5

export default function PlotTab({ book, onUpdateBook }) {
  const { settings } = useSettings()
  const depth = bookDepth(book, settings)
  const [openNum, setOpenNum] = useState(book.currentChapter)
  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState(null)
  const [showEarlier, setShowEarlier] = useState(false)
  const completed = book.chapters.filter(c => c.completed)

  // Notes indexed by chapter — gives each completed chapter its reading residue
  const notesByChapter = useMemo(() => {
    const counts = {}
    for (const note of liveItems(book.notes)) {
      if (note.chapter) counts[note.chapter] = (counts[note.chapter] || 0) + 1
    }
    return counts
  }, [book.notes])

  const toggleImportant = num =>
    onUpdateBook({ chapters: book.chapters.map(c => c.num === num ? { ...c, important:!c.important } : c) })

  // Generate summaries for completed chapters that are missing them
  const missingSummaries = completed.filter(c => !c.summary).length
  const summaryWord = missingSummaries === 1 ? 'summary' : 'summaries'
  const handleGenerateSummaries = async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const summaries = await generateChapterSummaries(book, settings.anthropicKey)
      if (Object.keys(summaries).length === 0) {
        setGenError('No summaries were returned — try again')
        return
      }
      onUpdateBook({
        chapters: book.chapters.map(c =>
          summaries[c.num] ? { ...c, summary: summaries[c.num] } : c
        )
      })
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  if (!completed.length) {
    return (
      <EmptyState
        icon={<Ico.Note />}
        title="The chronicle begins when you do"
        body={
          depth === 'quiet'
            ? 'Each chapter passed will settle here — what happened, in what order.'
            : depth === 'saturated'
            ? 'Chapters settle here as you advance. At full depth, the companion traces the shape of the story as it moves.'
            : 'What you\'ve read will rest here — the shape of the reading as it accumulates.'
        }
      />
    )
  }

  return (
    <div className="max-w-2xl">

      {/* Generate summaries — only shown when AI is on and completed chapters lack summaries */}
      {aiEnabled(book, settings) && missingSummaries > 0 && (
        <div
          className="flex items-center justify-between gap-4 mb-6 px-4 py-3 rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--ca) 5%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ca) 14%, transparent)',
          }}
        >
          <p className="italic" style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>
            {generating
              ? 'The companion is gathering the thread…'
              : `The companion can fill in ${missingSummaries} chapter ${summaryWord}.`}
          </p>
          <button
            onClick={handleGenerateSummaries}
            disabled={generating}
            className="flex-shrink-0 italic hover:opacity-75 transition-opacity disabled:opacity-40"
            style={{ fontSize: 12, color: 'var(--ca, #B8860B)' }}>
            {generating ? 'gathering…' : 'gather them →'}
          </button>
        </div>
      )}
      {genError && <p className="text-[11px] text-ember mb-4">{genError}</p>}

      <div className="space-y-2">
      {/* The last few chapters show; older ones wait behind "Earlier chapters". */}
      {[...completed].reverse().slice(0, showEarlier ? undefined : RECENT_COUNT).map(ch => {
        const isOpen   = openNum === ch.num
        const isJustRead = ch.num === book.currentChapter
        const rowPy = isJustRead ? 'py-4' : 'py-3'
        return (
          <div key={ch.num}
            className={`rounded-xl border overflow-hidden transition-colors ${ch.important ? 'border-gold-border bg-gold-bg' : 'border-ink-200 bg-cream-50'}`}>
            <button className={`w-full text-left px-4 flex items-center gap-3 ${rowPy}`}
              onClick={() => setOpenNum(isOpen ? null : ch.num)}>
              <div className="w-8 h-8 rounded-full bg-cream border border-ink-200 flex items-center justify-center flex-shrink-0">
                <span
                  className="tabular-nums"
                  style={{
                    fontSize:   12,
                    fontWeight: isJustRead ? 500 : 400,
                    color: 'var(--color-ink-500)',
                  }}
                >{ch.num}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className="truncate"
                    style={{
                      fontFamily: isJustRead ? 'var(--font-serif)' : 'var(--font-sans)',
                      fontSize:   isJustRead ? 17 : 15,
                      fontWeight: 500,
                      color: isJustRead ? 'var(--color-ink-900)' : 'var(--color-ink-700)',
                    }}
                  >{ch.title}</p>
                  {isJustRead && <span className="text-[10px] border px-1.5 py-[2px] rounded-full flex-shrink-0" style={{ background:'var(--ca-bg, #FDF8EC)', color:'var(--ca, #B8860B)', borderColor:'var(--ca-border, #E8D090)' }}>Just read</span>}
                </div>
                {!isOpen && ch.summary && (
                  <p
                    className="truncate mt-0.5"
                    style={{
                      fontSize: 13,
                      color: 'var(--color-ink-500)',
                    }}
                  >{ch.summary.slice(0, 80)}…</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {notesByChapter[ch.num] > 0 && (
                  <span className="text-[10px] text-ink-300 italic tabular-nums">
                    {notesByChapter[ch.num]}✎
                  </span>
                )}
                <button onClick={e => { e.stopPropagation(); toggleImportant(ch.num) }}
                  className={`transition-colors ${ch.important ? 'text-gold' : 'text-ink-300 hover:text-gold'}`}>
                  <Ico.Star f={ch.important} />
                </button>
                <span className={`text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}><Ico.Down /></span>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-5 pt-4 border-t border-ink-100 animate-fade-in">
                {ch.summary
                  ? <p className="text-[13px] text-ink-600 leading-relaxed">{ch.summary}</p>
                  : depth !== 'quiet' && <p className="text-[13px] text-ink-400 italic">No summary yet.</p>
                }
                {notesByChapter[ch.num] > 0 && (
                  <p className="text-[11px] text-ink-300 italic mt-3">
                    {notesByChapter[ch.num] === 1
                      ? 'One thought written here.'
                      : `${notesByChapter[ch.num]} thoughts written here.`}
                  </p>
                )}
                {ch.reflection && (
                  <div className="mt-4 pl-3 border-l-2" style={{ borderColor:'var(--ca-border, #E8D090)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 mb-1.5">Reflection</p>
                    <p className="text-[13px] text-ink-600 italic leading-relaxed">"{ch.reflection}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      </div>
      {completed.length > RECENT_COUNT && (
        <button type="button" className="c2-btn" style={{ width: '100%', marginTop: 12 }}
          onClick={() => setShowEarlier(v => !v)} aria-expanded={showEarlier}>
          {showEarlier ? 'Hide earlier chapters' : `Earlier chapters (${completed.length - RECENT_COUNT})`}
        </button>
      )}
    </div>
  )
}
