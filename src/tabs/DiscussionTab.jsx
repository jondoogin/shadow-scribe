import { useState } from 'react'
import { getEffectiveMode, getDiscussionQuestionView } from '../utils/spoiler.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { generateDiscussionQuestions } from '../utils/aiExtractor.js'
import { aiEnabled, bookDepth } from '../utils/depthLevel.js'

export default function DiscussionTab({ book, onUpdateBook }) {
  const [input,       setInput]       = useState('')
  const [deletingIdx, setDeletingIdx] = useState(null)
  const [generating,  setGenerating]  = useState(false)
  const [genError,    setGenError]    = useState(null)
  const { settings } = useSettings()
  const mode  = getEffectiveMode(book, settings)
  const depth = bookDepth(book, settings)

  const userQuestions = book.userDiscussionQuestions || []
  const hasAiKey = true // proxy available for alpha testers without personal key
  const hasGenerated = book.aiQuestionsGenerated

  const deleteUserQ = (i) => {
    onUpdateBook({ userDiscussionQuestions: userQuestions.filter((_, idx) => idx !== i) })
    setDeletingIdx(null)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const questions = await generateDiscussionQuestions(book, settings.anthropicKey)
      onUpdateBook({ discussionQuestions: questions, aiQuestionsGenerated: true })
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const allQuestionViews = (book.discussionQuestions || [])
    .map(q => getDiscussionQuestionView(book, q, mode))
    .filter(Boolean)

  const questionViews     = allQuestionViews.filter(q => !q._veiled)
  const veiledQCount      = allQuestionViews.filter(q =>  q._veiled).length

  const addQ = () => {
    if (!input.trim()) return
    onUpdateBook({ userDiscussionQuestions: [...userQuestions, input.trim()] })
    setInput('')
  }

  return (
    <div className="max-w-2xl">

      {/* Ambient companion line — forward-facing during reading; settled register after finishing */}
      {/* Quiet mode: the companion doesn't observe; this surface is user-owned. */}
      {depth !== 'quiet' && book.status === 'finished' && (questionViews.length > 0 || userQuestions.length > 0) && (
        <p className="text-[12px] text-ink-500 italic mb-6 leading-relaxed">
          Questions the reading opened. Some take longer to settle than the story did.
        </p>
      )}

      {/* Claude generate — minimal text link only. Quiet depth: AI is off. */}
      {hasAiKey && aiEnabled(book, settings) && (
        <div className="flex justify-end mb-5">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-[11px] italic hover:opacity-75 transition-opacity disabled:opacity-40"
            style={{ color:'var(--ca, #B8860B)' }}>
            {generating ? 'thinking…' : hasGenerated ? 'draw out more →' : 'draw out questions →'}
          </button>
        </div>
      )}
      {genError && <p className="text-[11px] text-ember mb-4">{genError}</p>}

      {/* Empty state */}
      {questionViews.length === 0 && !userQuestions.length && !generating && (
        <p className="text-[13px] text-ink-400 italic mb-6 leading-relaxed">
          {book.status === 'finished'
            ? aiEnabled(book, settings)
              ? 'The reading is complete. The companion can draw out questions worth sitting with.'
              : 'Questions the reading left open. Write what you\'re still carrying.'
            : aiEnabled(book, settings)
              ? 'The reading generates its own questions as it deepens. When the companion has enough to work with, it can draw them out.'
              : 'Questions the story opens and doesn\'t close. Write what you\'re still carrying.'}
        </p>
      )}

      {/* Companion-generated questions — veiled ones are filtered out and counted below */}
      {questionViews.length > 0 && (
        <div className="space-y-3 mb-6">
          {questionViews.map((q, i) => (
            <div key={i} className="rounded-xl border border-ink-100 p-4 bg-cream-50">
              <div className="flex items-start gap-3">
                <span className="font-serif text-xl leading-none flex-shrink-0 mt-[-2px] text-gold opacity-60">"</span>
                <p className="text-[13px] leading-relaxed text-ink-700">{q.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {veiledQCount > 0 && book.status !== 'finished' && (
        <p className="font-serif italic mb-6" style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>
          {veiledQCount} more question{veiledQCount !== 1 ? 's' : ''} waiting ahead — {veiledQCount !== 1 ? 'they\'ll' : 'it\'ll'} surface as you reach those chapters.
        </p>
      )}

      {/* Reader's own questions */}
      {userQuestions.length > 0 && (
        <div className="space-y-3 mb-6">
          {userQuestions.map((q, i) => (
            <div key={i} className="rounded-xl border border-ink-100 p-4"
              style={{ background: 'var(--color-card-archival)' }}>
              {deletingIdx === i ? (
                <div className="animate-fade-in">
                  <p className="text-[12px] text-ink-600 mb-2.5 leading-relaxed">
                    Remove this question from the companion?
                  </p>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setDeletingIdx(null)}
                      className="text-[12px] italic text-ink-400 hover:text-ink-600 transition-colors">
                      keep it
                    </button>
                    <button onClick={() => deleteUserQ(i)}
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white bg-ember hover:bg-ember-light transition-colors">
                      Yes, remove it
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-ink-700 leading-relaxed">{q}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[11px] text-ink-300 italic">yours</p>
                    <button onClick={() => setDeletingIdx(i)}
                      className="text-[11px] text-ink-300 hover:text-ember transition-colors">
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}


      {/* Question input — written into the page, not mounted onto it */}
      <div className="border-t border-ink-100 pt-5 mt-2">
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={2}
          placeholder={book.status === 'finished'
            ? 'A question the reading left with you…'
            : depth === 'quiet'
              ? 'A question or pattern worth holding…'
              : 'A question you\'re carrying into the next chapter…'}
          className="w-full border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm placeholder-ink-400 resize-none transition-all mb-2"
          style={{ background: 'var(--color-card-base)' }} />
        <button onClick={addQ} disabled={!input.trim()}
          className="text-[12px] italic hover:opacity-75 transition-opacity disabled:opacity-30"
          style={{ color:'var(--ca, #B8860B)' }}>
          keep this →
        </button>
      </div>
    </div>
  )
}
