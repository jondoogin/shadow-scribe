import { useState, useMemo, useRef, useEffect } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import { getMysteryView, MYSTERY_STATUSES, getEffectiveMode } from '../utils/spoiler.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { bookDepth } from '../utils/depthLevel.js'
import { track } from '../utils/analytics.js'
import { fmtDate } from '../utils/date.js'
import { mysteryHauntScore, hauntLevel } from '../utils/hauntScore.js'
import { uid } from '../utils/uid.js'
import { liveItems } from '../utils/live.js'

const today = () => new Date().toISOString().split('T')[0]

// Companion gravity line — varies by mystery status and age.
// Communicates active narrative movement, not just archival persistence.
// Earlier threshold (6ch) so momentum language appears sooner.
function getMysteryGravity(m, currentCh) {
  if (m.resolved || m._veiled) return null
  const age = currentCh - (m.chapter || 0)
  if (age < 6) return null

  if (m.status === 'suspected') {
    if (age >= 12) return 'Your suspicion has been circling this for a long time.'
    if (age >= 8)  return 'Your suspicion keeps returning here.'
    return 'Something is circling.'
  }
  if (m.status === 'evolving') {
    if (age >= 12) return 'The question keeps changing shape. It hasn\'t stayed still.'
    return 'Each chapter seems to reframe this slightly.'
  }
  if (m.status === 'hinted') {
    if (age >= 8) return 'The story has gestured at an answer. The resolution may be closer than it seems.'
    return 'The story has gestured at this. The answer may already be in view.'
  }
  if (m.status === 'dormant') {
    if (age >= 15) return 'The story hasn\'t returned to this. Neither have you. But it\'s still here.'
    return 'Still drifting. The story hasn\'t answered it — and you haven\'t returned to it.'
  }
  // Generic age-based (open/unknown status)
  if (age >= 20) return 'This has been with you a long time. The story hasn\'t closed it.'
  if (age >= 15) return 'Still open, deep in the story. Something is being held back.'
  if (age >= 10) return 'Open for a long stretch now. The story is still carrying this.'
  return 'Still here. The story hasn\'t addressed it yet.'
}

const STATUS_STYLE = {
  open:      'bg-ember-bg border-ember-pale text-ember',
  suspected: 'bg-gold-bg border-gold-border text-gold',
  evolving:  'bg-sienna-bg border-sienna-pale text-sienna',
  hinted:    'bg-gold-bg border-gold-border text-[#92660A]',
  dormant:   'bg-ink-100 border-ink-200 text-ink-500',
  resolved:  'bg-ink-100 border-ink-200 text-ink-400',
}

// Statuses available in the inline picker (resolved is via checkbox)
const PICKER_STATUSES = ['open', 'suspected', 'evolving', 'hinted', 'dormant']

// ── Mystery thread response — companion acknowledges a newly opened thread ────
const MYSTERY_THREAD_RESPONSES = [
  "Opened. The story will return to this.",
  "A question the story isn't ready to answer.",
  "The reading is holding this.",
  "Kept here while the story continues.",
]
function generateMysteryResponse(text) {
  let h = 0
  for (const c of text) h = ((h * 31) + c.charCodeAt(0)) >>> 0
  return MYSTERY_THREAD_RESPONSES[h % MYSTERY_THREAD_RESPONSES.length]
}

