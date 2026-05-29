import { useState, useEffect, useMemo, useRef } from 'react'
import { generatePresence }      from '../../utils/companionPresence.js'
import {
  assembleReflectionContext,
  hashContext,
  shouldRegenerate,
  generateRuleBasedReflections,
  getActiveReflections,
  markReflectionSurfaced,
  deduplicateReflections,
  isReflectionPoolSaturated,
} from '../../utils/reflectionEngine.js'
import { generateCompanionReflections } from '../../utils/aiExtractor.js'
import { computePresenceVisibility, shouldYieldToBook } from '../../utils/invisiblePresence.js'
import { isMysteryVisible, getEffectiveMode } from '../../utils/spoiler.js'
import { mysteryHauntScore, hauntLevel }       from '../../utils/hauntScore.js'
import { getProgress }   from '../../utils/progress.js'
import { useSettings }   from '../../context/SettingsContext.jsx'
import { useBooks }      from '../../context/BooksContext.jsx'

// ── Simulated local responses (no backend required this pass) ─────────────────
const RESPONSE_POOLS = {
  question: [
    "That question has weight. The story hasn't answered it directly — but it may be setting up the conditions.",
    "Worth keeping open. The story is still deciding what it means.",
    "Something in the earlier chapters might be circling the same ground from a different angle.",
  ],
  feeling: [
    "Something is accumulating in how you're reading this. The discomfort — or pull — is probably intentional.",
    "The story earns that feeling. It's been building toward it for a while.",
    "That's a response worth trusting. The text put it there.",
  ],
  character: [
    "That character is carrying more than the surface story. Something in their behavior keeps pointing elsewhere.",
    "There's a pattern forming around that figure. Worth watching what they do when the stakes rise.",
    "The relationship dynamics around them are still in motion.",
  ],
  default: [
    "The story is still settling around that. Worth keeping the question open.",
    "Something beneath the surface is at work there. The text rewards slow attention.",
    "That observation belongs in the manuscript. It's doing something.",
  ],
}

function simulateResponse(message) {
  const m = message.toLowerCase()
  if (m.includes('why') || m.includes('what does') || m.includes('mean') || m.includes('?'))
    return RESPONSE_POOLS.question[Math.floor(Math.random() * RESPONSE_POOLS.question.length)]
  if (m.includes('feel') || m.includes('think') || m.includes('sad') || m.includes('beautiful') || m.includes('unsettl'))
    return RESPONSE_POOLS.feeling[Math.floor(Math.random() * RESPONSE_POOLS.feeling.length)]
  if (m.includes('character') || m.includes('person') || m.includes('he ') || m.includes('she ') || m.includes('they '))
    return RESPONSE_POOLS.character[Math.floor(Math.random() * RESPONSE_POOLS.character.length)]
  return RESPONSE_POOLS.default[Math.floor(Math.random() * RESPONSE_POOLS.default.length)]
}

// ── Chapter context greeting (rule-based, no AI required) ─────────────────────
function buildChapterGreeting(book) {
  const ch     = book.currentChapter || 0
  const total  = book.totalChapters  || 0
  const pct    = getProgress(book)
  const notes  = (book.notes || []).length
  const open   = (book.mysteries || []).filter(m => !m.resolved).length

  if (ch === 0) return null

  const position = total > 0 ? Math.round((ch / total) * 100) : null
  let line = `Chapter ${ch}`
  if (total > 0) line += ` of ${total}`

  if (position !== null) {
    if (position <= 15) return `${line}. Early days — everything is still possibility.`
    if (position <= 35) return `${line}. The story is finding its footing. Patterns are beginning to form.`
    if (position <= 55) return `${line}. The middle territory — where the story earns or loses what it promised.`
    if (position <= 75) {
      const tail = open >= 2 ? ` There are ${open} open threads still pulling.` : ''
      return `${line}. Deeper in now.${tail}`
    }
    if (position <= 90) return `${line}. The final stretch. The story is deciding what it was.`
    return `${line}. Nearly done. The ending is already determining how the whole thing will settle.`
  }

  if (notes >= 10) return `${line}. A well-annotated manuscript — the companion has been accumulating.`
  return `${line}.`
}

