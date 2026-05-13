import { useState } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import { getMysteryView, MYSTERY_STATUSES, getEffectiveMode } from '../utils/spoiler.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { fmtDate } from '../utils/date.js'

const today = () => new Date().toISOString().split('T')[0]

const STATUS_STYLE = {
  open:      'bg-ember-bg border-ember-pale text-ember',
  suspected: 'bg-gold-bg border-gold-border text-gold',
  evolving:  'bg-sienna-bg border-sienna-pale text-sienna',
  hinted:    'bg-gold-bg border-gold-border text-[#92660A]',
  dormant:   'bg-ink-100 border-ink-200 text-ink-500',
  resolved:  'bg-sage-bg border-sage-pale text-sage',
}

// Statuses available in the inline picker (resolved is via checkbox)
const PICKER_STATUSES = ['open', 'suspected', 'evolving', 'hinted', 'dormant']

export default function MysteriesTab({ book, onUpdateBook }) {
  const [showing, setShowing]   = useState('active')
  const [adding,  setAdding]    = useState(false)
  const [newQ,    setNewQ]      = useState('')
  const { settings } = useSettings()
  const mode = getEffectiveMode(book, settings)

  // Evolving-thread state
  const [statusPickerId, setStatusPickerId] = useState(null)
  const [observingId,    setObservingId]    = useState(null)
  const [observeText,    setObserveText]    = useState('')
  const [refiningId,     setRefiningId]     = useState(null)
  const [refineText,     setRefineText]     = useState('')

  const toggle = id => onUpdateBook({
    mysteries: book.mysteries.map(m =>
      m.id === id ? { ...m, resolved: !m.resolved, status: m.resolved ? 'open' : 'resolved' } : m
    ),
  })

  const changeStatus = (id, newStatus) => {
    onUpdateBook({
      mysteries: book.mysteries.map(m =>
        m.id === id ? { ...m, status: newStatus } : m
      ),
    })
    setStatusPickerId(null)
  }

  const startObserving = (m) => {
    setObservingId(m.id)
    setObserveText(m.observation || '')
    setRefiningId(null)
    setStatusPickerId(null)
  }

  const saveObservation = (m) => {
    const text = observeText.trim()
    onUpdateBook({
      mysteries: book.mysteries.map(my => my.id === m.id ? {
        ...my,
        observation:     text || undefined,
        observationDate: text ? today() : undefined,
      } : my),
    })
    setObservingId(null)
    setObserveText('')
  }

  const startRefining = (m) => {
    setRefiningId(m.id)
    setRefineText(m.text)
    setObservingId(null)
    setStatusPickerId(null)
  }

  const saveRefine = (m) => {
    const text = refineText.trim()
    if (!text || text === m.text) { setRefiningId(null); return }
    onUpdateBook({
      mysteries: book.mysteries.map(my => my.id === m.id ? {
        ...my,
        text,
        originalText: my.originalText ?? my.text,
      } : my),
    })
    setRefiningId(null)
  }

  const addMystery = () => {
    if (!newQ.trim()) return
    onUpdateBook({
      mysteries: [...book.mysteries, {
        id: `myst_${Date.now()}`,
        text: newQ.trim(),
        status: 'open',
        chapter: book.currentChapter || 1,
        resolved: false,
      }],
    })
    setNewQ('')
    setAdding(false)
  }

  const viewedMysteries = book.mysteries
    .map(m => getMysteryView(book, m, mode))
    .filter(Boolean)

  const active   = viewedMysteries.filter(m => !m.resolved)
  const resolved = viewedMysteries.filter(m =>  m.resolved)
  const visible  = showing === 'active' ? active : showing === 'resolved' ? resolved : viewedMysteries

  const anyVeiled = viewedMysteries.some(m => m._veiled)
  const noneAtAll = book.mysteries.length === 0

  const emptyTitle = noneAtAll
    ? 'Questions tend to appear once the story begins moving.'
    : showing === 'resolved'
      ? 'Nothing answered yet.'
      : 'No open threads.'

  const emptyBody = noneAtAll
    ? "Open a thread whenever the story raises a question it isn't ready to answer."
    : 'Every story withholds something. Track the questions the novel is carrying.'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {[
            ['active',   `Open (${active.length})`],
            ['resolved', `Resolved (${resolved.length})`],
            ['all',      'All'],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setShowing(k)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${
                showing === k ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:border-ink-400'
              }`}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-[12px] font-semibold hover:opacity-75 transition-opacity"
          style={{ color: 'var(--ca, #B8860B)' }}>
          <Ico.Plus /> Open a thread
        </button>
      </div>

      {adding && (
        <div className="bg-cream-50 border rounded-2xl p-4 mb-5 animate-slide-up" style={{ borderColor:'var(--ca-border, #E8D090)' }}>
          <textarea value={newQ} onChange={e => setNewQ(e.target.value)} rows={2}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addMystery() } }}
            placeholder="What question is this story carrying?"
            autoFocus
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm text-ink-800 placeholder-ink-400 bg-white resize-none transition-all mb-3" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAdding(false); setNewQ('') }}
              className="text-[12px] text-ink-500 hover:text-ink-700 px-3 py-1.5 rounded-lg border border-ink-200 transition-colors">
              Cancel
            </button>
            <button onClick={addMystery}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg btn-accent">
              Open thread
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<Ico.Mystery />}
          title={emptyTitle}
          body={emptyBody}
          action={noneAtAll && (
            <button onClick={() => setAdding(true)}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--ca, #B8860B)' }}>
              Open the first thread →
            </button>
          )}
        />
      ) : (
        <div className="space-y-2">
          {visible.map(m => {
            const isObserving = observingId === m.id
            const isRefining  = refiningId  === m.id
            const showPicker  = statusPickerId === m.id

            return (
              <div key={m.id}
                className={`rounded-xl border p-4 transition-all ${
                  m.resolved
                    ? 'mystery-resolved bg-ink-100 border-ink-200'
                    : m._veiled
                      ? 'bg-cream-50 border-ink-200 opacity-75'
                      : 'bg-cream-50 border-ink-200'
                }`}>
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => !m._veiled && toggle(m.id)}
                    disabled={m._veiled}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      m.resolved ? 'bg-sage border-sage'
                      : m._veiled ? 'border-ink-200 cursor-default'
                      : 'border-ink-300 hover:border-gold'
                    }`}>
                    {m.resolved && <span className="text-white"><Ico.Check /></span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Mystery text — or refinement input */}
                    {isRefining ? (
                      <div className="animate-fade-in mb-2">
                        <textarea value={refineText} onChange={e => setRefineText(e.target.value)}
                          rows={2} autoFocus
                          className="w-full border border-ink-200 rounded-lg px-2.5 py-1.5 text-[13px] text-ink-800 bg-white resize-none" />
                        <div className="flex gap-2 mt-1.5">
                          <button onClick={() => setRefiningId(null)}
                            className="text-[11px] text-ink-400 hover:text-ink-600 transition-colors">Cancel</button>
                          <button onClick={() => saveRefine(m)}
                            className="text-[11px] font-medium text-ink-600 hover:text-ink-800 transition-colors">Save</button>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-[13px] font-medium leading-relaxed ${
                        m.resolved ? 'line-through text-ink-400'
                        : m._veiled ? 'text-ink-500 italic'
                        : 'text-ink-800'
                      }`}>
                        {m.text}
                      </p>
                    )}

                    {/* Metadata row */}
                    {!isRefining && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {!m._veiled && (
                          <span className="text-[11px] text-ink-400">
                            First appears ch. {m.chapter}
                            {!m.resolved && (book.currentChapter - m.chapter) >= 8 && (
                              <span className="text-ink-300 italic"> · {book.currentChapter - m.chapter} ch. open</span>
                            )}
                          </span>
                        )}

                        {/* Status badge — clickable for unresolved non-veiled */}
                        {!m._veiled && !m.resolved ? (
                          <button
                            onClick={() => setStatusPickerId(s => s === m.id ? null : m.id)}
                            className={`text-[10px] font-medium px-2 py-[2px] rounded-full border transition-opacity hover:opacity-75 ${
                              STATUS_STYLE[m.status] ?? STATUS_STYLE.open
                            }`}>
                            {MYSTERY_STATUSES[m.status]?.label ?? m.status}
                          </button>
                        ) : (
                          <span className={`text-[10px] font-medium px-2 py-[2px] rounded-full border ${
                            STATUS_STYLE[m.status] ?? STATUS_STYLE.open
                          }`}>
                            {MYSTERY_STATUSES[m.status]?.label ?? m.status}
                          </span>
                        )}

                        {/* Refined indicator */}
                        {!m._veiled && m.originalText && (
                          <span className="text-[11px] text-ink-300 italic">· refined</span>
                        )}
                      </div>
                    )}

                    {/* Status picker */}
                    {showPicker && (
                      <div className="flex gap-1.5 flex-wrap mt-2 animate-fade-in">
                        {PICKER_STATUSES.map(s => (
                          <button key={s} onClick={() => changeStatus(m.id, s)}
                            className={`text-[10px] font-medium px-2.5 py-[3px] rounded-full border transition-all ${
                              STATUS_STYLE[s]
                            } ${m.status === s ? 'ring-2 ring-gold ring-offset-1' : 'opacity-60 hover:opacity-100'}`}>
                            {MYSTERY_STATUSES[s]?.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Observation display */}
                    {!m._veiled && m.observation && !isObserving && (
                      <div className="mt-3 pl-3 border-l-2 border-ink-200">
                        <p className="text-[12px] text-ink-500 italic leading-relaxed">{m.observation}</p>
                        {m.observationDate && (
                          <p className="text-[11px] text-ink-300 mt-0.5">{fmtDate(m.observationDate)}</p>
                        )}
                      </div>
                    )}

                    {/* Observation input */}
                    {isObserving && (
                      <div className="mt-3 pl-3 border-l-2 border-ink-200 animate-fade-in">
                        <textarea value={observeText} onChange={e => setObserveText(e.target.value)}
                          rows={2} autoFocus
                          placeholder="Your current thinking on this…"
                          className="w-full text-[12px] text-ink-600 bg-transparent resize-none outline-none placeholder-ink-300 leading-relaxed" />
                        <div className="flex gap-3 mt-1.5">
                          <button onClick={() => { setObservingId(null); setObserveText('') }}
                            className="text-[11px] text-ink-400 hover:text-ink-600 transition-colors">Cancel</button>
                          <button onClick={() => saveObservation(m)}
                            className="text-[11px] font-medium text-ink-600 hover:text-ink-800 transition-colors">Save</button>
                        </div>
                      </div>
                    )}

                    {/* Thread actions */}
                    {!m._veiled && !m.resolved && !isRefining && !isObserving && (
                      <div className="flex items-center gap-4 mt-2.5">
                        <button onClick={() => startObserving(m)}
                          className="text-[11px] text-ink-300 hover:text-ink-500 italic transition-colors">
                          {m.observation ? 'update thought' : '+ add a thought'}
                        </button>
                        <button onClick={() => startRefining(m)}
                          className="text-[11px] text-ink-300 hover:text-ink-500 transition-colors">
                          Refine
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {anyVeiled && mode !== 'full' && (
        <p className="text-[11px] text-ink-400 text-center italic mt-5">
          Some threads are still gathering — they'll become clear as you read further.
        </p>
      )}
    </div>
  )
}