export default function MysteriesTab({ book, onUpdateBook, flashItemId }) {
  // Live mysteries — tombstoned items stay in book.mysteries for sync but are hidden
  const liveMysteries = useMemo(() => liveItems(book.mysteries), [book.mysteries])

  // ── Note density by chapter — for companion residue echo ─────────────────
  const notesByChapter = useMemo(() => {
    const map = {}
    for (const n of liveItems(book.notes)) {
      if (n.chapter) map[n.chapter] = (map[n.chapter] || 0) + 1
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.notes])

  const [showing,          setShowing]          = useState('active')
  const [adding,           setAdding]           = useState(false)
  const [newQ,             setNewQ]             = useState('')
  const [showArchived,     setShowArchived]      = useState(false)
  const { settings } = useSettings()
  const mode  = getEffectiveMode(book, settings)
  const depth = bookDepth(book, settings)

  // Companion thread state
  const [thinkingMystId,  setThinkingMystId]  = useState(null)  // mystery currently in thinking state
  const [mysteryReplies,  setMysteryReplies]  = useState({})    // { [id]: string }
  const thinkingTimerRef = useRef(null)
  useEffect(() => () => { if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current) }, [])

  // Evolving-thread state
  const [statusPickerId, setStatusPickerId] = useState(null)
  const [observingId,    setObservingId]    = useState(null)
  const [observeText,    setObserveText]    = useState('')
  const [refiningId,     setRefiningId]     = useState(null)
  const [refineText,     setRefineText]     = useState('')
  const [deletingId,     setDeletingId]     = useState(null)

  const touchMyst = (m, extra = {}) => ({ ...m, ...extra, updatedAt: new Date().toISOString() })

  const toggle = id => onUpdateBook({
    mysteries: book.mysteries.map(m =>
      m.id === id ? touchMyst(m, { resolved: !m.resolved, status: m.resolved ? 'open' : 'resolved' }) : m
    ),
  })

  const changeStatus = (id, newStatus) => {
    onUpdateBook({
      mysteries: book.mysteries.map(m =>
        m.id === id ? touchMyst(m, { status: newStatus }) : m
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
      mysteries: book.mysteries.map(my => my.id === m.id ? touchMyst(my, {
        observation:     text || undefined,
        observationDate: text ? today() : undefined,
      }) : my),
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
      mysteries: book.mysteries.map(my => my.id === m.id ? touchMyst(my, {
        text,
        originalText: my.originalText ?? my.text,
      }) : my),
    })
    setRefiningId(null)
  }

  const deleteMystery = (id) => {
    onUpdateBook({ mysteries: book.mysteries.map(m => m.id === id ? { ...m, deleted: true, updatedAt: new Date().toISOString() } : m) })
    setDeletingId(null)
  }

  const addMystery = () => {
    if (!newQ.trim()) return
    const id       = uid('myst_')
    const text     = newQ.trim()
    const isFirst  = liveMysteries.length === 0
    if (isFirst) track('first_mystery', { format: book.format })
    onUpdateBook({
      mysteries: [...book.mysteries, {
        id,
        text,
        status: 'open',
        chapter: book.currentChapter || 1,
        resolved: false,
        rereadEra: book.rereadCount || 0,
        updatedAt: new Date().toISOString(),
      }],
    })
    setNewQ('')
    setAdding(false)

    // ── Companion thread — quiet depth and finished books suppress replies ──
    if (depth === 'quiet' || book.status === 'finished') return

    // First mystery earns a distinct response; later ones are hash-stable
    const response  = isFirst
      ? 'The reading is open now. This question will move with you.'
      : generateMysteryResponse(text)
    const baseDelay = 900 + Math.min(text.split(/\s+/).length * 35, 900)
    const delay     = baseDelay + Math.floor(Math.random() * 400) - 200
    if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current)
    setThinkingMystId(id)
    thinkingTimerRef.current = setTimeout(() => {
      setThinkingMystId(null)
      setMysteryReplies(prev => ({ ...prev, [id]: response }))
    }, delay)
  }

  const currentMysteries  = liveMysteries.filter(m => m.archivedEra === undefined)
  const archivedMysteries = liveMysteries.filter(m => m.archivedEra !== undefined)

  // Book temporal state — mysteries inherit the environmental silence of an abandoned book.
  // A mystery in a book that hasn't been touched for 90+ days recedes with it.
  // Haunted mysteries resist this pull more than cooling ones — they stay slightly more alive.
  const bookDaysSince = book.lastUpdated
    ? Math.floor((Date.now() - new Date(book.lastUpdated)) / 86400000)
    : 0

  // Cross-surface residue — theory notes bleeding into mystery surface
  const theoryNoteCount = useMemo(
    () => liveItems(book.notes).filter(n => n.tag === 'theory').length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.notes]
  )

  // Spoiler gate — veiled mysteries (ahead of reader's chapter) are never shown
  // individually. They surface naturally as the reader arrives. A single ambient
  // note at the bottom tells the reader how many are waiting ahead.
  const allViewed  = currentMysteries
    .map(m => getMysteryView(book, m, mode))
    .filter(Boolean)

  const viewedMysteries = allViewed.filter(m => !m._veiled)
  const veiledCount     = allViewed.filter(m =>  m._veiled).length

  const active   = viewedMysteries.filter(m => !m.resolved)
  const resolved = viewedMysteries.filter(m =>  m.resolved)
  const visible  = showing === 'active' ? active : showing === 'resolved' ? resolved : viewedMysteries

  const anyVeiled = veiledCount > 0
  const noneAtAll = currentMysteries.length === 0 || (viewedMysteries.length === 0 && !adding)

  // If there are only veiled mysteries (none the reader can see), treat
  // the visible surface as empty — the "waiting ahead" note carries the message.
  const fullyVeiled = currentMysteries.length > 0 && viewedMysteries.length === 0 && veiledCount > 0

  const finished = book.status === 'finished'

  const emptyTitle = noneAtAll && !fullyVeiled
    ? finished
      ? 'No threads were opened during this reading.'
      : depth === 'quiet'
        ? 'Questions accumulate here, without interpretation.'
        : 'Questions tend to appear once the story begins moving.'
    : showing === 'resolved'
      ? finished ? 'None of the threads found an answer.' : 'Nothing has found its answer yet.'
      : fullyVeiled
        ? null  // handled by veiledCount note below
        : finished ? 'Every thread found its answer.' : 'No open threads.'

  const emptyBody = noneAtAll && !fullyVeiled
    ? finished
      ? 'Questions from after the last page can still be recorded here.'
      : depth === 'quiet'
        ? 'Open a thread whenever the story holds something worth tracing.'
        : depth === 'saturated'
          ? 'Open the first thread — write what the story is withholding.'
          : "Open a thread whenever the story raises a question it isn't ready to answer."
    : showing === 'resolved'
      ? finished ? 'The reading ended with questions still open.' : "When a question finally gets its answer, it will rest here."
      : fullyVeiled
        ? null
        : finished ? 'Every open thread in this reading was resolved before the last page.' : "Every open thread in this reading has been resolved."

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-7 flex-wrap gap-2">
        <div className="flex items-center">
          {[
            ['active',   `open (${active.length})`],
            ['all',      'All'],
            ['resolved', `answered (${resolved.length})`],
          ].map(([k, l], i) => (
            <span key={k} className="flex items-center">
              {i > 0 && <span className="mx-2 select-none" style={{ color: 'var(--color-ink-200)', fontSize: 9 }}>·</span>}
              <button onClick={() => setShowing(k)}
                className={`filter-link ${showing === k ? 'active' : ''}`}>
                {l}
              </button>
            </span>
          ))}
        </div>
        <button onClick={() => setAdding(true)}
          className="text-[12px] italic hover:opacity-75 transition-opacity"
          style={{ color: 'var(--ca, #B8860B)' }}>
          {finished ? 'add a reflection →' : 'raise a question →'}
        </button>
      </div>

      {/* Cross-surface residue — theories from Notes bleeding into Mysteries */}
      {theoryNoteCount >= 3 && active.length >= 2 && !adding && (
        <p className="text-[11px] text-ink-400 italic mb-5 leading-relaxed">
          Some of what you've been theorising may already be moving toward these.
        </p>
      )}

      {adding && (
        <div className="bg-cream-50 border rounded-2xl p-4 mb-5 animate-slide-up" style={{ borderColor:'var(--ca-border, #E8D090)' }}>
          {/* First-mystery framing — a different ceremony than the second or fifth */}
          {liveMysteries.length === 0 && !finished && (
            <p className="italic mb-3 leading-relaxed" style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>
              The first question opens the reading to something larger. Name what the story hasn't resolved yet.
            </p>
          )}
          <textarea value={newQ} onChange={e => setNewQ(e.target.value)} rows={2}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addMystery() } }}
            placeholder={finished ? 'A question this story left open…' : 'What question is this story carrying?'}
            autoFocus
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm text-ink-800 placeholder-ink-400 resize-none transition-all mb-3"
            style={{ background: 'var(--color-card-base)' }} />
          <div className="flex items-center justify-end gap-4">
            <button onClick={() => { setAdding(false); setNewQ('') }}
              className="text-[12px] italic text-ink-400 hover:text-ink-600 transition-colors">
              cancel
            </button>
            <button onClick={addMystery}
              className="text-[12px] italic hover:opacity-75 transition-opacity"
              style={{ color: 'var(--ca, #B8860B)', fontWeight: 500 }}>
              {depth === 'quiet' || finished ? 'Record this →' : 'Open thread →'}
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 && !fullyVeiled ? (
        <EmptyState
          icon={<Ico.Mystery />}
          title={emptyTitle ?? 'No open threads.'}
          body={emptyBody ?? ''}
          action={noneAtAll && (
            <button onClick={() => setAdding(true)}
              className="text-[13px] italic hover:opacity-75 transition-opacity"
              style={{ color: 'var(--ca, #B8860B)' }}>
              raise the first question →
            </button>
          )}
        />
      ) : (
        <div className="space-y-3">
          {visible.map(m => {
            const isObserving = observingId  === m.id
            const isRefining  = refiningId   === m.id
            const showPicker  = statusPickerId === m.id
            const isDeleting  = deletingId   === m.id

            const mysteryGravity = getMysteryGravity(m, book.currentChapter || 0)
            const mHauntScore    = m.resolved || m._veiled ? 0 : mysteryHauntScore(m, book)
            const mHauntLevel    = hauntLevel(mHauntScore)

            // Environmental cooling — mysteries recede when their book has gone quiet.
            // Explicit dormant status always applies. Book abandonment (90+ days) applies
            // to all mysteries in that book. Haunted mysteries resist the pull slightly.
            const isEnvironmentallyQuiet = !m.resolved && !m._veiled
              && (m.status === 'dormant' || bookDaysSince > 90)
            const isBookCooling = !m.resolved && !m._veiled
              && bookDaysSince > 45 && bookDaysSince <= 90

            // Haunted mysteries resist environmental cooling — they stay more visible
            // than quiet threads even in dormant books. Something here persists.
            const mysteryOpacity = isEnvironmentallyQuiet
              ? mHauntLevel === 'haunted'    ? 0.75  // was 0.60 — resists dormancy
              : mHauntLevel === 'persistent' ? 0.60  // was 0.50 — some resistance
              :                                0.40
              : isBookCooling ? 0.78
              : undefined

            const mysteryFilter = isEnvironmentallyQuiet && mHauntLevel !== 'haunted'
              ? 'saturate(0.50)'
              : undefined

            return (
              <div key={m.id}
                className={`note-card p-4 transition-all ${
                  m.resolved
                    ? 'mystery-resolved'
                    : m._veiled
                      ? 'opacity-75'
                      : ''
                } ${flashItemId != null && flashItemId === m.id ? 'item-glow' : ''}`}
                style={{
                  background:  m.resolved ? 'var(--color-cream-200)' : 'var(--color-card-base)',
                  opacity:     mysteryOpacity,
                  filter:      mysteryFilter,
                  transition:  'opacity .35s ease, filter .35s ease',
                }}>
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => !m._veiled && toggle(m.id)}
                    disabled={m._veiled}
                    className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                      m._veiled ? 'border-ink-200 cursor-default'
                      : 'border-ink-300 hover:border-gold'
                    }`}
                    style={m.resolved ? { borderColor: 'var(--color-gold-accent)', opacity: 0.55 } : {}}>
                    {m.resolved && <span style={{ fontSize: 8, color: 'var(--color-gold-accent)' }}>✦</span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Mystery text — or refinement input */}
                    {isRefining ? (
                      <div className="animate-fade-in mb-2">
                        <textarea value={refineText} onChange={e => setRefineText(e.target.value)}
                          rows={2} autoFocus
                          className="w-full border border-ink-200 rounded-lg px-2.5 py-1.5 text-[13px] text-ink-800 bg-cream-200 resize-none" />
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

                    {/* Original question — shown when mystery has been reframed */}
                    {!isRefining && !m._veiled && m.originalText && (
                      <p className="text-[11px] text-ink-300 italic mt-1 leading-relaxed">
                        Originally: "{m.originalText}"
                      </p>
                    )}

                    {/* Metadata row */}
                    {!isRefining && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {!m._veiled && (
                          <span className="text-[11px] text-ink-400">
                            ch. {m.chapter}
                            {notesByChapter[m.chapter] >= 2 && (
                              <span className="companion-echo" style={{ fontSize: 10 }}> · {notesByChapter[m.chapter]} thoughts then</span>
                            )}
                            {!m.resolved && !finished && (book.currentChapter - m.chapter) >= 8 && (
                              <span className="text-ink-300 italic"> · {book.currentChapter - m.chapter} ch. open</span>
                            )}
                          </span>
                        )}

                        {/* Status badge — clickable for unresolved non-veiled active books */}
                        {!m._veiled && !m.resolved && !finished ? (
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

                        {/* Reframed indicator */}
                        {!m._veiled && m.originalText && (
                          <span className="text-[11px] text-ink-300 italic">· reframed</span>
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

                    {/* Companion gravity — suppressed for finished books (story references don't hold) */}
                    {mysteryGravity && !isRefining && !isObserving && !isDeleting && !finished && (
                      <p className={`text-[11px] italic mt-2 leading-relaxed ${
                        mHauntLevel === 'haunted'    ? 'text-ink-500'
                        : mHauntLevel === 'persistent' ? 'text-ink-400'
                        : mHauntLevel === 'cooling'    ? 'text-ink-300'
                        : 'text-ink-400'
                      }`}>
                        {mHauntLevel === 'haunted' && (
                          <span className="mr-1 text-[9px] opacity-60" style={{ color: 'var(--ca, #B8860B)' }}>✦</span>
                        )}
                        {mysteryGravity}
                      </p>
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

                    {/* Delete confirmation */}
                    {isDeleting && (
                      <div className="mt-3 animate-fade-in">
                        <p className="text-[12px] text-ink-600 mb-2.5 leading-relaxed">
                          Remove this thread from the companion?
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => setDeletingId(null)}
                            className="text-[12px] text-ink-600 hover:text-ink-800 px-3 py-1.5 rounded-lg border border-ink-200 transition-colors">
                            Keep it
                          </button>
                          <button onClick={() => deleteMystery(m.id)}
                            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white bg-ember hover:bg-ember-light transition-colors">
                            Yes, remove it
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Companion thread — below the freshly opened question ── */}
                    {(thinkingMystId === m.id || mysteryReplies[m.id]) && !isRefining && !isObserving && !isDeleting && (
                      <div style={{
                        marginTop: 10,
                        marginLeft: 2,
                        paddingLeft: 12,
                        borderLeft: '1px solid color-mix(in srgb, var(--ca) 15%, transparent)',
                      }}>
                        {thinkingMystId === m.id ? (
                          <div style={{ display: 'flex', gap: 5, paddingTop: 3, paddingBottom: 3 }}>
                            {[[2.3, 0], [3.1, 0.7], [1.9, 1.5]].map(([dur, d], i) => (
                              <span key={i} style={{
                                fontSize: 9,
                                color: 'var(--ca, #B8860B)',
                                animation: `companionPulse ${dur}s ease-in-out infinite`,
                                animationDelay: `${d}s`,
                                display: 'inline-block',
                              }}>✦</span>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, paddingTop: 1 }}>
                            <span className="companion-glyph-settle" style={{
                              fontSize: 9, color: 'var(--ca, #B8860B)',
                              marginTop: 4, flexShrink: 0, opacity: 0.65,
                            }}>✦</span>
                            <p className="companion-text-surface" style={{
                              fontSize: 14,
                              fontFamily: 'var(--font-sans)',
                              lineHeight: 1.6,
                              color: 'var(--color-ink-700)',
                              margin: 0,
                            }}>
                              {mysteryReplies[m.id]}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Thread actions */}
                    {!m._veiled && !m.resolved && !isRefining && !isObserving && !isDeleting && (
                      <div className="flex items-center gap-4 mt-2.5">
                        <button onClick={() => startObserving(m)}
                          className="text-[11px] text-ink-300 hover:text-ink-500 italic transition-colors">
                          add to this
                        </button>
                        <button onClick={() => startRefining(m)}
                          className="text-[11px] text-ink-300 hover:text-ink-500 transition-colors">
                          sharpen
                        </button>
                        <button onClick={() => setDeletingId(m.id)}
                          className="text-[11px] text-ink-300 hover:text-ember transition-colors ml-auto">
                          Remove
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

      {anyVeiled && mode !== 'full' && !finished && (
        <p className="font-serif italic mt-6" style={{ fontSize: 12, color: 'var(--color-ink-400)', paddingLeft: 2 }}>
          {veiledCount} thread{veiledCount !== 1 ? 's' : ''} waiting ahead — {veiledCount !== 1 ? 'they\'ll' : 'it\'ll'} surface as you reach {veiledCount !== 1 ? 'them' : 'it'}.
        </p>
      )}

      {archivedMysteries.length > 0 && (
        <div className="mt-8 border-t border-ink-100 pt-6">
          <button
            onClick={() => setShowArchived(v => !v)}
            className="flex items-center gap-2 text-[12px] text-ink-400 hover:text-ink-600 italic transition-colors w-full text-left"
          >
            <span className={`transition-transform duration-200 ${showArchived ? 'rotate-90' : ''}`}>▶</span>
            From {archivedMysteries.length === 1 ? 'a previous reading' : 'previous readings'} ({archivedMysteries.length})
          </button>
          {showArchived && (
            <div className="mt-4 space-y-2 animate-fade-in">
              {archivedMysteries.map(m => (
                <div key={m.id} className="rounded-xl border border-ink-200 bg-ink-50 p-4 opacity-75">
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 border-ink-300"
                      style={m.resolved ? { borderColor: 'var(--color-gold-accent)', opacity: 0.55 } : {}}
                    >
                      {m.resolved && <span style={{ fontSize: 8, color: 'var(--color-gold-accent)' }}>✦</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-relaxed ${
                        m.resolved ? 'line-through text-ink-400' : 'text-ink-600'
                      }`}>{m.text}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {m.chapter && (
                          <span className="text-[11px] text-ink-400">Ch. {m.chapter}</span>
                        )}
                        <span className={`text-[10px] font-medium px-2 py-[2px] rounded-full border ${
                          STATUS_STYLE[m.status] ?? STATUS_STYLE.open
                        }`}>
                          {MYSTERY_STATUSES[m.status]?.label ?? m.status}
                        </span>
                      </div>
                      {m.observation && (
                        <div className="mt-2 pl-3 border-l-2 border-ink-200">
                          <p className="text-[12px] text-ink-400 italic leading-relaxed">{m.observation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