export default function CompanionBand({ book, onUpdateBook, onTabChange }) {
  const { settings }   = useSettings()
  const { updateBook } = useBooks()
  const mode           = getEffectiveMode(book, settings)

  // ── Ambient observation state ──────────────────────────────────────────────
  const [obsIdx,  setObsIdx]  = useState(0)
  const [obsFade, setObsFade] = useState(true)
  const surfacedRef           = useRef(new Set())
  const reflCacheRef          = useRef(book.reflectionCache)
  useEffect(() => { reflCacheRef.current = book.reflectionCache }, [book.reflectionCache])

  // ── Conversation state (ephemeral — never persisted) ──────────────────────
  const [input,    setInput]    = useState('')
  const [messages, setMessages] = useState([])  // [{ role: 'user'|'companion', text }]
  const [thinking, setThinking] = useState(false)
  const inputRef                = useRef()
  const messagesEndRef          = useRef()

  // ── Presence + visibility ──────────────────────────────────────────────────
  const presenceVisibility = useMemo(
    () => computePresenceVisibility(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.notes?.length, book.readingLog?.length,
     book.rereadCount, settings.insightStyle]
  )
  const yieldsToBook = useMemo(
    () => shouldYieldToBook(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.notes?.length, book.readingLog?.length,
     book.rereadCount, book.mysteries?.length, settings.insightStyle]
  )

  // ── Presence observations ──────────────────────────────────────────────────
  const presence = useMemo(
    () => generatePresence(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.mysteries?.length, book.notes?.length, book.chapters,
     book.readingLog?.length, book.characters?.main?.length,
     settings.spoilerMode, settings.insightStyle]
  )

  const cachedReflections = useMemo(
    () => deduplicateReflections(getActiveReflections(book, 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.reflectionCache?.contextHash, book.reflectionCache?.reflections?.length]
  )

  const { observations, reflIndexMap } = useMemo(() => {
    const map = {}
    if (!cachedReflections.length) return { observations: presence, reflIndexMap: map }
    const pool = [...presence]
    if (cachedReflections[0] && pool.length >= 1) {
      const pos = Math.min(1, pool.length)
      pool.splice(pos, 0, cachedReflections[0].text)
      map[pos] = cachedReflections[0].id
    }
    return { observations: pool.filter(Boolean), reflIndexMap: map }
  }, [presence, cachedReflections])

  const poolSaturated = isReflectionPoolSaturated(book)

  // ── Surfaced open questions ────────────────────────────────────────────────
  const openQuestions = useMemo(() => {
    return (book.mysteries || [])
      .filter(m => !m.resolved && isMysteryVisible(book, m, mode))
      .sort((a, b) => mysteryHauntScore(b, book) - mysteryHauntScore(a, book))
      .slice(0, 3)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.mysteries?.length, book.currentChapter, mode])

  // ── Surfaced characters ────────────────────────────────────────────────────
  const surfacedCharacters = useMemo(() => {
    const chars = (book.characters?.main || []).slice(0, 3)
    return chars
  }, [book.characters?.main])

  // ── Reflection generation ──────────────────────────────────────────────────
  useEffect(() => {
    const ctx = assembleReflectionContext(book, settings)
    if (ctx.noteCount < 3 && ctx.openMysteries.length < 2) return
    const hash = hashContext(ctx)
    if (!shouldRegenerate(book, hash)) return
    const ruleReflections = generateRuleBasedReflections(ctx, settings.insightStyle)
    if (!ruleReflections.length) return
    updateBook(book.id, {
      reflectionCache: {
        contextHash: hash,
        generatedAt: new Date().toISOString(),
        reflections: ruleReflections,
        aiEnhanced:  false,
      },
    })
    if (ctx.noteCount >= 5) {
      Promise.resolve()
        .then(() => generateCompanionReflections(ctx, settings.anthropicKey || ''))
        .then(aiR => {
          if (!aiR?.length) return
          updateBook(book.id, {
            reflectionCache: {
              contextHash: hash,
              generatedAt: new Date().toISOString(),
              reflections: [...aiR, ...ruleReflections],
              aiEnhanced:  true,
            },
          })
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, book.notes?.length, book.currentChapter, book.readingLog?.length,
      book.mysteries?.length, settings.insightStyle])

  // ── Mark reflections surfaced ──────────────────────────────────────────────
  useEffect(() => {
    const reflId = reflIndexMap[obsIdx]
    if (!reflId || surfacedRef.current.has(reflId)) return
    surfacedRef.current.add(reflId)
    const cache = reflCacheRef.current
    if (!cache?.reflections?.length) return
    const updated = markReflectionSurfaced(cache.reflections, reflId)
    updateBook(book.id, { reflectionCache: { ...cache, reflections: updated } })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obsIdx, reflIndexMap, book.id, updateBook])

  // ── Carousel auto-advance ──────────────────────────────────────────────────
  useEffect(() => {
    if (observations.length < 2 || yieldsToBook) return
    const interval = presenceVisibility < 0.65 ? 18000 : 12000
    const t = setTimeout(function tick() {
      setObsFade(false)
      setTimeout(() => {
        setObsIdx(i => (i + 1) % observations.length)
        setObsFade(true)
        setTimeout(tick, interval + (Math.random() - 0.5) * 3000)
      }, 280)
    }, interval + Math.random() * 2000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observations.length, yieldsToBook, presenceVisibility])

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Textarea auto-resize ──────────────────────────────────────────────────
  const autoResize = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    setMessages(m => [...m, { role: 'user', text }])
    setInput('')
    // Reset textarea height after clear
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    setThinking(true)

    const delay = 900 + Math.random() * 900
    setTimeout(() => {
      const response = simulateResponse(text)
      setMessages(m => [...m, { role: 'companion', text: response }])
      setThinking(false)
    }, delay)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const chapterGreeting = buildChapterGreeting(book)
  const pct             = getProgress(book)
  const hasConversation = messages.length > 0

  const ambientObservation = !yieldsToBook && observations.length > 0
    ? observations[obsIdx]
    : null

  return (
    <div className="px-5 sm:px-10" style={{ maxWidth: 1000, margin: '20px auto 0' }}>
      <div className={`companion-band companion-band-body${thinking ? ' companion-band--thinking' : ''}`}>

        {/* ── Header row: chapter context + progress ── */}
        {chapterGreeting && (
          <div className="flex items-start justify-between mb-4 gap-3">
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 10,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: 'var(--color-text-dim)',
              fontWeight: 400,
              lineHeight: 1.5,
              flex: 1,
              minWidth: 0,
            }}>
              {chapterGreeting}
            </p>
            {pct > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                <div style={{
                  width: 56, height: 2,
                  background: 'var(--color-hairline)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: 'var(--color-accent)',
                    borderRadius: 2,
                    boxShadow: '0 0 8px var(--color-glow)',
                    transition: 'width 1.0s ease',
                  }} />
                </div>
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 10,
                  color: 'var(--color-text-dim)',
                  whiteSpace: 'nowrap',
                }}>
                  {pct}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Main band content ── */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left: input first, then ambient reflection / conversation */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Input field — primary position */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize() }}
                onInput={autoResize}
                onKeyDown={handleKeyDown}
                placeholder="A thought, a question, a reaction…"
                className="companion-band-input"
                rows={1}
                disabled={thinking}
              />
              {input.trim() && (
                <button
                  onClick={sendMessage}
                  className="companion-band-send"
                  disabled={thinking}
                >
                  send →
                </button>
              )}
              {hasConversation && !input.trim() && (
                <button
                  onClick={() => setMessages([])}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-dim)',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: '6px 4px',
                    whiteSpace: 'nowrap',
                    opacity: 0.6,
                    transition: 'opacity 0.40s ease',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.6' }}
                >
                  clear
                </button>
              )}
            </div>

            {/* Conversation history — ephemeral, manuscript annotation style */}
            {hasConversation && (
              <div className="flex flex-col gap-4" style={{ maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                {messages.map((m, i) =>
                  m.role === 'user'
                    ? <p key={i} className="band-user-entry">{m.text}</p>
                    : <p key={i} className="band-companion-entry companion-band-response">{m.text}</p>
                )}
                {thinking && (
                  <div className="flex gap-3" style={{ paddingLeft: 18 }}>
                    {[0, 0.4, 0.8].map(delay => (
                      <span
                        key={delay}
                        className="ember-think"
                        style={{ fontSize: 10, color: 'var(--color-accent)', animationDelay: `${delay}s` }}
                      >✦</span>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Ambient reflection — secondary position, below input */}
            {!hasConversation && ambientObservation && (
              <p
                className="companion-band-reflection"
                style={{
                  opacity: obsFade ? presenceVisibility : 0,
                  transition: 'opacity 0.52s ease',
                }}
              >
                {ambientObservation}
              </p>
            )}

            {/* Ambient silence */}
            {!hasConversation && !ambientObservation && (
              <p className="companion-band-reflection" style={{ opacity: 0.42 }}>
                {poolSaturated
                  ? 'Add more notes to deepen the manuscript.'
                  : 'The companion is present.'}
              </p>
            )}

          </div>

          {/* Right: surfaced context — desktop sidebar, mobile footer strip */}
          {(openQuestions.length > 0 || surfacedCharacters.length > 0) && (<>
            {/* Desktop sidebar */}
            <div
              className="hidden lg:flex flex-col gap-3"
              style={{ width: 220, flexShrink: 0 }}
            >
              {openQuestions.length > 0 && (
                <div>
                  <p style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-dim)',
                    marginBottom: 8,
                  }}>
                    Open Questions
                  </p>
                  <div className="flex flex-col gap-2">
                    {openQuestions.map((m, i) => {
                      const hl = hauntLevel(mysteryHauntScore(m, book))
                      const haunted = hl === 'haunted' || hl === 'persistent'
                      return (
                        <button
                          key={m.id ?? i}
                          className="companion-band-context-card w-full text-left"
                          onClick={() => onTabChange?.('questions', m.id ?? i)}
                          title="Open in Questions tab"
                        >
                          <div className="flex items-start gap-2">
                            <span style={{
                              fontSize: 8,
                              color: haunted ? 'var(--color-accent)' : 'var(--color-text-dim)',
                              opacity: haunted ? 0.85 : 0.45,
                              flexShrink: 0,
                              marginTop: 3,
                            }}>✦</span>
                            <p style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: 12,
                              fontStyle: 'italic',
                              lineHeight: 1.5,
                              color: 'var(--color-text-secondary)',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>
                              {m.text}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {surfacedCharacters.length > 0 && (
                <div>
                  <p style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-dim)',
                    marginBottom: 8,
                  }}>
                    Characters
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {surfacedCharacters.map((c, i) => (
                      <button
                        key={c.id ?? i}
                        onClick={() => onTabChange?.('characters', c.id ?? i)}
                        title="Open in Characters tab"
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 11,
                          fontStyle: 'italic',
                          color: 'var(--color-text-secondary)',
                          background: 'var(--color-accent-dim)',
                          border: '1px solid var(--color-hairline)',
                          borderRadius: 6,
                          padding: '3px 8px',
                          cursor: 'pointer',
                          transition: 'background 0.4s ease, border-color 0.4s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'color-mix(in srgb, var(--color-accent) 14%, transparent)'
                          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-accent) 35%, transparent)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'var(--color-accent-dim)'
                          e.currentTarget.style.borderColor = 'var(--color-hairline)'
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile footer strip — vertical stack, full-width sections */}
            <div
              className="lg:hidden"
              style={{
                borderTop: '1px solid var(--color-hairline)',
                paddingTop: 12,
                marginTop: 4,
              }}
            >
              <div className="flex flex-col gap-3">
                {openQuestions.length > 0 && (
                  <div className="w-full min-w-0">
                    <p style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-dim)',
                      marginBottom: 6,
                    }}>
                      Open Questions
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {openQuestions.slice(0, 2).map((m, i) => {
                        const hl = hauntLevel(mysteryHauntScore(m, book))
                        const haunted = hl === 'haunted' || hl === 'persistent'
                        return (
                          <button
                            key={m.id ?? i}
                            onClick={() => onTabChange?.('questions', m.id ?? i)}
                            className="text-left flex items-start gap-1.5 w-full min-w-0"
                          >
                            <span style={{
                              fontSize: 7,
                              color: haunted ? 'var(--color-accent)' : 'var(--color-text-dim)',
                              opacity: haunted ? 0.9 : 0.5,
                              flexShrink: 0,
                              marginTop: 3,
                            }}>✦</span>
                            <p style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: 11,
                              fontStyle: 'italic',
                              lineHeight: 1.45,
                              color: 'var(--color-text-secondary)',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              minWidth: 0,
                            }}>
                              {m.text}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {surfacedCharacters.length > 0 && (
                  <div className="w-full min-w-0">
                    <p style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-dim)',
                      marginBottom: 6,
                    }}>
                      Characters
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {surfacedCharacters.map((c, i) => (
                        <button
                          key={c.id ?? i}
                          onClick={() => onTabChange?.('characters', c.id ?? i)}
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 10,
                            fontStyle: 'italic',
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-accent-dim)',
                            border: '1px solid var(--color-hairline)',
                            borderRadius: 5,
                            padding: '2px 7px',
                            cursor: 'pointer',
                          }}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>)}

        </div>

      </div>
    </div>
  )
}
