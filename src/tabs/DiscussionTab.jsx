import { useState } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import SectionLabel from '../components/shared/SectionLabel.jsx'
import { getEffectiveMode, getDiscussionQuestionView } from '../utils/spoiler.js'
import { useSettings } from '../context/SettingsContext.jsx'

export default function DiscussionTab({ book, onUpdateBook }) {
  const [input, setInput] = useState('')
  const { settings } = useSettings()
  const mode = getEffectiveMode(book, settings)
  const userQuestions = book.userDiscussionQuestions || []

  const questionViews = (book.discussionQuestions || [])
    .map(q => getDiscussionQuestionView(book, q, mode))
    .filter(Boolean)

  const addQ = () => {
    if (!input.trim()) return
    onUpdateBook({ userDiscussionQuestions: [...userQuestions, input.trim()] })
    setInput('')
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl p-4 mb-6 border"
        style={{ background:'var(--ca-bg, #FDF8EC)', borderColor:'var(--ca-border, #E8D090)' }}>
        <div className="flex items-center gap-2 mb-1.5" style={{ color:'var(--ca, #B8860B)' }}>
          <Ico.Chat />
          <p className="text-[10px] font-semibold uppercase tracking-widest">Questions worth sitting with</p>
        </div>
        <p className="text-[12px] text-ink-600 leading-relaxed">
          For book clubs, journalling, or the quiet space between chapters.
        </p>
        {questionViews.length === 0 && !userQuestions.length && (
          <p className="text-[12px] text-ink-400 italic mt-2">
            Questions will find their way here as the companion grows with you.
          </p>
        )}
      </div>

      {questionViews.length > 0 && (
        <div className="space-y-3 mb-6">
          {questionViews.map((q, i) => (
            <div key={i} className={`rounded-xl border p-4 ${q._veiled ? 'bg-ink-50 border-ink-100' : 'bg-cream-50 border-ink-200'}`}>
              <div className="flex items-start gap-3">
                <span className={`font-serif text-xl leading-none flex-shrink-0 mt-[-2px] ${q._veiled ? 'text-ink-300' : 'text-gold'}`}>"</span>
                <p className={`text-[13px] leading-relaxed ${q._veiled ? 'text-ink-400 italic' : 'text-ink-700'}`}>{q.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {userQuestions.length > 0 && (
        <div className="space-y-3 mb-6">
          {userQuestions.map((q, i) => (
            <div key={i} className="bg-sage-bg rounded-xl border border-sage-pale p-4">
              <p className="text-[13px] text-ink-700 leading-relaxed">{q}</p>
              <p className="text-[10px] text-sage mt-2 font-medium">Your question</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-cream-50 rounded-xl border border-ink-200 p-4">
        <SectionLabel>A question of your own</SectionLabel>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={2}
          placeholder="What are you carrying into the next chapter?"
          className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm placeholder-ink-400 bg-white resize-none transition-all mb-3" />
        <button onClick={addQ} className="text-sm font-semibold transition-colors hover:opacity-75"
          style={{ color:'var(--ca, #B8860B)' }}>
          + Keep this question
        </button>
      </div>
    </div>
  )
}
