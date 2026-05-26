import { useState, useCallback } from 'react'
import { useDirectionMode } from '../context/DirectionModeContext.jsx'
import { DIRECTIONS } from '../data/directions.js'

/* ══════════════════════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════════════════════ */

const LIBRARY = [
  { title: "The Master and Margarita", author: "Mikhail Bulgakov", progress: 59, daysReading: 54, notes: 23, depth: "deep",    status: "reading"  },
  { title: "Gilead",                   author: "Marilynne Robinson", progress: 10, daysReading: 8,  notes: 3,  depth: "early",   status: "reading"  },
  { title: "The Remains of the Day",   author: "Kazuo Ishiguro",     progress: 100,daysReading: 71, notes: 31, depth: "archival",status: "finished" },
  { title: "Middlemarch",              author: "George Eliot",        progress: 26, daysReading: 0,  notes: 12, depth: "dormant", status: "paused"   },
  { title: "Beloved",                  author: "Toni Morrison",       progress: 100,daysReading: 112,notes: 41, depth: "archival",status: "finished" },
]

const COVER_STYLES = [
  { bg: "linear-gradient(155deg, #16303E 0%, #285068 45%, #0B1E2C 100%)" }, // Master — deep teal-navy
  { bg: "linear-gradient(155deg, #B89060 0%, #D8C490 45%, #A07A40 100%)" }, // Gilead — golden tan
  { bg: "linear-gradient(155deg, #2A3A50 0%, #3D5470 45%, #1A2838 100%)" }, // Remains — steel blue
  { bg: "linear-gradient(155deg, #3A5238 0%, #527450 45%, #263A22 100%)" }, // Middlemarch — sage
  { bg: "linear-gradient(155deg, #4E1A1A 0%, #703030 45%, #380A0A 100%)" }, // Beloved — deep red
]

const OBSERVATIONS = [
  "Fifty-four days with this book. The questions you've been carrying — they're not getting smaller.",
  "Woland's reliability as a narrator is something you've returned to three times. That's not confusion. That's your instinct working.",
  "The questions you've left open outnumber the ones you've resolved. That's a reading posture, not a gap.",
  "Something shifted at chapter fourteen. The pace of your notes changed — more questions, fewer declarations.",
  "You've been in this book for nearly two months. The early certainties haven't held.",
  "The Master rarely appears, and yet he's organized your reading around his absence.",
]
const CANNED = {
  woland:    "Woland is the question the novel keeps refusing to answer directly. You've been circling that refusal for weeks.",
  master:    "The manuscript burns, and yet here you are still reading what it said. The novel knows what it's doing.",
  margarita: "She holds the emotional center that the Master cannot. You noticed that before the novel made it explicit.",
  moscow:    "The satire feels lighthearted until it doesn't. That tonal instability is doing real work.",
  default:   "That thread runs deeper than it first appears. Worth holding onto.",
}

const MYSTERIES = [
  { text: "Is Woland actually the devil or a metaphor for Soviet repression?", haunt: "haunted",    age: 28 },
  { text: "What happened to the Master's manuscript before he burned it?",     haunt: "persistent", age: 14 },
  { text: "The woman without a shadow at the theater — never returned to.",    haunt: "dormant",    age: 41 },
]
const NOTES = [
  { text: "Woland seems to know things he couldn't possibly know. His predictions are only about what is already true of people — not what will happen, but what already is.", tag: "theory",    days: 47 },
  { text: "The Moscow chapters feel like a different novel — lower stakes, satirical. Then Yeshua appears and everything shifts.",                                            tag: "confusing",  days: 39 },
  { text: "Margarita feels like the emotional center the novel has been moving toward. The Master can barely hold himself together; she holds everything.",                   tag: "character",  days: 3  },
]
const CHARACTERS = [
  { name: "Woland",    role: "The Stranger",      description: "Arrives in Moscow as a professor of black magic. His true nature is the question the novel refuses to resolve."               },
  { name: "The Master",role: "Novelist",           description: "Has written a novel about Pontius Pilate. Committed himself to a psychiatric ward to escape his work's rejection."           },
  { name: "Margarita", role: "The Master's Love",  description: "Devoted entirely to the Master's return. Her willingness to bargain is the novel's emotional center."                       },
  { name: "Behemoth",  role: "Woland's Retinue",   description: "A massive black cat who walks upright, plays chess, and has a peculiar fondness for vodka."                                 },
]
const CHAPTERS_DEMO = [
  { num: 15, title: "Nikanor Ivanovich's Dream", completed: true,  notesCount: 0, singularity: false },
  { num: 16, title: "The Execution",             completed: true,  notesCount: 1, singularity: false },
  { num: 17, title: "A Day of Unrest",           completed: true,  notesCount: 3, singularity: true  },
  { num: 18, title: "Hapless Visitors",          completed: true,  notesCount: 1, singularity: false },
  { num: 19, title: "Margarita",                 completed: false, notesCount: 0, singularity: false },
  { num: 20, title: "Azazello's Cream",          completed: false, notesCount: 0, singularity: false },
  { num: 21, title: "The Flight",                completed: false, notesCount: 0, singularity: false },
]
const DISCUSSION = [
  "Does Woland represent Satan, or something more ambiguous — a force of moral revelation rather than conventional evil?",
  "What does Bulgakov's portrait of Moscow's literary bureaucracy reveal about the relationship between art and power?",
  "Margarita bargains for the Master's return. What does the novel's conception of love require of its characters?",
]
const TABS = ['Progress', 'Characters', 'Notes', 'Mysteries', 'Discussion']

/* ══════════════════════════════════════════════════════════════════════════════
   SHARED HOOKS + COMPONENTS
══════════════════════════════════════════════════════════════════════════════ */

function useCompanion() {
  const [idx, setIdx]       = useState(0)
  const [fading, setFading] = useState(false)
  const [input, setInput]   = useState('')
  const [reply, setReply]   = useState(null)
  const [typing, setTyping] = useState(false)
  const next = useCallback(() => {
    setFading(true); setReply(null)
    setTimeout(() => { setIdx(i => (i + 1) % OBSERVATIONS.length); setFading(false) }, 480)
  }, [])
  const ask = useCallback(q => {
    if (!q.trim()) return
    const l = q.toLowerCase()
    let r = CANNED.default
    if (l.includes('woland') || l.includes('devil')) r = CANNED.woland
    else if (l.includes('master') || l.includes('manuscript')) r = CANNED.master
    else if (l.includes('margarita')) r = CANNED.margarita
    else if (l.includes('moscow') || l.includes('soviet')) r = CANNED.moscow
    setTyping(true); setReply(null); setInput('')
    setTimeout(() => { setReply(r); setTyping(false) }, 1100)
  }, [])
  return { text: reply || OBSERVATIONS[idx], fading, next, input, setInput, reply, typing, ask }
}

function BookCover({ index = 0, w = 44, h = 62, radius = 4, style = {} }) {
  const cover = COVER_STYLES[index % COVER_STYLES.length]
  return (
    <div style={{
      width: w, height: h, flexShrink: 0,
      background: cover.bg, borderRadius: radius,
      boxShadow: '0 2px 8px rgba(0,0,0,.22)', ...style,
    }} />
  )
}


/* ── Shared tab content pieces (unstyled, wrapped by each direction) ─────── */

function ProgressRows({ rowStyle, numStyle, checkStyle, titleStyle, badgeStyle, singularityStyle, currentChapter = 19 }) {
  return (
    <div>
      {CHAPTERS_DEMO.map((ch, i) => (
        <div key={i} style={typeof rowStyle === 'function' ? rowStyle(ch) : rowStyle}>
          <span style={typeof numStyle === 'function' ? numStyle(ch) : numStyle}>{ch.num}</span>
          <span style={typeof checkStyle === 'function' ? checkStyle(ch) : checkStyle}>
            {ch.completed ? '✓' : '·'}
          </span>
          <span style={{ flex: 1, ...(typeof titleStyle === 'function' ? titleStyle(ch) : titleStyle) }}>
            {ch.title}
            {ch.singularity && <span style={singularityStyle}> ✦</span>}
          </span>
          {ch.notesCount > 0 && <span style={badgeStyle}>{ch.notesCount}</span>}
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 1 — Restrained Editorial Literary
══════════════════════════════════════════════════════════════════════════════ */

const D1DARK = {
  bg: '#141210', cardBase: '#1E1C18',
  textPrimary: '#E6DDD0', textSecondary: '#9A8E80', textDim: '#5A524A',
  gold: '#C49040', goldDim: 'rgba(196,144,64,.18)', goldBorder: 'rgba(196,144,64,.30)',
  separator: '#2C2820', separatorSoft: '#242018',
  companionBorder: 'rgba(196,144,64,.35)',
}
const D1LIGHT = {
  bg: '#FFFDF9', cardBase: '#FFFDF9',
  textPrimary: '#1C1917', textSecondary: '#78716C', textDim: '#A8A29E',
  gold: '#B8860B', goldDim: 'rgba(184,134,11,.15)', goldBorder: 'rgba(184,134,11,.30)',
  separator: '#E7E5E0', separatorSoft: '#F0ECE6',
  companionBorder: 'rgba(184,134,11,.35)',
}

function D1Editorial() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]     = useState('Mysteries')
  const [libExpanded, setLibExpanded] = useState(false)
  const [hoveredBook, setHoveredBook] = useState(null)
  const [hoveredTab, setHoveredTab]   = useState(null)
  const M = mode === 'dark' ? D1DARK : D1LIGHT

  const visibleBooks = libExpanded ? LIBRARY : LIBRARY.filter(b => b.status === 'reading')

  const tabContent = () => {
    switch (activeTab) {
      case 'Progress':
        return (
          <div key="progress" className="view-enter">
            <p style={SL}>Progress</p>
            <p style={{ fontSize: 28, fontFamily: SERIF, fontWeight: 600, color: M.textPrimary, letterSpacing: '-0.02em', marginBottom: 4 }}>Chapter 19</p>
            <p style={{ fontSize: 13, color: M.textDim, marginBottom: 28 }}>of 32 · 59% complete · 54 days reading</p>
            <ProgressRows
              rowStyle={ch => ({ display: 'flex', gap: 12, alignItems: 'baseline', padding: '9px 0', borderBottom: `1px solid ${M.separatorSoft}`, opacity: ch.completed ? 1 : 0.55 })}
              numStyle={{ fontSize: 11, color: M.textDim, minWidth: 24 }}
              checkStyle={ch => ({ fontSize: 12, color: ch.completed ? M.gold : M.textDim, minWidth: 16 })}
              titleStyle={ch => ({ fontSize: 14, color: ch.singularity ? M.textPrimary : M.textSecondary })}
              badgeStyle={{ fontSize: 10, color: M.gold, marginLeft: 4 }}
              singularityStyle={{ color: M.gold, fontSize: 11 }}
            />
          </div>
        )
      case 'Characters':
        return (
          <div key="chars" className="view-enter">
            <p style={SL}>Characters</p>
            {CHARACTERS.map((ch, i) => (
              <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${M.separatorSoft}` }}>
                <p style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: M.textPrimary, marginBottom: 2, letterSpacing: '-0.01em' }}>{ch.name}</p>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: M.textDim, marginBottom: 8 }}>{ch.role}</p>
                <p style={{ fontSize: 14, color: M.textSecondary, lineHeight: 1.65 }}>{ch.description}</p>
              </div>
            ))}
          </div>
        )
      case 'Notes':
        return (
          <div key="notes" className="view-enter">
            <p style={SL}>Your notes</p>
            {NOTES.map((n, i) => (
              <div key={i} style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 14, color: M.textSecondary, lineHeight: 1.7, marginBottom: 6 }}>{n.text}</p>
                <p style={{ fontSize: 11, color: M.textDim }}>{n.days}d ago · {n.tag}</p>
              </div>
            ))}
          </div>
        )
      case 'Mysteries':
        return (
          <div key="myst" className="view-enter">
            <p style={SL}>Open questions</p>
            {MYSTERIES.map((m, i) => (
              <div key={i} style={{ marginBottom: 22 }}>
                <p style={{ fontSize: 14, fontFamily: SERIF, fontStyle: 'italic', color: m.haunt === 'haunted' ? M.textPrimary : m.haunt === 'dormant' ? M.textDim : M.textSecondary, lineHeight: 1.6 }}>
                  {m.haunt === 'haunted' && <span style={{ color: M.gold, marginRight: 8 }}>✦</span>}
                  {m.text}
                </p>
              </div>
            ))}
          </div>
        )
      case 'Discussion':
        return (
          <div key="disc" className="view-enter">
            <p style={SL}>Discussion</p>
            {DISCUSSION.map((q, i) => (
              <div key={i} style={{ marginBottom: 24, paddingLeft: 16, borderLeft: `2px solid ${M.goldBorder}` }}>
                <p style={{ fontSize: 14, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.65 }}>{q}</p>
              </div>
            ))}
          </div>
        )
      default: return null
    }
  }

  const SL = { fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 22 }
  const SERIF = "'Playfair Display', Georgia, serif"

  return (
    <div style={{ background: M.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '52px 28px 0' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 6 }}>Direction 1</p>
          <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 10 }}>Restrained Editorial Literary</h2>
          <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, maxWidth: 480 }}>
            The Criterion Collection meets The Paris Review. Typography leads. Companion voice lives in a gold-bordered margin inset. Cards are replaced by vertical rhythm.
          </p>
        </div>
      </div>
      <div style={{ maxWidth: 640, margin: '36px auto 0', padding: '0 28px' }}>
        <div style={{ borderTop: `1px solid ${M.separator}` }} />
      </div>

      {/* Library */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 28px' }}>
        <p style={{ ...SL, marginBottom: 32 }}>Reading</p>
        {visibleBooks.map((b, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredBook(i)}
            onMouseLeave={() => setHoveredBook(null)}
            style={{
              paddingBottom: 28, marginBottom: 28,
              borderBottom: `1px solid ${M.separatorSoft}`,
              opacity: b.depth === 'dormant' ? 0.5 : 1,
              transition: 'opacity .2s',
            }}
          >
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <BookCover index={LIBRARY.indexOf(b)} w={36} h={50} radius={3} style={{ marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <p style={{
                    fontFamily: SERIF,
                    fontSize: b.depth === 'deep' ? 20 : b.depth === 'archival' ? 16 : 18,
                    fontWeight: b.depth === 'deep' ? 600 : 400,
                    color: hoveredBook === i && b.depth !== 'dormant' ? M.gold : M.textPrimary,
                    lineHeight: 1.25, marginBottom: 4,
                    letterSpacing: b.depth === 'deep' ? '-0.015em' : 0,
                    transition: 'color .15s',
                  }}>{b.title}</p>
                  {b.status === 'reading' && <p style={{ fontSize: 11, color: M.textDim, whiteSpace: 'nowrap', flexShrink: 0 }}>{b.progress}%</p>}
                </div>
                <p style={{ fontSize: 12, fontFamily: SERIF, fontStyle: 'italic', color: M.textDim }}>
                  {b.author}
                  {b.status === 'finished' && <span style={{ marginLeft: 12, fontFamily: 'Inter, sans-serif', fontStyle: 'normal', fontSize: 10, letterSpacing: '0.06em', color: M.textDim }}>complete</span>}
                  {b.status === 'paused'   && <span style={{ marginLeft: 12, fontFamily: 'Inter, sans-serif', fontStyle: 'normal', fontSize: 10, letterSpacing: '0.06em', color: M.textDim }}>set aside</span>}
                </p>
                {b.depth === 'deep' && (
                  <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: `2px solid ${M.companionBorder}` }}>
                    <p style={{ fontSize: 12, fontFamily: SERIF, fontStyle: 'italic', color: M.gold }}>{b.notes} thoughts · 3 open questions</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {!libExpanded && (
          <button
            onMouseEnter={e => e.currentTarget.style.color = M.gold}
            onMouseLeave={e => e.currentTarget.style.color = M.textDim}
            onClick={() => setLibExpanded(true)}
            style={{ fontSize: 12, fontFamily: SERIF, fontStyle: 'italic', color: M.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color .15s' }}
          >
            See all {LIBRARY.length} companions →
          </button>
        )}
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ borderTop: `1px solid ${M.separator}` }} />
      </div>

      {/* Book detail */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '52px 28px 32px' }}>
        {/* Companion block */}
        <div style={{ borderLeft: `2px solid ${M.companionBorder}`, paddingLeft: 20, marginBottom: 44 }}>
          <p style={{ fontFamily: SERIF, fontSize: 19, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.6, opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease', marginBottom: 14 }}>
            {c.text}
          </p>
          {c.typing
            ? <span style={{ fontSize: 11, color: M.textDim, fontStyle: 'italic' }}>considering…</span>
            : <button onMouseEnter={e=>e.currentTarget.style.opacity='0.7'} onMouseLeave={e=>e.currentTarget.style.opacity='1'} onClick={c.next} style={{ fontSize: 11, color: M.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: SERIF, fontStyle: 'italic', transition: 'opacity .15s' }}>Next thought →</button>
          }
        </div>

        {/* Book header */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 36 }}>
          <BookCover index={0} w={64} h={90} radius={5} />
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 8 }}>Current reading</p>
            <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: M.textPrimary, lineHeight: 1.1, marginBottom: 5, letterSpacing: '-0.02em' }}>The Master<br />and Margarita</h1>
            <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, marginBottom: 4 }}>Mikhail Bulgakov</p>
            <p style={{ fontSize: 13, color: M.textDim }}>Chapter 19 of 32 · 54 days</p>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${M.separatorSoft}`, paddingBottom: 0, marginBottom: 32 }}>
          {TABS.map(t => (
            <button
              key={t}
              onMouseEnter={() => setHoveredTab(t)}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab(t)}
              style={{
                fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px',
                color: activeTab === t ? M.gold : hoveredTab === t ? M.textSecondary : M.textDim,
                borderBottom: `2px solid ${activeTab === t ? M.gold : 'transparent'}`,
                transition: 'color .12s, border-color .12s',
              }}
            >{t}</button>
          ))}
        </div>

        {/* Tab content */}
        {tabContent()}

        {/* Companion input */}
        <div style={{ borderTop: `1px solid ${M.separator}`, paddingTop: 28, marginTop: 32 }}>
          <p style={{ fontSize: 11, fontFamily: SERIF, fontStyle: 'italic', color: M.textDim, marginBottom: 12 }}>
            Speak to the companion — about Woland, the Master, Margarita, or Moscow.
          </p>
          <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${M.separator}`, paddingBottom: 12 }}>
            <input value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
              placeholder="A thought before it disappears…"
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: M.textPrimary, fontFamily: SERIF, fontStyle: 'italic', outline: 'none', padding: '6px 0' }}
            />
            <button onClick={() => c.ask(c.input)} style={{ fontSize: 14, color: M.gold, background: 'none', border: 'none', cursor: 'pointer' }}>↵</button>
          </div>
        </div>
      </div>
      <div style={{ height: 80 }} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 2 — Soft Archival Memory
══════════════════════════════════════════════════════════════════════════════ */

const D2_CARD = {
  deep:    { bg: '#FBF6EE', shadow: '0 2px 24px rgba(180,140,80,.11), 0 1px 4px rgba(28,25,23,.04)' },
  early:   { bg: '#FFFDF9', shadow: '0 1px 8px rgba(28,25,23,.05)' },
  archival:{ bg: '#F7F1E6', shadow: '0 2px 12px rgba(180,140,80,.07)' },
  dormant: { bg: '#FAF8F3', shadow: '0 1px 4px rgba(28,25,23,.03)' },
}

const D2DARK = {
  bg: '#18140E', cardDeep: '#221A10', cardEarly: '#1E1810', cardArchival: '#14100A', cardDormant: '#1A1610',
  textPrimary: '#E0D2B8', textSecondary: '#8A7860', textDim: '#5A4838',
  amber: '#C8903C', amberDim: 'rgba(200,144,60,.16)', amberBorder: 'rgba(200,144,60,.22)',
  separator: 'rgba(200,144,60,.12)', companionBg: '#1C1608',
  glow: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200,144,60,.08) 0%, transparent 70%)',
}
const D2LIGHT = {
  bg: '#FAF6EF', cardDeep: '#FBF6EE', cardEarly: '#FFFDF9', cardArchival: '#F7F1E6', cardDormant: '#FAF8F3',
  textPrimary: '#1C1917', textSecondary: '#78716C', textDim: '#A8A29E',
  amber: '#B8860B', amberDim: 'rgba(180,140,80,.10)', amberBorder: 'rgba(180,140,80,.14)',
  separator: 'rgba(28,25,23,.07)', companionBg: '#FBF4E3',
  glow: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(180,140,80,.06) 0%, transparent 70%)',
}

function D2Archival() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]     = useState('Mysteries')
  const [libExpanded, setLibExpanded] = useState(false)
  const [hoveredBook, setHoveredBook] = useState(null)
  const [hoveredTab, setHoveredTab]   = useState(null)
  const SERIF = "'Playfair Display', Georgia, serif"
  const M = mode === 'dark' ? D2DARK : D2LIGHT
  const cards = {
    deep:     { bg: M.cardDeep,     shadow: mode === 'dark' ? '0 2px 24px rgba(200,144,60,.12), 0 1px 4px rgba(0,0,0,.2)'  : '0 2px 24px rgba(180,140,80,.11), 0 1px 4px rgba(28,25,23,.04)' },
    early:    { bg: M.cardEarly,    shadow: mode === 'dark' ? '0 1px 8px rgba(0,0,0,.18)'                                   : '0 1px 8px rgba(28,25,23,.05)' },
    archival: { bg: M.cardArchival, shadow: mode === 'dark' ? '0 2px 12px rgba(200,144,60,.08)'                             : '0 2px 12px rgba(180,140,80,.07)' },
    dormant:  { bg: M.cardDormant,  shadow: mode === 'dark' ? '0 1px 4px rgba(0,0,0,.14)'                                  : '0 1px 4px rgba(28,25,23,.03)' },
  }

  const visibleBooks = libExpanded ? LIBRARY : LIBRARY.filter(b => b.status === 'reading')

  const tabContent = () => {
    switch (activeTab) {
      case 'Progress': return (
        <div key="prog" className="view-enter">
          <p style={D2SL}>Progress</p>
          <div style={{ background: M.companionBg, borderRadius: 12, padding: '20px 20px', marginBottom: 20, boxShadow: `0 2px 12px ${M.amberDim}` }}>
            <p style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 600, color: M.textPrimary, letterSpacing: '-0.02em', marginBottom: 2 }}>Chapter 19</p>
            <p style={{ fontSize: 13, color: M.textDim }}>of 32 · 59% complete · 54 days</p>
          </div>
          {CHAPTERS_DEMO.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${M.separator}`, opacity: ch.completed ? 1 : 0.55 }}>
              <span style={{ fontSize: 11, color: M.textDim, minWidth: 24 }}>{ch.num}</span>
              <span style={{ fontSize: 12, color: ch.completed ? M.amber : M.textDim }}>{ch.completed ? '✓' : '·'}</span>
              <span style={{ flex: 1, fontSize: 14, color: M.textSecondary }}>
                {ch.title}{ch.singularity && <span style={{ color: M.amber, marginLeft: 6, fontSize: 11 }}>✦</span>}
              </span>
              {ch.notesCount > 0 && <span style={{ fontSize: 10, color: M.amber, background: M.amberDim, padding: '1px 6px', borderRadius: 3 }}>{ch.notesCount}</span>}
            </div>
          ))}
        </div>
      )
      case 'Characters': return (
        <div key="chars" className="view-enter">
          <p style={D2SL}>Characters</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CHARACTERS.map((ch, i) => (
              <div key={i} style={{ background: M.cardDeep, borderRadius: 12, padding: '16px 18px', boxShadow: `0 1px 8px ${M.amberDim}` }}>
                <p style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: M.textPrimary, marginBottom: 2 }}>{ch.name}</p>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: M.textDim, marginBottom: 8 }}>{ch.role}</p>
                <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.6 }}>{ch.description}</p>
              </div>
            ))}
          </div>
        </div>
      )
      case 'Notes': return (
        <div key="notes" className="view-enter">
          <p style={D2SL}>Your notes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {NOTES.map((n, i) => (
              <div key={i} style={{ background: n.days < 10 ? M.cardEarly : n.days > 40 ? M.cardArchival : M.bg, borderRadius: 10, padding: '14px 16px', boxShadow: `0 1px 6px ${M.separator}` }}>
                <p style={{ fontSize: 14, color: M.textSecondary, lineHeight: 1.65, marginBottom: 6 }}>{n.text}</p>
                <p style={{ fontSize: 11, color: M.textDim }}>{n.days}d ago · {n.tag}</p>
              </div>
            ))}
          </div>
        </div>
      )
      case 'Mysteries': return (
        <div key="myst" className="view-enter">
          <p style={D2SL}>Open questions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MYSTERIES.map((m, i) => (
              <div key={i} style={{ background: m.haunt === 'haunted' ? M.amberDim : 'transparent', borderRadius: 10, padding: '12px 16px', boxShadow: m.haunt === 'haunted' ? `inset 0 0 0 1px ${M.amberBorder}` : 'none' }}>
                <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: m.haunt === 'haunted' ? M.textSecondary : M.textDim, lineHeight: 1.6 }}>
                  {m.haunt === 'haunted' && <span style={{ color: M.amber, marginRight: 6 }}>✦</span>}{m.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )
      case 'Discussion': return (
        <div key="disc" className="view-enter">
          <p style={D2SL}>Discussion</p>
          {DISCUSSION.map((q, i) => (
            <div key={i} style={{ background: M.cardDeep, borderRadius: 10, padding: '14px 16px', marginBottom: 10, boxShadow: `0 1px 6px ${M.amberDim}` }}>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.65 }}>{q}</p>
            </div>
          ))}
        </div>
      )
      default: return null
    }
  }
  const D2SL = { fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 16 }

  return (
    <div style={{ background: M.bg, minHeight: '100vh', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: M.glow }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ maxWidth: 740, margin: '0 auto', padding: '52px 32px 0' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 6 }}>Direction 2</p>
          <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 10 }}>Soft Archival Memory</h2>
          <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, maxWidth: 500 }}>A journal carried for years. Surfaces warm with use. Fresh activity feels brighter; completed books carry archival weight.</p>
        </div>

        {/* Library */}
        <div style={{ maxWidth: 740, margin: '44px auto 0', padding: '0 32px' }}>
          <p style={D2SL}>Your library</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibleBooks.map((b, i) => {
              const card = cards[b.depth]
              const isHovered = hoveredBook === i
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredBook(i)}
                  onMouseLeave={() => setHoveredBook(null)}
                  style={{
                    background: card.bg, borderRadius: 14,
                    padding: '16px 20px',
                    boxShadow: isHovered ? `0 6px 28px ${M.amberBorder}, 0 2px 8px ${M.separator}` : card.shadow,
                    transform: isHovered ? 'translateY(-1px)' : 'none',
                    opacity: b.depth === 'dormant' ? 0.6 : 1,
                    transition: 'box-shadow .2s, transform .2s, opacity .2s',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <BookCover index={LIBRARY.indexOf(b)} w={48} h={68} radius={4} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ fontFamily: SERIF, fontSize: b.depth === 'deep' ? 17 : 15, fontWeight: b.depth === 'deep' ? 600 : 400, color: M.textPrimary, marginBottom: 3 }}>{b.title}</p>
                          <p style={{ fontSize: 12, fontStyle: 'italic', fontFamily: SERIF, color: M.textDim }}>{b.author}</p>
                        </div>
                        <p style={{ fontSize: 11, color: b.depth === 'deep' ? M.amber : M.textDim, flexShrink: 0, paddingLeft: 8 }}>
                          {b.status === 'finished' ? 'complete' : b.status === 'paused' ? 'paused' : `${b.progress}%`}
                        </p>
                      </div>
                      {b.depth === 'deep' && (
                        <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: M.amberDim }}>
                          <div style={{ height: '100%', width: `${b.progress}%`, background: M.amber, borderRadius: 2, opacity: 0.6 }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {!libExpanded && (
            <button
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              onClick={() => setLibExpanded(true)}
              style={{ marginTop: 16, fontSize: 12, fontFamily: SERIF, fontStyle: 'italic', color: M.amber, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'opacity .15s' }}
            >
              Open the archive → ({LIBRARY.length} companions)
            </button>
          )}
        </div>

        {/* Book detail */}
        <div style={{ maxWidth: 740, margin: '48px auto 0', padding: '0 32px' }}>
          {/* Companion warm block */}
          <div style={{ background: M.companionBg, borderRadius: 16, padding: '26px 26px 22px', boxShadow: `0 4px 32px ${M.amberDim}, inset 0 0 0 1px ${M.amberBorder}`, marginBottom: 28 }}>
            <div style={{ borderLeft: `2px solid ${M.amberBorder}`, paddingLeft: 18, marginBottom: 18 }}>
              <p style={{ fontFamily: SERIF, fontSize: 16, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.7, opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease' }}>{c.text}</p>
            </div>
            {c.typing
              ? <p style={{ fontSize: 11, color: M.textDim, fontStyle: 'italic', marginBottom: 14 }}>the companion is thinking…</p>
              : <button onMouseEnter={e=>e.currentTarget.style.opacity='0.7'} onMouseLeave={e=>e.currentTarget.style.opacity='1'} onClick={c.next} style={{ fontSize: 11, color: M.amber, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: SERIF, fontStyle: 'italic', marginBottom: 14, transition: 'opacity .15s' }}>Next thought</button>
            }
            <div style={{ borderTop: `1px solid ${M.separator}`, paddingTop: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
                  placeholder="A thought about Woland, the Master…"
                  style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: M.textSecondary, fontFamily: SERIF, fontStyle: 'italic', outline: 'none', padding: '6px 0' }}
                />
                <button onClick={() => c.ask(c.input)} style={{ fontSize: 13, color: M.amber, background: 'none', border: 'none', cursor: 'pointer' }}>↵</button>
              </div>
            </div>
          </div>

          {/* Book header */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
            <BookCover index={0} w={64} h={90} radius={6} />
            <div>
              <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: M.textPrimary, lineHeight: 1.15, marginBottom: 4, letterSpacing: '-0.015em' }}>The Master and Margarita</h1>
              <p style={{ fontSize: 14, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, marginBottom: 8 }}>Mikhail Bulgakov</p>
              <p style={{ fontSize: 12, color: M.textDim, marginBottom: 12 }}>Chapter 19 of 32 · 54 days · 23 notes</p>
              <div style={{ height: 3, borderRadius: 2, background: M.amberDim, width: 200 }}>
                <div style={{ height: '100%', width: '59%', background: M.amber, borderRadius: 2, opacity: 0.5 }} />
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 20, borderBottom: `1px solid ${M.separator}`, paddingBottom: 0, marginBottom: 24 }}>
            {TABS.map(t => (
              <button
                key={t}
                onMouseEnter={() => setHoveredTab(t)}
                onMouseLeave={() => setHoveredTab(null)}
                onClick={() => setActiveTab(t)}
                style={{
                  fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px',
                  color: activeTab === t ? M.amber : hoveredTab === t ? M.textSecondary : M.textDim,
                  borderBottom: `2px solid ${activeTab === t ? M.amber : 'transparent'}`,
                  transition: 'color .12s, border-color .12s',
                }}
              >{t}</button>
            ))}
          </div>
          {tabContent()}
        </div>
        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 3 — Spatial Reading Room (dark navy redesign)
══════════════════════════════════════════════════════════════════════════════ */

const D3DARK = {
  bg:            '#0A1A1E',
  cardBase:      '#101E26',
  cardDeep:      '#162836',
  cardHover:     '#1C3040',
  cardArchival:  '#0C1820',
  textPrimary:   '#B4C8D8',
  textSecondary: '#507088',
  textDim:       '#2C4050',
  accent:        '#3C7AAA',
  accentDim:     'rgba(60,122,170,.18)',
  separator:     'rgba(60,122,170,.12)',
  separatorSoft: 'rgba(60,122,170,.07)',
  companionBg:   '#0C1A22',
  glow:          'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(40,110,160,.16) 0%, transparent 65%)',
  mysticalGlow:  'radial-gradient(circle 400px at 15% 40%, rgba(30,90,130,.08) 0%, transparent 70%)',
  goldFoil:      'linear-gradient(90deg, #7A5A28 0%, #C4A058 50%, #8A6830 100%)',
  goldAccent:    '#B89060',
  goldDim:       'rgba(184,144,96,.15)',
}

const D3LIGHT = {
  bg:            '#E6EFF4',
  cardBase:      '#FFFFFF',
  cardDeep:      '#EEF7FA',
  cardHover:     '#E0F0F6',
  cardArchival:  '#F4F9FC',
  textPrimary:   '#142432',
  textSecondary: '#3C6070',
  textDim:       '#7090A0',
  accent:        '#267098',
  accentDim:     'rgba(38,112,152,.12)',
  separator:     'rgba(38,112,152,.14)',
  separatorSoft: 'rgba(38,112,152,.08)',
  companionBg:   '#F4FAFE',
  glow:          'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(140,200,230,.35) 0%, transparent 65%)',
  mysticalGlow:  'radial-gradient(circle 400px at 15% 40%, rgba(140,200,230,.18) 0%, transparent 70%)',
  goldFoil:      'linear-gradient(90deg, #A07A40 0%, #D8C490 50%, #B89060 100%)',
  goldAccent:    '#C4963C',
  goldDim:       'rgba(196,150,60,.15)',
}

function D3Spatial() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]     = useState('Mysteries')
  const [libExpanded, setLibExpanded] = useState(false)
  const [hoveredBook, setHoveredBook] = useState(null)
  const [hoveredTab, setHoveredTab]   = useState(null)
  const SERIF = "'Playfair Display', Georgia, serif"
  const M = mode === 'dark' ? D3DARK : D3LIGHT

  const readingBooks = LIBRARY.filter(b => b.status === 'reading')
  const dormantBooks = LIBRARY.filter(b => b.status === 'paused')
  const finishedBooks= LIBRARY.filter(b => b.status === 'finished')

  const tabContent = () => {
    const T = M
    switch (activeTab) {
      case 'Progress': return (
        <div key="prog" className="view-enter">
          <p style={D3SL}>Progress</p>
          <div style={{ background: M.cardDeep, borderRadius: 12, padding: '18px 18px', marginBottom: 20, border: `1px solid ${M.accentDim}`, boxShadow: `0 0 24px ${M.accentDim}` }}>
            <p style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, color: M.textPrimary, letterSpacing: '-0.02em', marginBottom: 2 }}>Chapter 19</p>
            <p style={{ fontSize: 13, color: M.textSecondary }}>of 32 · 59% complete · 54 days</p>
          </div>
          {CHAPTERS_DEMO.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${M.separatorSoft}`, opacity: ch.completed ? 1 : 0.5 }}>
              <span style={{ fontSize: 11, color: M.textDim, minWidth: 24 }}>{ch.num}</span>
              <span style={{ fontSize: 12, color: ch.completed ? M.goldAccent : M.textDim }}>{ch.completed ? '✓' : '·'}</span>
              <span style={{ flex: 1, fontSize: 14, color: ch.singularity ? M.textPrimary : M.textSecondary }}>
                {ch.title}{ch.singularity && <span style={{ color: M.goldAccent, marginLeft: 6, fontSize: 11 }}>✦</span>}
              </span>
              {ch.notesCount > 0 && <span style={{ fontSize: 10, color: M.goldAccent, background: M.goldDim, padding: '1px 6px', borderRadius: 3 }}>{ch.notesCount}</span>}
            </div>
          ))}
        </div>
      )
      case 'Characters': return (
        <div key="chars" className="view-enter">
          <p style={D3SL}>Characters</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CHARACTERS.map((ch, i) => (
              <div key={i} style={{ background: M.cardBase, border: `1px solid ${M.separator}`, borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: M.textPrimary, marginBottom: 2 }}>{ch.name}</p>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: M.textSecondary, marginBottom: 8 }}>{ch.role}</p>
                <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.6 }}>{ch.description}</p>
              </div>
            ))}
          </div>
        </div>
      )
      case 'Notes': return (
        <div key="notes" className="view-enter">
          <p style={D3SL}>Your notes</p>
          {NOTES.map((n, i) => (
            <div key={i} style={{ marginBottom: 22, paddingBottom: 22, borderBottom: `1px solid ${M.separatorSoft}` }}>
              <p style={{ fontSize: 14, color: M.textSecondary, lineHeight: 1.7, marginBottom: 6 }}>{n.text}</p>
              <p style={{ fontSize: 11, color: M.textDim }}>{n.days}d ago · {n.tag}</p>
            </div>
          ))}
        </div>
      )
      case 'Mysteries': return (
        <div key="myst" className="view-enter">
          <p style={D3SL}>Still unresolved</p>
          {MYSTERIES.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: `1px solid ${M.separatorSoft}` }}>
              <span style={{ color: m.haunt === 'haunted' ? M.goldAccent : M.textDim, fontSize: 11, marginTop: 3, flexShrink: 0 }}>✦</span>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: m.haunt === 'dormant' ? M.textSecondary : M.textPrimary, lineHeight: 1.6, opacity: m.haunt === 'dormant' ? 0.55 : 1 }}>{m.text}</p>
            </div>
          ))}
        </div>
      )
      case 'Discussion': return (
        <div key="disc" className="view-enter">
          <p style={D3SL}>Discussion</p>
          {DISCUSSION.map((q, i) => (
            <div key={i} style={{ marginBottom: 16, padding: '14px 16px', background: M.cardBase, border: `1px solid ${M.separator}`, borderRadius: 10 }}>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.65 }}>{q}</p>
            </div>
          ))}
        </div>
      )
      default: return null
    }
  }
  const D3SL = { fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textSecondary, marginBottom: 16 }

  return (
    <div style={{ background: M.bg, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Atmospheric glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: M.glow }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: M.mysticalGlow }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ padding: '52px 40px 0', maxWidth: 960, margin: '0 auto' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 6 }}>Direction 3</p>
            <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 10 }}>Spatial Reading Room</h2>
            <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, maxWidth: 520 }}>
              A quiet study, lit from one side. Active books feel close and warm. Dormant books recede. The companion occupies a distinct spatial zone.
            </p>
          </div>
          {/* Gold foil accent rule */}
          <div style={{ height: 1, marginTop: 28, background: M.goldFoil, opacity: 0.4, borderRadius: 1 }} />
        </div>

        {/* Library — zoned layout */}
        <div style={{ padding: '44px 40px 0', maxWidth: 960, margin: '0 auto' }}>

          {/* Zone: Reading Now */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: M.textDim, whiteSpace: 'nowrap' }}>Reading Now</p>
            <div style={{ flex: 1, borderTop: `1px solid ${M.separator}` }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 32 }}>
            {readingBooks.map((b, i) => {
              const li = LIBRARY.indexOf(b)
              const isH = hoveredBook === li
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredBook(li)}
                  onMouseLeave={() => setHoveredBook(null)}
                  style={{
                    background: isH ? M.cardHover : M.cardDeep,
                    border: `1px solid ${isH ? M.goldDim : M.separator}`,
                    borderRadius: 14, padding: '18px 18px',
                    boxShadow: isH ? `0 8px 32px ${M.goldDim}` : '0 4px 16px rgba(0,0,0,.18)',
                    transform: isH ? 'translateY(-2px)' : 'none',
                    transition: 'all .22s ease', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <BookCover index={li} w={52} h={72} radius={5} style={{ boxShadow: isH ? '0 4px 16px rgba(0,0,0,.4)' : '0 2px 8px rgba(0,0,0,.4)' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: M.textPrimary, lineHeight: 1.3, marginBottom: 4 }}>{b.title}</p>
                      <p style={{ fontSize: 11, fontStyle: 'italic', fontFamily: SERIF, color: M.textSecondary, marginBottom: 10 }}>{b.author}</p>
                      <div style={{ height: 2, borderRadius: 1, background: M.accentDim }}>
                        <div style={{ height: '100%', width: `${b.progress}%`, background: M.goldFoil, borderRadius: 1 }} />
                      </div>
                      <p style={{ fontSize: 10, color: M.textSecondary, marginTop: 6 }}>{b.progress}% · {b.notes} notes</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Expand control */}
          {!libExpanded && (
            <button
              onMouseEnter={e => e.currentTarget.style.color = M.textPrimary}
              onMouseLeave={e => e.currentTarget.style.color = M.goldAccent}
              onClick={() => setLibExpanded(true)}
              style={{ fontSize: 12, color: M.goldAccent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 40, transition: 'color .15s', fontFamily: SERIF, fontStyle: 'italic' }}
            >
              See the full room → ({LIBRARY.length} companions)
            </button>
          )}

          {/* Expanded zones */}
          {libExpanded && (
            <>
              {/* Zone: In the Room (paused) */}
              {dormantBooks.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: M.textDim, whiteSpace: 'nowrap' }}>Set Aside</p>
                    <div style={{ flex: 1, borderTop: `1px solid ${M.separatorSoft}` }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, opacity: 0.6 }}>
                    {dormantBooks.map((b, i) => {
                      const li = LIBRARY.indexOf(b)
                      return (
                        <div key={i} style={{ background: M.cardBase, border: `1px solid ${M.separatorSoft}`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
                          <BookCover index={li} w={36} h={50} radius={3} />
                          <div>
                            <p style={{ fontFamily: SERIF, fontSize: 14, color: M.textSecondary, marginBottom: 2 }}>{b.title}</p>
                            <p style={{ fontSize: 11, fontStyle: 'italic', color: M.textDim, fontFamily: SERIF }}>{b.author} · {b.progress}%</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Zone: Complete */}
              {finishedBooks.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: M.textDim, whiteSpace: 'nowrap' }}>Complete</p>
                    <div style={{ flex: 1, borderTop: `1px solid ${M.separatorSoft}` }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40, opacity: 0.45 }}>
                    {finishedBooks.map((b, i) => {
                      const li = LIBRARY.indexOf(b)
                      return (
                        <div key={i} style={{ background: M.cardArchival, border: `1px solid ${M.separatorSoft}`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
                          <BookCover index={li} w={30} h={42} radius={3} />
                          <div>
                            <p style={{ fontFamily: SERIF, fontSize: 13, color: M.textSecondary, marginBottom: 1 }}>{b.title}</p>
                            <p style={{ fontSize: 10, fontStyle: 'italic', color: M.textDim, fontFamily: SERIF }}>{b.author}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Separator */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ borderTop: `1px solid ${M.separator}` }} />
        </div>

        {/* Book detail — main + companion */}
        <div style={{ maxWidth: 960, margin: '40px auto 0', padding: '0 40px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 48 }}>
          {/* Main */}
          <div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
              <BookCover index={0} w={72} h={100} radius={6} style={{ boxShadow: '0 4px 20px rgba(0,0,0,.5)' }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: M.textDim, marginBottom: 10 }}>Now reading</p>
                <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: M.textPrimary, lineHeight: 1.1, marginBottom: 5, letterSpacing: '-0.02em' }}>The Master<br />and Margarita</h1>
                <p style={{ fontSize: 13, fontStyle: 'italic', fontFamily: SERIF, color: M.textSecondary, marginBottom: 10 }}>Mikhail Bulgakov</p>
                <p style={{ fontSize: 12, color: M.textSecondary }}>Chapter 19 of 32 · 54 days · 23 notes</p>
                <div style={{ position: 'relative', height: 3, borderRadius: 2, background: M.accentDim, marginTop: 12, width: 200 }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '59%', borderRadius: 2, background: M.goldFoil }} />
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 20, borderBottom: `1px solid ${M.separator}`, marginBottom: 24 }}>
              {TABS.map(t => (
                <button
                  key={t}
                  onMouseEnter={() => setHoveredTab(t)}
                  onMouseLeave={() => setHoveredTab(null)}
                  onClick={() => setActiveTab(t)}
                  style={{
                    fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px',
                    color: activeTab === t ? M.goldAccent : hoveredTab === t ? M.textSecondary : M.textDim,
                    borderBottom: `2px solid ${activeTab === t ? M.goldAccent : 'transparent'}`,
                    transition: 'color .12s, border-color .12s',
                  }}
                >{t}</button>
              ))}
            </div>
            {tabContent()}
          </div>

          {/* Companion zone */}
          <div style={{
            background: M.companionBg,
            border: `1px solid ${M.separator}`,
            borderRadius: 18, padding: '24px 22px',
            boxShadow: mode === 'dark' ? '0 4px 28px rgba(0,0,0,.3), inset 0 0 60px rgba(40,80,160,.06)' : '0 4px 28px rgba(0,0,0,.08)',
            alignSelf: 'flex-start', position: 'sticky', top: 128,
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 18 }}>Companion</p>
            <p style={{ fontFamily: SERIF, fontSize: 15, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.7, opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease', marginBottom: 18 }}>
              {c.text}
            </p>
            {c.typing && <p style={{ fontSize: 11, color: M.textDim, fontStyle: 'italic', marginBottom: 12 }}>thinking…</p>}
            <div style={{ borderTop: `1px solid ${M.separatorSoft}`, paddingTop: 16 }}>
              <input
                value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
                placeholder="Speak to the companion…"
                style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: `1px solid ${M.separator}`, background: 'transparent', fontSize: 12, color: M.textSecondary, fontFamily: SERIF, fontStyle: 'italic', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onMouseEnter={e=>e.currentTarget.style.color=M.textPrimary} onMouseLeave={e=>e.currentTarget.style.color=M.goldAccent} onClick={c.next} style={{ fontSize: 11, color: M.goldAccent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontStyle: 'italic', fontFamily: SERIF, transition: 'color .15s' }}>Next thought</button>
                <button onClick={() => c.ask(c.input)} style={{ fontSize: 11, color: M.goldAccent, background: 'none', border: 'none', cursor: 'pointer' }}>↵</button>
              </div>
            </div>
          </div>
        </div>
        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 4 — Residue & Margins
══════════════════════════════════════════════════════════════════════════════ */

const D4DARK = {
  bg: '#161210', textPrimary: '#E0D4C0', textSecondary: '#8A7C68', textDim: '#5A5040',
  gold: '#C49040', goldBorder: 'rgba(196,144,64,.28)', goldDim: 'rgba(196,144,64,.12)',
  separator: 'rgba(196,144,64,.10)', separatorSoft: 'rgba(255,255,255,.05)',
}
const D4LIGHT = {
  bg: '#FDFAF5', textPrimary: '#1C1917', textSecondary: '#78716C', textDim: '#A8A29E',
  gold: '#B8860B', goldBorder: 'rgba(184,134,11,.28)', goldDim: 'rgba(184,134,11,.10)',
  separator: 'rgba(28,25,23,.05)', separatorSoft: 'rgba(28,25,23,.07)',
}

function D4Margins() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]     = useState('Mysteries')
  const [libExpanded, setLibExpanded] = useState(false)
  const [hoveredBook, setHoveredBook] = useState(null)
  const [hoveredTab, setHoveredTab]   = useState(null)
  const SERIF = "'Playfair Display', Georgia, serif"
  const M = mode === 'dark' ? D4DARK : D4LIGHT
  const SL = { fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 20 }

  const visibleBooks = libExpanded ? LIBRARY : LIBRARY.filter(b => b.status === 'reading')

  const tabContent = () => {
    switch (activeTab) {
      case 'Progress': return (
        <div key="prog" className="view-enter">
          <p style={SL}>Progress</p>
          <p style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, color: M.textPrimary, letterSpacing: '-0.02em', marginBottom: 4 }}>Chapter 19 of 32</p>
          <p style={{ fontSize: 12, color: M.textDim, marginBottom: 24 }}>59% complete · 54 days</p>
          {CHAPTERS_DEMO.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${M.separator}`, opacity: ch.completed ? 1 : 0.5 }}>
              <span style={{ fontSize: 11, color: M.textDim, minWidth: 22 }}>{ch.num}</span>
              <span style={{ fontSize: 11, color: ch.completed ? M.gold : M.textDim }}>{ch.completed ? '✓' : '·'}</span>
              <span style={{ flex: 1, fontSize: 14, color: M.textSecondary }}>
                {ch.title}{ch.singularity && <span style={{ color: M.gold, marginLeft: 6, fontSize: 10 }}>✦</span>}
              </span>
              {ch.notesCount > 0 && <span style={{ fontSize: 10, color: M.gold }}>{ch.notesCount}</span>}
            </div>
          ))}
        </div>
      )
      case 'Characters': return (
        <div key="chars" className="view-enter">
          <p style={SL}>Characters</p>
          {CHARACTERS.map((ch, i) => (
            <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${M.separator}` }}>
              <p style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: M.textPrimary, marginBottom: 2 }}>{ch.name}</p>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: M.textDim, marginBottom: 8 }}>{ch.role}</p>
              <p style={{ fontSize: 14, color: M.textSecondary, lineHeight: 1.65 }}>{ch.description}</p>
            </div>
          ))}
        </div>
      )
      case 'Notes': return (
        <div key="notes" className="view-enter">
          <p style={SL}>Your notes</p>
          {NOTES.map((n, i) => (
            <div key={i} style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 14, color: M.textSecondary, lineHeight: 1.72, marginBottom: 5 }}>{n.text}</p>
              <p style={{ fontSize: 10, color: M.textDim }}>{n.days}d ago</p>
            </div>
          ))}
        </div>
      )
      case 'Mysteries': return (
        <div key="myst" className="view-enter">
          <p style={SL}>Open questions</p>
          {MYSTERIES.map((m, i) => (
            <div key={i} style={{ paddingBottom: 18, marginBottom: 18, borderBottom: `1px solid ${M.separator}` }}>
              <p style={{ fontSize: 14, fontFamily: SERIF, fontStyle: 'italic', color: m.haunt === 'haunted' ? M.textPrimary : M.textDim, lineHeight: 1.6, borderLeft: m.haunt === 'haunted' ? `2px solid ${M.goldBorder}` : '2px solid transparent', paddingLeft: 12 }}>{m.text}</p>
            </div>
          ))}
        </div>
      )
      case 'Discussion': return (
        <div key="disc" className="view-enter">
          <p style={SL}>Discussion</p>
          {DISCUSSION.map((q, i) => (
            <div key={i} style={{ marginBottom: 22, paddingBottom: 22, borderBottom: `1px solid ${M.separator}` }}>
              <p style={{ fontSize: 14, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.65 }}>{q}</p>
            </div>
          ))}
        </div>
      )
      default: return null
    }
  }

  return (
    <div style={{ background: M.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '52px 28px 0' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 6 }}>Direction 4</p>
        <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 10 }}>Residue & Margins</h2>
        <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, maxWidth: 520 }}>A book you've been living inside. Companion voice lives in the margin — always. The page looks like something that has been used.</p>
      </div>

      {/* Main grid */}
      <div style={{ maxWidth: 880, margin: '48px auto 0', padding: '0 28px', display: 'grid', gridTemplateColumns: '1fr 210px', gap: 48 }}>
        {/* Main column */}
        <div>
          <p style={SL}>Reading</p>
          {visibleBooks.map((b, i) => {
            const li = LIBRARY.indexOf(b)
            const isH = hoveredBook === li
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredBook(li)}
                onMouseLeave={() => setHoveredBook(null)}
                style={{ paddingBottom: 24, marginBottom: 24, borderBottom: `1px solid ${M.separator}`, opacity: b.depth === 'dormant' ? 0.42 : 1, cursor: 'pointer', transition: 'opacity .2s' }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <BookCover index={li} w={32} h={44} radius={3} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                      <p style={{ fontFamily: SERIF, fontSize: b.depth === 'deep' ? 20 : 16, fontWeight: b.depth === 'deep' ? 600 : 400, color: isH ? M.gold : M.textPrimary, lineHeight: 1.25, marginBottom: 4, letterSpacing: b.depth === 'deep' ? '-0.015em' : 0, transition: 'color .15s' }}>{b.title}</p>
                      <p style={{ fontSize: 11, color: M.textDim, flexShrink: 0 }}>{b.status === 'finished' ? 'complete' : b.status === 'paused' ? 'paused' : `${b.progress}%`}</p>
                    </div>
                    <p style={{ fontSize: 12, fontStyle: 'italic', fontFamily: SERIF, color: M.textDim }}>{b.author}</p>
                    {b.depth === 'deep' && (
                      <p style={{ fontSize: 11, color: M.gold, marginTop: 8, paddingLeft: 10, borderLeft: `2px solid ${M.goldBorder}` }}>{b.notes} thoughts · 3 open questions</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {!libExpanded && (
            <button
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              onClick={() => setLibExpanded(true)}
              style={{ fontSize: 12, color: M.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 40, fontFamily: SERIF, fontStyle: 'italic', transition: 'opacity .15s' }}
            >
              See full collection → ({LIBRARY.length})
            </button>
          )}

          {/* Book section */}
          <div style={{ height: 12 }} />
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 32 }}>
            <BookCover index={0} w={60} h={84} radius={4} style={{ marginTop: 4 }} />
            <div>
              <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: M.textPrimary, lineHeight: 1.1, marginBottom: 5, letterSpacing: '-0.02em' }}>The Master<br />and Margarita</h1>
              <p style={{ fontSize: 13, fontStyle: 'italic', fontFamily: SERIF, color: M.textSecondary, marginBottom: 10 }}>Mikhail Bulgakov</p>
              <p style={{ fontSize: 13, color: M.textDim }}>Chapter 19 of 32 · 54 days · 23 notes</p>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 20, borderBottom: `1px solid ${M.separatorSoft}`, marginBottom: 24 }}>
            {TABS.map(t => (
              <button
                key={t}
                onMouseEnter={() => setHoveredTab(t)}
                onMouseLeave={() => setHoveredTab(null)}
                onClick={() => setActiveTab(t)}
                style={{
                  fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px',
                  color: activeTab === t ? M.gold : hoveredTab === t ? M.textSecondary : M.textDim,
                  borderBottom: `2px solid ${activeTab === t ? M.gold : 'transparent'}`,
                  transition: 'color .12s, border-color .12s',
                }}
              >{t}</button>
            ))}
          </div>
          {tabContent()}

          {/* Companion input */}
          <div style={{ borderTop: `1px solid ${M.separatorSoft}`, paddingTop: 22, marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${M.separator}`, paddingBottom: 10 }}>
              <input value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
                placeholder="A thought before it disappears…"
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: M.textPrimary, fontFamily: SERIF, fontStyle: 'italic', outline: 'none', padding: '6px 0' }}
              />
              <button onClick={() => c.ask(c.input)} style={{ fontSize: 14, color: M.gold, background: 'none', border: 'none', cursor: 'pointer' }}>↵</button>
            </div>
          </div>
        </div>

        {/* Margin column */}
        <div style={{ paddingTop: 12 }}>
          <div style={{ borderLeft: `2px solid ${M.goldBorder}`, paddingLeft: 14, marginBottom: 36 }}>
            <p style={{ fontSize: 12, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.7, opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease' }}>{c.text}</p>
            {c.typing && <p style={{ fontSize: 10, color: M.textDim, fontStyle: 'italic', marginTop: 6 }}>thinking…</p>}
            {!c.typing && (
              <button onMouseEnter={e=>e.currentTarget.style.opacity='0.7'} onMouseLeave={e=>e.currentTarget.style.opacity='1'} onClick={c.next} style={{ fontSize: 10, color: M.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 10, fontStyle: 'italic', fontFamily: SERIF, display: 'block', transition: 'opacity .15s' }}>next →</button>
            )}
          </div>
          {[
            { text: '"Woland seems to know things…"', label: '47d ago', op: 0.55 },
            { text: 'is Woland the devil?', label: 'open · 28d', op: 0.50 },
            { text: 'woland · master · manuscript', label: 'recurring', op: 0.40 },
            { text: 'Margarita holds everything the Master cannot.', label: '3d ago', op: 0.60 },
          ].map((f, i) => (
            <div key={i} style={{ borderLeft: `1px solid ${M.separator}`, paddingLeft: 12, marginBottom: 22, opacity: f.op }}>
              <p style={{ fontSize: 11, fontStyle: 'italic', color: M.textDim, lineHeight: 1.6 }}>{f.text}</p>
              <p style={{ fontSize: 9, color: M.textDim, marginTop: 3, opacity: 0.6 }}>{f.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 80 }} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 5 — Companion Territory
══════════════════════════════════════════════════════════════════════════════ */

const D5DARK = {
  bg: '#18130A',
  companionBg: 'linear-gradient(180deg, #251A08 0%, #1E1406 100%)',
  companionBorder: 'rgba(200,144,60,.15)', companionGlow: 'radial-gradient(ellipse at 50% 0%, rgba(200,144,60,.12) 0%, transparent 70%)',
  companionLabel: '#8A6838', companionText: '#D4B890', companionMuted: '#8A6838',
  companionSep: 'rgba(200,144,60,.18)', companionInputBorder: 'rgba(200,144,60,.28)',
  companionBtn: '#B8860B',
  cardDeep: '#221A0E', cardBase: 'rgba(34,26,14,.6)',
  textPrimary: '#E0D0B0', textSecondary: '#8A7060', textDim: '#5A4830',
  gold: '#C49040', border: 'rgba(200,144,60,.10)', separator: 'rgba(200,144,60,.07)',
}
const D5LIGHT = {
  bg: '#FAF8F3',
  companionBg: 'linear-gradient(180deg, #F3E8C8 0%, #EEE0B8 100%)',
  companionBorder: 'rgba(180,140,80,.14)', companionGlow: 'radial-gradient(ellipse at 50% 0%, rgba(184,134,11,.10) 0%, transparent 70%)',
  companionLabel: '#B5A070', companionText: '#332C20', companionMuted: '#8A7240',
  companionSep: 'rgba(180,140,80,.18)', companionInputBorder: 'rgba(180,140,80,.28)',
  companionBtn: '#B8860B',
  cardDeep: '#FFFDF9', cardBase: 'rgba(255,253,249,.5)',
  textPrimary: '#1C1917', textSecondary: '#57534E', textDim: '#C4B89E',
  gold: '#B8860B', border: 'rgba(28,25,23,.06)', separator: 'rgba(28,25,23,.05)',
}

function D5Territory() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]     = useState('Mysteries')
  const [libExpanded, setLibExpanded] = useState(false)
  const [hoveredBook, setHoveredBook] = useState(null)
  const [hoveredTab, setHoveredTab]   = useState(null)
  const SERIF = "'Playfair Display', Georgia, serif"
  const M = mode === 'dark' ? D5DARK : D5LIGHT
  const SL = { fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 14 }

  const visibleBooks = libExpanded ? LIBRARY : LIBRARY.filter(b => b.status === 'reading')

  const tabContent = () => {
    switch (activeTab) {
      case 'Progress': return (
        <div key="prog" className="view-enter">
          <p style={SL}>Progress</p>
          <p style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: M.textPrimary, marginBottom: 4 }}>Chapter 19 of 32</p>
          <div style={{ height: 3, borderRadius: 2, background: M.separator, marginBottom: 16, marginTop: 10 }}>
            <div style={{ height: '100%', width: '59%', borderRadius: 2, background: M.gold, opacity: 0.55 }} />
          </div>
          {CHAPTERS_DEMO.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${M.separator}`, opacity: ch.completed ? 1 : 0.5 }}>
              <span style={{ fontSize: 11, color: M.textDim, minWidth: 22 }}>{ch.num}</span>
              <span style={{ fontSize: 11, color: ch.completed ? M.gold : M.textDim }}>{ch.completed ? '✓' : '·'}</span>
              <span style={{ flex: 1, fontSize: 13, color: M.textSecondary }}>{ch.title}{ch.singularity && <span style={{ color: M.gold, marginLeft: 6 }}>✦</span>}</span>
            </div>
          ))}
        </div>
      )
      case 'Characters': return (
        <div key="chars" className="view-enter">
          <p style={SL}>Characters</p>
          {CHARACTERS.map((ch, i) => (
            <div key={i} style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: M.cardDeep, border: `1px solid ${M.border}` }}>
              <p style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: M.textPrimary, marginBottom: 2 }}>{ch.name}</p>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: M.textDim, marginBottom: 6 }}>{ch.role}</p>
              <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.6 }}>{ch.description}</p>
            </div>
          ))}
        </div>
      )
      case 'Notes': return (
        <div key="notes" className="view-enter">
          <p style={SL}>Your notes</p>
          {NOTES.map((n, i) => (
            <div key={i} style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 8, background: M.cardDeep, border: `1px solid ${M.border}` }}>
              <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, marginBottom: 5 }}>{n.text}</p>
              <p style={{ fontSize: 11, color: M.textDim }}>{n.days}d ago · {n.tag}</p>
            </div>
          ))}
        </div>
      )
      case 'Mysteries': return (
        <div key="myst" className="view-enter">
          <p style={SL}>Open questions</p>
          {MYSTERIES.map((m, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: 8, marginBottom: 10, background: M.cardDeep, border: `1px solid ${M.border}` }}>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: m.haunt === 'haunted' ? M.textPrimary : M.textSecondary, lineHeight: 1.6 }}>
                {m.haunt === 'haunted' && <span style={{ color: M.gold, marginRight: 6 }}>✦</span>}{m.text}
              </p>
              <p style={{ fontSize: 10, color: M.textDim, marginTop: 5 }}>{m.haunt} · {m.age}d open</p>
            </div>
          ))}
        </div>
      )
      case 'Discussion': return (
        <div key="disc" className="view-enter">
          <p style={SL}>Discussion</p>
          {DISCUSSION.map((q, i) => (
            <div key={i} style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 8, background: M.cardDeep, border: `1px solid ${M.border}` }}>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.65 }}>{q}</p>
            </div>
          ))}
        </div>
      )
      default: return null
    }
  }

  return (
    <div style={{ background: M.bg }}>
      {/* Header */}
      <div style={{ padding: '52px 40px 0', maxWidth: 960, margin: '0 auto' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 6 }}>Direction 5</p>
        <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 10 }}>Atmospheric Companion Territory</h2>
        <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, maxWidth: 580 }}>The companion is the organizing principle. The left zone breathes with atmosphere; the content zone serves it.</p>
      </div>

      {/* Two-zone layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '310px 1fr', minHeight: 'calc(100vh - 140px)', marginTop: 40 }}>
        {/* Companion zone */}
        <div style={{ background: M.companionBg, borderRight: `1px solid ${M.companionBorder}`, padding: '32px 28px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 240, background: M.companionGlow, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.companionLabel, marginBottom: 22 }}>Companion</p>
            <p style={{ fontFamily: SERIF, fontSize: 16, fontStyle: 'italic', color: M.companionText, lineHeight: 1.75, opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease', marginBottom: 22 }}>{c.text}</p>
            {c.typing && <p style={{ fontSize: 12, color: M.companionLabel, fontStyle: 'italic', marginBottom: 16 }}>thinking…</p>}
            <div style={{ borderTop: `1px solid ${M.companionSep}`, paddingTop: 20, marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: M.companionMuted, lineHeight: 1.65, marginBottom: 10 }}>5 companions. 2 active. 54 days with your deepest read.</p>
              <p style={{ fontSize: 12, fontStyle: 'italic', fontFamily: SERIF, color: M.companionLabel, lineHeight: 1.65 }}>Three questions still open. One has been circling since chapter four.</p>
            </div>
            <input value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
              placeholder="Speak to the companion…"
              style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: `1px solid ${M.companionInputBorder}`, background: 'transparent', fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: M.companionText, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onMouseEnter={e=>e.currentTarget.style.opacity='0.7'} onMouseLeave={e=>e.currentTarget.style.opacity='1'} onClick={c.next} style={{ fontSize: 11, color: M.companionMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontStyle: 'italic', fontFamily: SERIF, transition: 'opacity .15s' }}>Next thought</button>
              <button onClick={() => c.ask(c.input)} style={{ fontSize: 11, color: M.companionBtn, background: 'none', border: 'none', cursor: 'pointer' }}>↵</button>
            </div>
          </div>
        </div>

        {/* Content zone */}
        <div style={{ padding: '32px 36px', overflowY: 'auto' }}>
          <p style={SL}>Books</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {visibleBooks.map((b, i) => {
              const li = LIBRARY.indexOf(b)
              const isH = hoveredBook === li
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredBook(li)}
                  onMouseLeave={() => setHoveredBook(null)}
                  style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: b.depth === 'deep' ? M.cardDeep : M.cardBase,
                    border: `1px solid ${isH ? M.gold + '44' : M.border}`,
                    transform: isH ? 'translateY(-1px)' : 'none',
                    boxShadow: isH ? `0 4px 16px ${M.separator}` : 'none',
                    opacity: b.depth === 'dormant' ? 0.48 : 1,
                    transition: 'all .2s ease', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <BookCover index={li} w={40} h={56} radius={3} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <p style={{ fontFamily: SERIF, fontSize: 15, fontWeight: b.depth === 'deep' ? 600 : 400, color: M.textPrimary, marginBottom: 2 }}>{b.title}</p>
                        <p style={{ fontSize: 11, color: M.textDim, flexShrink: 0, paddingLeft: 8 }}>{b.status === 'finished' ? 'finished' : b.status === 'paused' ? 'paused' : `${b.progress}%`}</p>
                      </div>
                      <p style={{ fontSize: 12, fontStyle: 'italic', color: M.textDim, fontFamily: SERIF }}>{b.author}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {!libExpanded && (
            <button
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              onClick={() => setLibExpanded(true)}
              style={{ fontSize: 12, color: M.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 32, transition: 'opacity .15s' }}
            >
              View all {LIBRARY.length} companions →
            </button>
          )}

          {/* Book detail */}
          <div style={{ borderTop: `1px solid ${M.border}`, paddingTop: 28 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
              <BookCover index={0} w={64} h={90} radius={5} />
              <div>
                <p style={SL}>Active companion</p>
                <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 4, letterSpacing: '-0.015em' }}>The Master and Margarita</h2>
                <p style={{ fontSize: 13, fontStyle: 'italic', fontFamily: SERIF, color: M.textSecondary, marginBottom: 8 }}>Mikhail Bulgakov</p>
                <p style={{ fontSize: 12, color: M.textDim }}>Chapter 19 of 32 · 54 days</p>
              </div>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: M.separator, marginBottom: 20 }}>
              <div style={{ height: '100%', width: '59%', borderRadius: 2, background: M.gold, opacity: 0.55 }} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 22, borderBottom: `1px solid ${M.border}`, paddingBottom: 0 }}>
              {TABS.map(t => (
                <button
                  key={t}
                  onMouseEnter={() => setHoveredTab(t)}
                  onMouseLeave={() => setHoveredTab(null)}
                  onClick={() => setActiveTab(t)}
                  style={{
                    fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px',
                    color: activeTab === t ? M.gold : hoveredTab === t ? M.textSecondary : M.textDim,
                    borderBottom: `2px solid ${activeTab === t ? M.gold : 'transparent'}`,
                    fontWeight: activeTab === t ? 500 : 400,
                    transition: 'color .12s, border-color .12s',
                  }}
                >{t}</button>
              ))}
            </div>
            {tabContent()}
          </div>
        </div>
      </div>
      <div style={{ height: 60 }} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 6 — High-Contrast Typographic Literary
══════════════════════════════════════════════════════════════════════════════ */

const D6DARK = {
  bg: '#0E0C0A', textPrimary: '#EEE4D0', textSecondary: '#7A7060', textDim: '#4A4438',
  gold: '#C49040', separator: '#2C2820', separatorMid: '#221E1A',
}
const D6LIGHT = {
  bg: '#FFFDF9', textPrimary: '#1C1917', textSecondary: '#78716C', textDim: '#C4B89E',
  gold: '#B8860B', separator: '#E7E5E0', separatorMid: '#F0ECE6',
}

function D6Typographic() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]     = useState('Mysteries')
  const [libExpanded, setLibExpanded] = useState(false)
  const [hoveredBook, setHoveredBook] = useState(null)
  const [hoveredTab, setHoveredTab]   = useState(null)
  const SERIF = "'Playfair Display', Georgia, serif"
  const M = mode === 'dark' ? D6DARK : D6LIGHT

  const visibleBooks = libExpanded ? LIBRARY : LIBRARY.filter(b => b.status === 'reading')

  const tabContent = () => {
    switch (activeTab) {
      case 'Progress': return (
        <div key="prog" className="view-enter">
          <p style={D6SL}>Progress</p>
          <p style={{ fontFamily: SERIF, fontSize: 48, fontWeight: 700, color: M.textPrimary, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6 }}>19</p>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, marginBottom: 24 }}>of 32 chapters · 59%</p>
          <div style={{ borderTop: `1px solid ${M.separator}` }} />
          {CHAPTERS_DEMO.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${M.separatorMid}`, opacity: ch.completed ? 1 : 0.45 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: M.textDim, minWidth: 20 }}>{ch.num}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: ch.completed ? M.gold : M.separator }}>{ch.completed ? '✓' : '·'}</span>
              <span style={{ flex: 1, fontFamily: SERIF, fontSize: 15, color: ch.singularity ? M.textPrimary : M.textSecondary, fontStyle: ch.completed ? 'normal' : 'italic' }}>
                {ch.title}{ch.singularity && <span style={{ color: M.gold, marginLeft: 8, fontStyle: 'normal' }}>✦</span>}
              </span>
              {ch.notesCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: M.gold }}>{ch.notesCount}</span>}
            </div>
          ))}
        </div>
      )
      case 'Characters': return (
        <div key="chars" className="view-enter">
          <p style={D6SL}>Characters</p>
          {CHARACTERS.map((ch, i) => (
            <div key={i} style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'baseline', padding: '16px 0', borderBottom: `1px solid ${M.separator}` }}>
                <div style={{ minWidth: 80 }}>
                  <p style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: M.textPrimary, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{ch.name}</p>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, marginTop: 3 }}>{ch.role}</p>
                </div>
                <p style={{ fontSize: 14, color: M.textSecondary, lineHeight: 1.6 }}>{ch.description}</p>
              </div>
            </div>
          ))}
        </div>
      )
      case 'Notes': return (
        <div key="notes" className="view-enter">
          <p style={D6SL}>Your notes</p>
          {NOTES.map((n, i) => (
            <div key={i} style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 15, color: M.textPrimary, lineHeight: 1.7, marginBottom: 6 }}>{n.text}</p>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim }}>{n.days}d ago · {n.tag}</p>
            </div>
          ))}
        </div>
      )
      case 'Mysteries': return (
        <div key="myst" className="view-enter">
          <p style={D6SL}>Open questions</p>
          {MYSTERIES.map((m, i) => (
            <div key={i} style={{ padding: '18px 0', borderBottom: i < MYSTERIES.length - 1 ? `1px solid ${M.separatorMid}` : 'none' }}>
              <p style={{ fontFamily: SERIF, fontSize: 16, fontStyle: 'italic', color: m.haunt === 'haunted' ? M.textPrimary : m.haunt === 'dormant' ? M.textDim : M.textSecondary, lineHeight: 1.55 }}>
                {m.haunt === 'haunted' && <span style={{ fontFamily: 'Inter, sans-serif', fontStyle: 'normal', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: M.gold, marginRight: 12 }}>OPEN</span>}
                {m.text}
              </p>
            </div>
          ))}
        </div>
      )
      case 'Discussion': return (
        <div key="disc" className="view-enter">
          <p style={D6SL}>Discussion</p>
          {DISCUSSION.map((q, i) => (
            <div key={i} style={{ padding: '18px 0', borderBottom: i < DISCUSSION.length - 1 ? `1px solid ${M.separatorMid}` : 'none' }}>
              <p style={{ fontFamily: SERIF, fontSize: 16, fontStyle: 'italic', color: M.textPrimary, lineHeight: 1.6 }}>{q}</p>
            </div>
          ))}
        </div>
      )
      default: return null
    }
  }
  const D6SL = { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: M.textDim, marginBottom: 20 }

  return (
    <div style={{ background: M.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '52px 32px 0' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 6 }}>Direction 6</p>
        <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 10 }}>High-Contrast Typographic Literary</h2>
        <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, maxWidth: 520 }}>Penguin Modern Classics meets a literary broadsheet. The scale contrast is the entire design system. Hierarchy is architectural.</p>
      </div>

      <div style={{ maxWidth: 780, margin: '28px auto 0', padding: '0 32px' }}>
        <div style={{ borderTop: `2px solid ${M.textPrimary}` }} />
      </div>

      {/* Library */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 32px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: M.textPrimary, padding: '14px 0', borderBottom: `1px solid ${M.textPrimary}` }}>Reading</p>
        {visibleBooks.map((b, i) => {
          const li = LIBRARY.indexOf(b)
          const isH = hoveredBook === li
          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredBook(li)}
              onMouseLeave={() => setHoveredBook(null)}
              style={{ borderBottom: `1px solid ${M.separator}`, padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, opacity: b.depth === 'dormant' ? 0.4 : 1, cursor: 'pointer', transition: 'opacity .2s' }}
            >
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <BookCover index={li} w={48} h={68} radius={2} />
                <div>
                  <p style={{ fontFamily: SERIF, fontSize: b.depth === 'deep' ? 26 : b.depth === 'archival' ? 19 : 21, fontWeight: b.depth === 'deep' ? 700 : b.depth === 'archival' ? 500 : 400, color: isH ? M.gold : M.textPrimary, lineHeight: 1.15, marginBottom: 5, letterSpacing: b.depth === 'deep' ? '-0.03em' : '-0.01em', transition: 'color .15s' }}>{b.title}</p>
                  <p style={{ fontSize: 12, color: M.textSecondary, letterSpacing: '0.02em' }}>{b.author}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: b.depth === 'deep' ? M.gold : M.textDim }}>
                  {b.status === 'finished' ? 'Complete' : b.status === 'paused' ? 'Paused' : `${b.progress}%`}
                </p>
                {b.depth === 'deep' && <p style={{ fontSize: 10, color: M.textDim, marginTop: 2, letterSpacing: '0.04em' }}>{b.notes} notes</p>}
              </div>
            </div>
          )
        })}
        {!libExpanded && (
          <div style={{ padding: '16px 0', borderBottom: `2px solid ${M.textPrimary}` }}>
            <button
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              onClick={() => setLibExpanded(true)}
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'opacity .15s' }}
            >
              All Companions ({LIBRARY.length}) →
            </button>
          </div>
        )}
        {libExpanded && <div style={{ borderBottom: `2px solid ${M.textPrimary}` }} />}
      </div>

      {/* Book detail */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ borderTop: `2px solid ${M.textPrimary}` }} />
        <div style={{ padding: '32px 0 24px', display: 'flex', gap: 28, alignItems: 'flex-start' }}>
          <BookCover index={0} w={80} h={112} radius={3} style={{ flexShrink: 0 }} />
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: 46, fontWeight: 700, color: M.textPrimary, lineHeight: 1.02, letterSpacing: '-0.03em', marginBottom: 8 }}>
              The Master<br />and Margarita
            </h1>
            <p style={{ fontSize: 13, color: M.textSecondary, letterSpacing: '0.04em' }}>Mikhail Bulgakov</p>
          </div>
        </div>
        <div style={{ borderTop: `2px solid ${M.textPrimary}` }} />

        {/* Companion block */}
        <div style={{ borderLeft: `2px solid ${M.gold}`, paddingLeft: 26, margin: '32px 0', opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease' }}>
          <p style={{ fontFamily: SERIF, fontSize: 19, fontStyle: 'italic', color: M.textPrimary, lineHeight: 1.65, marginBottom: 12 }}>{c.text}</p>
          {c.typing
            ? <p style={{ fontSize: 12, color: M.textDim, fontStyle: 'italic' }}>considering…</p>
            : <button onMouseEnter={e=>e.currentTarget.style.opacity='0.7'} onMouseLeave={e=>e.currentTarget.style.opacity='1'} onClick={c.next} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: M.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'opacity .15s' }}>Next →</button>
          }
        </div>

        <div style={{ borderTop: `1px solid ${M.separator}` }} />
        <div style={{ display: 'flex', gap: 44, padding: '16px 0', borderBottom: `1px solid ${M.separator}` }}>
          {[{ l: 'Chapter', v: '19 of 32' }, { l: 'Reading', v: '54 days' }, { l: 'Notes', v: '23' }, { l: 'Open', v: '3 questions' }].map((item, i) => (
            <div key={i}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: M.textDim, marginBottom: 4 }}>{item.l}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: M.textPrimary, letterSpacing: '-0.01em' }}>{item.v}</p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 32, padding: '16px 0', borderBottom: `1px solid ${M.separator}`, marginBottom: 28 }}>
          {TABS.map(t => (
            <button
              key={t}
              onMouseEnter={() => setHoveredTab(t)}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => setActiveTab(t)}
              style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: activeTab === t ? M.textPrimary : hoveredTab === t ? M.textSecondary : M.textDim,
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 12px',
                borderBottom: `2px solid ${activeTab === t ? M.textPrimary : 'transparent'}`,
                transition: 'color .12s, border-color .12s',
              }}
            >{t}</button>
          ))}
        </div>
        {tabContent()}

        {/* Companion input */}
        <div style={{ borderTop: `2px solid ${M.textPrimary}`, paddingTop: 20, marginTop: 28, marginBottom: 36 }}>
          <div style={{ display: 'flex', gap: 0, alignItems: 'center', borderBottom: `1px solid ${M.separator}`, paddingBottom: 14 }}>
            <input value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
              placeholder="A thought for the companion…"
              style={{ flex: 1, padding: '8px 0', border: 'none', background: 'transparent', fontSize: 16, color: M.textPrimary, fontFamily: SERIF, fontStyle: 'italic', outline: 'none' }}
            />
            <button onClick={() => c.ask(c.input)} onMouseEnter={e=>e.currentTarget.style.opacity='0.7'} onMouseLeave={e=>e.currentTarget.style.opacity='1'} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.gold, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0 8px 16px', flexShrink: 0, transition: 'opacity .15s' }}>
              Send
            </button>
          </div>
        </div>
      </div>
      <div style={{ height: 60 }} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 7 — Cognac Ledger
══════════════════════════════════════════════════════════════════════════════ */

const D7DARK = {
  bg: '#130E08', cardBg: '#1E1710', cardBorder: 'rgba(200,144,60,.14)', cardBorderStrong: 'rgba(200,144,60,.28)',
  textPrimary: '#E8D8B8', textSecondary: '#9A8468', textDim: '#5A4A34',
  cognac: '#C08030', cognacDim: 'rgba(192,128,48,.16)', cognacBright: '#D4943C',
  separator: 'rgba(192,128,48,.12)', timelineBg: 'rgba(192,128,48,.10)', timelineFill: '#C08030',
  ledgerBg: '#1A1208', ledgerBorder: 'rgba(192,128,48,.24)',
  tabActive: '#D4943C', tabInactive: '#5A4A34',
}
const D7LIGHT = {
  bg: '#FDFAF4', cardBg: '#FFFFFF', cardBorder: 'rgba(180,136,40,.12)', cardBorderStrong: 'rgba(180,136,40,.28)',
  textPrimary: '#1A1410', textSecondary: '#78684C', textDim: '#B8A888',
  cognac: '#A87020', cognacDim: 'rgba(168,112,32,.12)', cognacBright: '#C08030',
  separator: 'rgba(168,112,32,.10)', timelineBg: 'rgba(168,112,32,.08)', timelineFill: '#A87020',
  ledgerBg: '#FDF5E4', ledgerBorder: 'rgba(168,112,32,.22)',
  tabActive: '#A87020', tabInactive: '#B8A888',
}

function D7Ledger() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]   = useState('Mysteries')
  const [libExpanded, setLibExpanded] = useState(false)
  const [hoveredTab, setHoveredTab] = useState(null)
  const SERIF = "'Playfair Display', Georgia, serif"
  const MONO = "'JetBrains Mono', 'Fira Mono', monospace"
  const M = mode === 'dark' ? D7DARK : D7LIGHT
  const SL = { fontSize: 9, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: M.textDim, marginBottom: 14 }

  const visibleBooks = libExpanded ? LIBRARY : LIBRARY.filter(b => b.status === 'reading')

  const tabContent = () => {
    switch (activeTab) {
      case 'Progress': return (
        <div key="prog" className="view-enter">
          <p style={SL}>Chapter log</p>
          {CHAPTERS_DEMO.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${M.separator}`, opacity: ch.completed ? 1 : 0.45 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: M.textDim, minWidth: 24 }}>{ch.num}</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: M.timelineBg }}>
                <div style={{ height: '100%', width: ch.completed ? '100%' : '0%', borderRadius: 2, background: M.timelineFill, opacity: ch.singularity ? 1 : 0.6 }} />
              </div>
              <span style={{ flex: 2, fontSize: 12, color: ch.completed ? M.textSecondary : M.textDim }}>{ch.title}{ch.singularity && <span style={{ color: M.cognac, marginLeft: 5 }}>✦</span>}</span>
              {ch.notesCount > 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: M.cognac }}>{ch.notesCount}</span>}
            </div>
          ))}
        </div>
      )
      case 'Characters': return (
        <div key="chars" className="view-enter">
          <p style={SL}>Cast log</p>
          {CHARACTERS.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: `1px solid ${M.separator}` }}>
              <div style={{ width: 3, borderRadius: 2, background: M.cognacDim, flexShrink: 0, alignSelf: 'stretch' }} />
              <div>
                <p style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: M.textPrimary, marginBottom: 2 }}>{ch.name}</p>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: M.textDim, marginBottom: 6 }}>{ch.role}</p>
                <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.6 }}>{ch.description}</p>
              </div>
            </div>
          ))}
        </div>
      )
      case 'Notes': return (
        <div key="notes" className="view-enter">
          <p style={SL}>Field notes</p>
          {NOTES.map((n, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: `1px solid ${M.separator}` }}>
              <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, marginBottom: 4 }}>{n.text}</p>
              <span style={{ fontFamily: MONO, fontSize: 9, color: M.textDim }}>{n.days}d · {n.tag}</span>
            </div>
          ))}
        </div>
      )
      case 'Mysteries': return (
        <div key="myst" className="view-enter">
          <p style={SL}>Open ledger entries</p>
          {MYSTERIES.map((m, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: 8, marginBottom: 8, background: m.haunt === 'haunted' ? M.cognacDim : 'transparent', border: `1px solid ${m.haunt === 'haunted' ? M.cardBorderStrong : M.separator}` }}>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: m.haunt === 'haunted' ? M.textPrimary : M.textDim, lineHeight: 1.6 }}>
                {m.haunt === 'haunted' && <span style={{ fontFamily: MONO, fontStyle: 'normal', fontSize: 8, color: M.cognac, marginRight: 8, letterSpacing: '0.08em' }}>OPEN</span>}
                {m.text}
              </p>
            </div>
          ))}
        </div>
      )
      case 'Discussion': return (
        <div key="disc" className="view-enter">
          <p style={SL}>Discussion</p>
          {DISCUSSION.map((q, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: `1px solid ${M.separator}` }}>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.65 }}>{q}</p>
            </div>
          ))}
        </div>
      )
      default: return null
    }
  }

  return (
    <div style={{ background: M.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '52px 32px 0' }}>
        <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.11em', textTransform: 'uppercase', color: M.textDim, marginBottom: 6 }}>Direction 7</p>
        <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 10 }}>Cognac Ledger</h2>
        <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, maxWidth: 500 }}>A reading ledger — warm cognac on dark felt. Every book an entry. Every chapter a logged line. The companion holds the open questions.</p>
      </div>

      <div style={{ maxWidth: 800, margin: '40px auto 0', padding: '0 32px', display: 'grid', gridTemplateColumns: '1fr 240px', gap: 40 }}>
        {/* Main column */}
        <div>
          {/* Library ledger */}
          <p style={SL}>Library</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 32 }}>
            {visibleBooks.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${M.separator}`, background: i % 2 === 0 ? 'transparent' : M.cognacDim, opacity: b.depth === 'dormant' ? 0.45 : 1 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: M.textDim, minWidth: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                <BookCover index={LIBRARY.indexOf(b)} w={28} h={40} radius={2} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: SERIF, fontSize: 14, fontWeight: b.depth === 'deep' ? 600 : 400, color: M.textPrimary }}>{b.title}</p>
                  <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: M.textDim }}>{b.author}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: b.depth === 'deep' ? M.cognac : M.textDim }}>
                    {b.status === 'finished' ? '100%' : b.status === 'paused' ? 'paused' : `${b.progress}%`}
                  </p>
                  {b.depth === 'deep' && (
                    <div style={{ marginTop: 4, width: 48, height: 2, borderRadius: 1, background: M.timelineBg }}>
                      <div style={{ height: '100%', width: `${b.progress}%`, borderRadius: 1, background: M.timelineFill }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!libExpanded && (
            <button onClick={() => setLibExpanded(true)} style={{ fontFamily: MONO, fontSize: 9, color: M.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 32, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'opacity .15s' }}>
              + {LIBRARY.filter(b => b.status !== 'reading').length} more entries
            </button>
          )}

          {/* Active book */}
          <div style={{ borderTop: `1px solid ${M.cardBorderStrong}`, paddingTop: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
              <BookCover index={0} w={56} h={80} radius={4} />
              <div style={{ flex: 1 }}>
                <p style={SL}>Active entry</p>
                <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 4 }}>The Master and Margarita</h2>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: M.textSecondary, marginBottom: 10 }}>Mikhail Bulgakov</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: M.timelineBg }}>
                    <div style={{ height: '100%', width: '59%', borderRadius: 2, background: M.timelineFill }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: M.cognac }}>ch.19/32</span>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${M.separator}`, marginBottom: 20 }}>
              {TABS.map(t => (
                <button key={t} onMouseEnter={() => setHoveredTab(t)} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab(t)}
                  style={{ fontSize: 11, fontWeight: activeTab === t ? 700 : 400, letterSpacing: '0.04em', background: 'none', border: 'none', cursor: 'pointer', padding: '0 14px 10px 0',
                    color: activeTab === t ? M.tabActive : hoveredTab === t ? M.textSecondary : M.tabInactive,
                    borderBottom: `2px solid ${activeTab === t ? M.tabActive : 'transparent'}`,
                    transition: 'color .12s, border-color .12s' }}
                >{t}</button>
              ))}
            </div>
            {tabContent()}
          </div>
        </div>

        {/* Ledger note column */}
        <div style={{ paddingTop: 0 }}>
          <div style={{ background: M.ledgerBg, border: `1px solid ${M.ledgerBorder}`, borderRadius: 12, padding: '20px 18px', position: 'sticky', top: 80 }}>
            <p style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: M.cognac, marginBottom: 14 }}>Ledger Note</p>
            <p style={{ fontFamily: SERIF, fontSize: 14, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.7, marginBottom: 14, opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease' }}>{c.text}</p>
            {c.typing
              ? <p style={{ fontFamily: MONO, fontSize: 9, color: M.textDim, marginBottom: 12 }}>logging…</p>
              : <button onClick={c.next} style={{ fontFamily: MONO, fontSize: 9, color: M.cognac, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12, letterSpacing: '0.06em', transition: 'opacity .15s' }}>next entry →</button>
            }
            <div style={{ borderTop: `1px solid ${M.ledgerBorder}`, paddingTop: 12 }}>
              <input value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
                placeholder="Add to ledger…"
                style={{ width: '100%', border: 'none', borderBottom: `1px solid ${M.separator}`, background: 'transparent', fontSize: 12, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, outline: 'none', padding: '6px 0', boxSizing: 'border-box', marginBottom: 8 }}
              />
              <button onClick={() => c.ask(c.input)} style={{ fontFamily: MONO, fontSize: 9, color: M.cognac, background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.06em' }}>↵ log</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{ height: 80 }} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 8 — Greenhouse
══════════════════════════════════════════════════════════════════════════════ */

const D8DARK = {
  bg: '#0C1410', panelBg: '#0E1A12', panelBorder: 'rgba(100,160,80,.15)',
  companionBg: 'linear-gradient(180deg, #0F1E12 0%, #091408 100%)',
  companionGlow: 'radial-gradient(ellipse at 50% 0%, rgba(80,160,60,.10) 0%, transparent 70%)',
  textPrimary: '#C8DCC0', textSecondary: '#6A9A60', textDim: '#3A5A34',
  sage: '#5A9A4A', sageDim: 'rgba(90,154,74,.16)', sageBright: '#72B860',
  separator: 'rgba(90,154,74,.12)', border: 'rgba(90,154,74,.14)',
  growthBg: 'rgba(90,154,74,.10)', growthFill: '#5A9A4A',
  leafGlow: 'rgba(90,154,74,.08)',
}
const D8LIGHT = {
  bg: '#F4FAF2', panelBg: '#FFFFFF', panelBorder: 'rgba(80,140,60,.12)',
  companionBg: 'linear-gradient(180deg, #E8F4E4 0%, #DFF0D8 100%)',
  companionGlow: 'radial-gradient(ellipse at 50% 0%, rgba(80,160,60,.08) 0%, transparent 70%)',
  textPrimary: '#1A2E18', textSecondary: '#4A7A40', textDim: '#9AB890',
  sage: '#4A8A38', sageDim: 'rgba(74,138,56,.12)', sageBright: '#5A9A48',
  separator: 'rgba(74,138,56,.10)', border: 'rgba(74,138,56,.12)',
  growthBg: 'rgba(74,138,56,.08)', growthFill: '#4A8A38',
  leafGlow: 'rgba(74,138,56,.06)',
}

function D8Greenhouse() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]     = useState('Mysteries')
  const [libExpanded, setLibExpanded] = useState(false)
  const [hoveredBook, setHoveredBook] = useState(null)
  const [hoveredTab, setHoveredTab]   = useState(null)
  const SERIF = "'Playfair Display', Georgia, serif"
  const M = mode === 'dark' ? D8DARK : D8LIGHT
  const SL = { fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, marginBottom: 14 }
  const visibleBooks = libExpanded ? LIBRARY : LIBRARY.filter(b => b.status === 'reading')

  const tabContent = () => {
    switch (activeTab) {
      case 'Progress': return (
        <div key="prog" className="view-enter">
          <p style={SL}>Growth log</p>
          <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 10, background: M.sageDim, border: `1px solid ${M.border}` }}>
            <p style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: M.textPrimary, letterSpacing: '-0.02em', marginBottom: 2 }}>Ch. 19</p>
            <p style={{ fontSize: 12, color: M.textDim }}>of 32 · 59% grown · 54 days</p>
          </div>
          {CHAPTERS_DEMO.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${M.separator}`, opacity: ch.completed ? 1 : 0.45 }}>
              <span style={{ fontSize: 11, color: M.textDim, minWidth: 22 }}>{ch.num}</span>
              <span style={{ fontSize: 12, color: ch.completed ? M.sage : M.textDim }}>{ch.completed ? '✓' : '·'}</span>
              <span style={{ flex: 1, fontSize: 13, color: M.textSecondary }}>{ch.title}{ch.singularity && <span style={{ color: M.sage, marginLeft: 5 }}>✦</span>}</span>
            </div>
          ))}
        </div>
      )
      case 'Characters': return (
        <div key="chars" className="view-enter">
          <p style={SL}>Characters</p>
          {CHARACTERS.map((ch, i) => (
            <div key={i} style={{ marginBottom: 12, padding: '14px 16px', borderRadius: 10, background: M.panelBg, border: `1px solid ${M.border}` }}>
              <p style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: M.textPrimary, marginBottom: 2 }}>{ch.name}</p>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: M.textDim, marginBottom: 6 }}>{ch.role}</p>
              <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.6 }}>{ch.description}</p>
            </div>
          ))}
        </div>
      )
      case 'Notes': return (
        <div key="notes" className="view-enter">
          <p style={SL}>Notes</p>
          {NOTES.map((n, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 8, background: M.panelBg, border: `1px solid ${M.separator}` }}>
              <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, marginBottom: 4 }}>{n.text}</p>
              <p style={{ fontSize: 10, color: M.textDim }}>{n.days}d ago · {n.tag}</p>
            </div>
          ))}
        </div>
      )
      case 'Mysteries': return (
        <div key="myst" className="view-enter">
          <p style={SL}>Open questions</p>
          {MYSTERIES.map((m, i) => (
            <div key={i} style={{ marginBottom: 8, padding: '12px 14px', borderRadius: 8, background: m.haunt === 'haunted' ? M.sageDim : 'transparent', border: `1px solid ${m.haunt === 'haunted' ? M.sage + '44' : M.separator}` }}>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: m.haunt === 'haunted' ? M.textPrimary : M.textDim, lineHeight: 1.6 }}>
                {m.haunt === 'haunted' && <span style={{ color: M.sage, marginRight: 6 }}>✦</span>}{m.text}
              </p>
            </div>
          ))}
        </div>
      )
      case 'Discussion': return (
        <div key="disc" className="view-enter">
          <p style={SL}>Discussion</p>
          {DISCUSSION.map((q, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 8, background: M.panelBg, border: `1px solid ${M.separator}` }}>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.65 }}>{q}</p>
            </div>
          ))}
        </div>
      )
      default: return null
    }
  }

  return (
    <div style={{ background: M.bg, minHeight: '100vh', display: 'grid', gridTemplateColumns: '280px 1fr' }}>
      {/* Companion panel */}
      <div style={{ background: M.companionBg, borderRight: `1px solid ${M.panelBorder}`, padding: '52px 24px 32px', position: 'relative', minHeight: '100vh' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, background: M.companionGlow, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, marginBottom: 28 }}>Dir. 8</p>
          <p style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 6 }}>Greenhouse</p>
          <p style={{ fontSize: 12, color: M.textSecondary, lineHeight: 1.6, marginBottom: 28 }}>Reading grows in still, careful conditions.</p>

          <p style={{ fontFamily: SERIF, fontSize: 15, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.75, opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease', marginBottom: 16 }}>{c.text}</p>
          {c.typing && <p style={{ fontSize: 11, color: M.textDim, marginBottom: 12 }}>…</p>}
          {!c.typing && <button onClick={c.next} style={{ fontSize: 11, color: M.sage, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20, fontFamily: SERIF, fontStyle: 'italic' }}>Next thought</button>}

          <div style={{ borderTop: `1px solid ${M.separator}`, paddingTop: 18 }}>
            <input value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
              placeholder="Speak to the greenhouse…"
              style={{ width: '100%', border: 'none', borderBottom: `1px solid ${M.separator}`, background: 'transparent', fontSize: 12, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, outline: 'none', padding: '6px 0', boxSizing: 'border-box', marginBottom: 8 }}
            />
            <button onClick={() => c.ask(c.input)} style={{ fontSize: 12, color: M.sage, background: 'none', border: 'none', cursor: 'pointer' }}>↵</button>
          </div>
        </div>
      </div>

      {/* Content panel */}
      <div style={{ padding: '52px 36px' }}>
        <p style={SL}>Library</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {visibleBooks.map((b, i) => {
            const li = LIBRARY.indexOf(b)
            const isH = hoveredBook === li
            return (
              <div key={i} onMouseEnter={() => setHoveredBook(li)} onMouseLeave={() => setHoveredBook(null)}
                style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px', borderRadius: 12, background: M.panelBg, border: `1px solid ${isH ? M.sage + '44' : M.border}`, opacity: b.depth === 'dormant' ? 0.45 : 1, transition: 'border-color .2s', cursor: 'pointer' }}
              >
                <BookCover index={li} w={36} h={52} radius={3} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: SERIF, fontSize: 14, fontWeight: b.depth === 'deep' ? 600 : 400, color: M.textPrimary, marginBottom: 2 }}>{b.title}</p>
                  <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: M.textDim }}>{b.author}</p>
                </div>
                {b.depth !== 'dormant' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 4, height: 40, borderRadius: 2, background: M.growthBg, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${b.progress || (b.status === 'finished' ? 100 : 20)}%`, borderRadius: 2, background: M.growthFill, opacity: b.depth === 'deep' ? 1 : 0.5 }} />
                    </div>
                    <span style={{ fontSize: 8, color: M.textDim }}>
                      {b.status === 'finished' ? '✓' : b.status === 'paused' ? '·' : `${b.progress}%`}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {!libExpanded && (
          <button onClick={() => setLibExpanded(true)} style={{ fontSize: 12, color: M.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 32, fontFamily: SERIF, fontStyle: 'italic' }}>
            See all companions →
          </button>
        )}

        {/* Active book */}
        <div style={{ borderTop: `1px solid ${M.border}`, paddingTop: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
            <BookCover index={0} w={56} h={80} radius={5} />
            <div>
              <p style={SL}>Active</p>
              <h2 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 4 }}>The Master and Margarita</h2>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: M.textSecondary, marginBottom: 8 }}>Mikhail Bulgakov</p>
              <div style={{ height: 3, borderRadius: 2, background: M.growthBg, width: 160 }}>
                <div style={{ height: '100%', width: '59%', borderRadius: 2, background: M.growthFill }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, borderBottom: `1px solid ${M.separator}`, marginBottom: 20 }}>
            {TABS.map(t => (
              <button key={t} onMouseEnter={() => setHoveredTab(t)} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab(t)}
                style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px',
                  color: activeTab === t ? M.sage : hoveredTab === t ? M.textSecondary : M.textDim,
                  borderBottom: `2px solid ${activeTab === t ? M.sage : 'transparent'}`,
                  transition: 'color .12s, border-color .12s' }}
              >{t}</button>
            ))}
          </div>
          {tabContent()}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 9 — Codex Intelligence
══════════════════════════════════════════════════════════════════════════════ */

const D9DARK = {
  bg: '#080C10', cardBg: '#0C1218', cardBorder: 'rgba(0,200,220,.10)', cardBorderStrong: 'rgba(0,200,220,.24)',
  textPrimary: '#C8E8F0', textSecondary: '#4A8090', textDim: '#1C3040',
  cyan: '#00C8DC', cyanDim: 'rgba(0,200,220,.12)', cyanGlow: 'rgba(0,200,220,.06)',
  separator: 'rgba(0,200,220,.08)', analyticBg: '#080E14',
  analyticBorder: 'rgba(0,200,220,.20)', glow: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,200,220,.06) 0%, transparent 70%)',
}
const D9LIGHT = {
  bg: '#F0F6FA', cardBg: '#FFFFFF', cardBorder: 'rgba(0,130,160,.10)', cardBorderStrong: 'rgba(0,130,160,.26)',
  textPrimary: '#0A1E2A', textSecondary: '#3A7080', textDim: '#90B0BC',
  cyan: '#007898', cyanDim: 'rgba(0,120,152,.10)', cyanGlow: 'rgba(0,120,152,.05)',
  separator: 'rgba(0,120,152,.08)', analyticBg: '#E6F2F8',
  analyticBorder: 'rgba(0,120,152,.18)', glow: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,120,152,.08) 0%, transparent 70%)',
}

function D9Codex() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]     = useState('Mysteries')
  const [libExpanded, setLibExpanded] = useState(false)
  const [hoveredBook, setHoveredBook] = useState(null)
  const [hoveredTab, setHoveredTab]   = useState(null)
  const SERIF = "'Playfair Display', Georgia, serif"
  const MONO = "'JetBrains Mono', 'Fira Mono', monospace"
  const M = mode === 'dark' ? D9DARK : D9LIGHT
  const SL = { fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: M.cyan, marginBottom: 14, opacity: 0.8 }
  const visibleBooks = libExpanded ? LIBRARY : LIBRARY.filter(b => b.status === 'reading')

  const tabContent = () => {
    switch (activeTab) {
      case 'Progress': return (
        <div key="prog" className="view-enter">
          <p style={SL}>Progress analysis</p>
          <div style={{ padding: '14px 16px', borderRadius: 8, background: M.cyanDim, border: `1px solid ${M.cardBorderStrong}`, marginBottom: 18 }}>
            <p style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: M.cyan, letterSpacing: '-0.02em', marginBottom: 2 }}>59%</p>
            <p style={{ fontFamily: MONO, fontSize: 10, color: M.textSecondary }}>ch.19 / 32 · 54 days active</p>
          </div>
          {CHAPTERS_DEMO.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${M.separator}`, opacity: ch.completed ? 1 : 0.4 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: M.textDim, minWidth: 22 }}>{ch.num}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: ch.completed ? M.cyan : M.textDim }}>{ch.completed ? '■' : '□'}</span>
              <span style={{ flex: 1, fontSize: 13, color: M.textSecondary }}>{ch.title}{ch.singularity && <span style={{ color: M.cyan, marginLeft: 5 }}>◈</span>}</span>
              {ch.notesCount > 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: M.cyan }}>{ch.notesCount}</span>}
            </div>
          ))}
        </div>
      )
      case 'Characters': return (
        <div key="chars" className="view-enter">
          <p style={SL}>Entity index</p>
          {CHARACTERS.map((ch, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 8, background: M.cardBg, border: `1px solid ${M.cardBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <p style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: M.textPrimary }}>{ch.name}</p>
                <span style={{ fontFamily: MONO, fontSize: 8, color: M.cyan, opacity: 0.7, letterSpacing: '0.06em' }}>ENTITY</span>
              </div>
              <p style={{ fontFamily: MONO, fontSize: 9, color: M.textDim, marginBottom: 6, letterSpacing: '0.04em' }}>{ch.role.toUpperCase()}</p>
              <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.6 }}>{ch.description}</p>
            </div>
          ))}
        </div>
      )
      case 'Notes': return (
        <div key="notes" className="view-enter">
          <p style={SL}>Field data</p>
          {NOTES.map((n, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 8, background: M.cardBg, border: `1px solid ${M.cardBorder}` }}>
              <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, marginBottom: 4 }}>{n.text}</p>
              <p style={{ fontFamily: MONO, fontSize: 9, color: M.textDim }}>{n.days}d · {n.tag}</p>
            </div>
          ))}
        </div>
      )
      case 'Mysteries': return (
        <div key="myst" className="view-enter">
          <p style={SL}>Open queries</p>
          {MYSTERIES.map((m, i) => (
            <div key={i} style={{ marginBottom: 8, padding: '12px 14px', borderRadius: 8, background: m.haunt === 'haunted' ? M.cyanDim : M.cardBg, border: `1px solid ${m.haunt === 'haunted' ? M.cardBorderStrong : M.cardBorder}` }}>
              {m.haunt === 'haunted' && <p style={{ fontFamily: MONO, fontSize: 8, color: M.cyan, marginBottom: 4, letterSpacing: '0.06em' }}>ACTIVE QUERY</p>}
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: m.haunt === 'haunted' ? M.textPrimary : M.textDim, lineHeight: 1.6 }}>{m.text}</p>
            </div>
          ))}
        </div>
      )
      case 'Discussion': return (
        <div key="disc" className="view-enter">
          <p style={SL}>Discussion log</p>
          {DISCUSSION.map((q, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 8, background: M.cardBg, border: `1px solid ${M.cardBorder}` }}>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.65 }}>{q}</p>
            </div>
          ))}
        </div>
      )
      default: return null
    }
  }

  return (
    <div style={{ background: M.bg, minHeight: '100vh', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, background: M.glow, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto', padding: '52px 32px' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', color: M.textDim, marginBottom: 8 }}>DIRECTION_09 / CODEX_INTELLIGENCE</p>
          <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 8 }}>Codex Intelligence</h2>
          <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, maxWidth: 480 }}>An analytical reading environment. Every book is a case. Every mystery is an open query. The companion is the analyst.</p>
        </div>

        {/* Case cards — library */}
        <p style={SL}>Case files</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
          {visibleBooks.map((b, i) => {
            const li = LIBRARY.indexOf(b)
            const isH = hoveredBook === li
            return (
              <div key={i} onMouseEnter={() => setHoveredBook(li)} onMouseLeave={() => setHoveredBook(null)}
                style={{ width: 'calc(50% - 6px)', padding: '14px 16px', borderRadius: 10, background: M.cardBg, border: `1px solid ${isH ? M.cardBorderStrong : M.cardBorder}`, opacity: b.depth === 'dormant' ? 0.4 : 1, transition: 'border-color .2s', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <BookCover index={li} w={32} h={46} radius={3} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: MONO, fontSize: 8, color: M.cyan, marginBottom: 3, letterSpacing: '0.06em' }}>CASE-{String(li + 1).padStart(3, '0')}</p>
                    <p style={{ fontFamily: SERIF, fontSize: 13, fontWeight: b.depth === 'deep' ? 600 : 400, color: M.textPrimary, lineHeight: 1.2 }}>{b.title}</p>
                    <p style={{ fontSize: 10, color: M.textDim, marginTop: 2 }}>{b.author}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, height: 2, borderRadius: 1, background: M.cyanDim, marginRight: 8 }}>
                    <div style={{ height: '100%', width: `${b.progress || (b.status === 'finished' ? 100 : 15)}%`, borderRadius: 1, background: M.cyan, opacity: 0.7 }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: M.textDim }}>
                    {b.status === 'finished' ? 'CLOSED' : b.status === 'paused' ? 'PAUSED' : `${b.progress}%`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        {!libExpanded && (
          <button onClick={() => setLibExpanded(true)} style={{ fontFamily: MONO, fontSize: 9, color: M.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 32, letterSpacing: '0.08em' }}>
            LOAD_ALL ({LIBRARY.length}) →
          </button>
        )}

        {/* Active case */}
        <div style={{ background: M.analyticBg, border: `1px solid ${M.analyticBorder}`, borderRadius: 14, padding: '24px 24px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
            <BookCover index={0} w={56} h={80} radius={4} />
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: MONO, fontSize: 8, color: M.cyan, marginBottom: 6, letterSpacing: '0.08em' }}>ACTIVE CASE · CASE-001</p>
              <h2 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 4 }}>The Master and Margarita</h2>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: M.textSecondary, marginBottom: 10 }}>Mikhail Bulgakov</p>
              <div style={{ display: 'flex', gap: 16 }}>
                {[['CH', '19/32'], ['DAYS', '54'], ['NOTES', '23'], ['OPEN', '3']].map(([l, v]) => (
                  <div key={l}>
                    <p style={{ fontFamily: MONO, fontSize: 7, color: M.textDim, letterSpacing: '0.08em' }}>{l}</p>
                    <p style={{ fontFamily: MONO, fontSize: 13, color: M.cyan, fontWeight: 700 }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analyst block */}
          <div style={{ borderTop: `1px solid ${M.cardBorder}`, paddingTop: 16, marginBottom: 16 }}>
            <p style={{ fontFamily: MONO, fontSize: 8, color: M.cyan, marginBottom: 8, letterSpacing: '0.08em', opacity: 0.7 }}>THE ANALYST</p>
            <p style={{ fontFamily: SERIF, fontSize: 14, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.7, opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease', marginBottom: 10 }}>{c.text}</p>
            {c.typing
              ? <p style={{ fontFamily: MONO, fontSize: 9, color: M.textDim }}>processing…</p>
              : <button onClick={c.next} style={{ fontFamily: MONO, fontSize: 9, color: M.cyan, background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.06em' }}>NEXT_OBSERVATION →</button>
            }
          </div>
          <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${M.cardBorder}`, paddingTop: 14 }}>
            <input value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
              placeholder="Query the analyst…"
              style={{ flex: 1, border: 'none', borderBottom: `1px solid ${M.separator}`, background: 'transparent', fontFamily: MONO, fontSize: 12, color: M.textPrimary, outline: 'none', padding: '4px 0' }}
            />
            <button onClick={() => c.ask(c.input)} style={{ fontFamily: MONO, fontSize: 11, color: M.cyan, background: 'none', border: 'none', cursor: 'pointer' }}>↵</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 16, borderBottom: `1px solid ${M.separator}`, marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t} onMouseEnter={() => setHoveredTab(t)} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab(t)}
              style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px',
                color: activeTab === t ? M.cyan : hoveredTab === t ? M.textSecondary : M.textDim,
                borderBottom: `2px solid ${activeTab === t ? M.cyan : 'transparent'}`,
                transition: 'color .12s, border-color .12s' }}
            >{t.toUpperCase()}</button>
          ))}
        </div>
        {tabContent()}
      </div>
      <div style={{ height: 60 }} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 10 — Gallery & Catalog
══════════════════════════════════════════════════════════════════════════════ */

const D10DARK = {
  bg: '#0C1018', cardBg: '#121824', cardBorder: 'rgba(100,130,180,.14)', cardBorderStrong: 'rgba(100,130,180,.28)',
  textPrimary: '#C0CCEA', textSecondary: '#5A6A8A', textDim: '#2A3450',
  slate: '#6A8ACA', slateDim: 'rgba(106,138,202,.14)', slateBright: '#8AACDE',
  separator: 'rgba(100,130,180,.10)', curatorBg: '#0A0E18',
  curatorBorder: 'rgba(100,130,180,.22)',
  glow: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(80,120,200,.06) 0%, transparent 70%)',
}
const D10LIGHT = {
  bg: '#F2F5FC', cardBg: '#FFFFFF', cardBorder: 'rgba(80,100,160,.10)', cardBorderStrong: 'rgba(80,100,160,.25)',
  textPrimary: '#0E1830', textSecondary: '#4A5880', textDim: '#9AA8C8',
  slate: '#4A6AB0', slateDim: 'rgba(74,106,176,.10)', slateBright: '#5A7AC0',
  separator: 'rgba(74,106,176,.08)', curatorBg: '#E8EEF8',
  curatorBorder: 'rgba(74,106,176,.18)',
  glow: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(74,106,176,.08) 0%, transparent 70%)',
}

function D10Gallery() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]     = useState('Mysteries')
  const [libExpanded, setLibExpanded] = useState(false)
  const [hoveredBook, setHoveredBook] = useState(null)
  const [hoveredTab, setHoveredTab]   = useState(null)
  const SERIF = "'Playfair Display', Georgia, serif"
  const M = mode === 'dark' ? D10DARK : D10LIGHT
  const SL = { fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: M.textDim, marginBottom: 14 }
  const visibleBooks = libExpanded ? LIBRARY : LIBRARY.filter(b => b.status === 'reading')

  const tabContent = () => {
    switch (activeTab) {
      case 'Progress': return (
        <div key="prog" className="view-enter">
          <p style={SL}>Reading progress</p>
          <div style={{ padding: '16px 18px', borderRadius: 10, background: M.slateDim, border: `1px solid ${M.cardBorderStrong}`, marginBottom: 18 }}>
            <p style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, color: M.textPrimary, letterSpacing: '-0.02em', marginBottom: 2 }}>Ch. 19</p>
            <p style={{ fontSize: 12, color: M.textDim }}>of 32 · 59% · 54 days</p>
          </div>
          {CHAPTERS_DEMO.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${M.separator}`, opacity: ch.completed ? 1 : 0.4 }}>
              <span style={{ fontSize: 10, color: M.textDim, minWidth: 22 }}>{ch.num}</span>
              <span style={{ fontSize: 12, color: ch.completed ? M.slate : M.textDim }}>{ch.completed ? '✓' : '·'}</span>
              <span style={{ flex: 1, fontSize: 13, color: M.textSecondary }}>{ch.title}{ch.singularity && <span style={{ color: M.slate, marginLeft: 5 }}>◆</span>}</span>
              {ch.notesCount > 0 && <span style={{ fontSize: 10, color: M.slate }}>{ch.notesCount}</span>}
            </div>
          ))}
        </div>
      )
      case 'Characters': return (
        <div key="chars" className="view-enter">
          <p style={SL}>Catalog — persons</p>
          {CHARACTERS.map((ch, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '14px 16px', borderRadius: 10, background: M.cardBg, border: `1px solid ${M.cardBorder}` }}>
              <p style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: M.textPrimary, marginBottom: 2 }}>{ch.name}</p>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, marginBottom: 8 }}>{ch.role}</p>
              <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.6 }}>{ch.description}</p>
            </div>
          ))}
        </div>
      )
      case 'Notes': return (
        <div key="notes" className="view-enter">
          <p style={SL}>Annotations</p>
          {NOTES.map((n, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 8, background: M.cardBg, border: `1px solid ${M.separator}` }}>
              <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, marginBottom: 4 }}>{n.text}</p>
              <p style={{ fontSize: 10, color: M.textDim }}>{n.days}d ago · {n.tag}</p>
            </div>
          ))}
        </div>
      )
      case 'Mysteries': return (
        <div key="myst" className="view-enter">
          <p style={SL}>Unresolved inquiries</p>
          {MYSTERIES.map((m, i) => (
            <div key={i} style={{ marginBottom: 8, padding: '12px 14px', borderRadius: 8, background: m.haunt === 'haunted' ? M.slateDim : M.cardBg, border: `1px solid ${m.haunt === 'haunted' ? M.cardBorderStrong : M.cardBorder}` }}>
              {m.haunt === 'haunted' && <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.slate, marginBottom: 4 }}>Open inquiry</p>}
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: m.haunt === 'haunted' ? M.textPrimary : M.textDim, lineHeight: 1.6 }}>{m.text}</p>
            </div>
          ))}
        </div>
      )
      case 'Discussion': return (
        <div key="disc" className="view-enter">
          <p style={SL}>Discussion</p>
          {DISCUSSION.map((q, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 8, background: M.cardBg, border: `1px solid ${M.separator}` }}>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.65 }}>{q}</p>
            </div>
          ))}
        </div>
      )
      default: return null
    }
  }

  return (
    <div style={{ background: M.bg, minHeight: '100vh', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, background: M.glow, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto', padding: '52px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: M.textDim, marginBottom: 8 }}>Direction 10 · Gallery & Catalog</p>
          <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 8 }}>The Reading Gallery</h2>
          <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, maxWidth: 480 }}>An institutional collection. Each book is cataloged, numbered, curated. The companion holds the gallery notes.</p>
        </div>

        <div style={{ borderTop: `1px solid ${M.cardBorderStrong}`, marginBottom: 32 }} />

        {/* Gallery grid */}
        <p style={SL}>The collection</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {visibleBooks.map((b, i) => {
            const li = LIBRARY.indexOf(b)
            const isH = hoveredBook === li
            return (
              <div key={i} onMouseEnter={() => setHoveredBook(li)} onMouseLeave={() => setHoveredBook(null)}
                style={{ background: M.cardBg, border: `1px solid ${isH ? M.cardBorderStrong : M.cardBorder}`, borderRadius: 12, padding: '16px', opacity: b.depth === 'dormant' ? 0.4 : 1, transition: 'border-color .2s', cursor: 'pointer' }}
              >
                <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, marginBottom: 10 }}>CAT-{String(li + 1).padStart(3, '0')}</p>
                <BookCover index={li} w={56} h={80} radius={4} />
                <p style={{ fontFamily: SERIF, fontSize: 13, fontWeight: b.depth === 'deep' ? 600 : 400, color: M.textPrimary, marginTop: 10, marginBottom: 2, lineHeight: 1.2 }}>{b.title}</p>
                <p style={{ fontSize: 10, color: M.textDim, marginBottom: 8 }}>{b.author}</p>
                <div style={{ height: 2, borderRadius: 1, background: M.slateDim }}>
                  <div style={{ height: '100%', width: `${b.progress || (b.status === 'finished' ? 100 : 15)}%`, borderRadius: 1, background: M.slate, opacity: 0.7 }} />
                </div>
              </div>
            )
          })}
        </div>
        {!libExpanded && (
          <button onClick={() => setLibExpanded(true)} style={{ fontSize: 12, color: M.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 32 }}>
            View full collection ({LIBRARY.length}) →
          </button>
        )}

        {/* Active work + curatorial note */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 28, marginBottom: 32 }}>
          {/* Main */}
          <div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20, padding: '20px', background: M.cardBg, borderRadius: 12, border: `1px solid ${M.cardBorderStrong}` }}>
              <BookCover index={0} w={60} h={86} radius={5} />
              <div>
                <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, marginBottom: 6 }}>CAT-001 · Active</p>
                <h2 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 4 }}>The Master and Margarita</h2>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: M.textSecondary, marginBottom: 10 }}>Mikhail Bulgakov</p>
                <div style={{ height: 3, borderRadius: 2, background: M.slateDim, width: 160 }}>
                  <div style={{ height: '100%', width: '59%', borderRadius: 2, background: M.slate }} />
                </div>
                <p style={{ fontSize: 11, color: M.textDim, marginTop: 4 }}>Ch. 19 of 32 · 54 days · 23 notes</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, borderBottom: `1px solid ${M.separator}`, marginBottom: 20 }}>
              {TABS.map(t => (
                <button key={t} onMouseEnter={() => setHoveredTab(t)} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab(t)}
                  style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px',
                    color: activeTab === t ? M.slate : hoveredTab === t ? M.textSecondary : M.textDim,
                    borderBottom: `2px solid ${activeTab === t ? M.slate : 'transparent'}`,
                    transition: 'color .12s, border-color .12s' }}
                >{t}</button>
              ))}
            </div>
            {tabContent()}
          </div>

          {/* Curatorial note */}
          <div style={{ background: M.curatorBg, border: `1px solid ${M.curatorBorder}`, borderRadius: 12, padding: '20px 18px', alignSelf: 'start', position: 'sticky', top: 80 }}>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: M.slate, marginBottom: 12 }}>Curatorial Note</p>
            <p style={{ fontFamily: SERIF, fontSize: 14, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.7, marginBottom: 14, opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease' }}>{c.text}</p>
            {c.typing
              ? <p style={{ fontSize: 10, color: M.textDim, marginBottom: 10 }}>composing…</p>
              : <button onClick={c.next} style={{ fontSize: 11, color: M.slate, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 14, fontFamily: SERIF, fontStyle: 'italic' }}>Next note</button>
            }
            <div style={{ borderTop: `1px solid ${M.curatorBorder}`, paddingTop: 12 }}>
              <input value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
                placeholder="Add a curatorial note…"
                style={{ width: '100%', border: 'none', borderBottom: `1px solid ${M.separator}`, background: 'transparent', fontSize: 12, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, outline: 'none', padding: '6px 0', boxSizing: 'border-box', marginBottom: 8 }}
              />
              <button onClick={() => c.ask(c.input)} style={{ fontSize: 12, color: M.slate, background: 'none', border: 'none', cursor: 'pointer' }}>↵</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 11 — Scholar's Study
   Merges: D3 atmosphere · D7 ledger rows · D9 full-width book detail
   Fix: warm cream textPrimary in dark (not cold blue); warm cognac light mode
══════════════════════════════════════════════════════════════════════════════ */

const D11DARK = {
  bg:            '#091820',
  cardBase:      '#0E1C28',
  cardDeep:      '#132230',
  cardHover:     '#18303C',
  textPrimary:   '#D8CCBA',
  textSecondary: '#6A8898',
  textDim:       '#2C4050',
  accent:        '#3C7AAA',
  accentDim:     'rgba(60,122,170,.18)',
  separator:     'rgba(60,122,170,.12)',
  separatorSoft: 'rgba(60,122,170,.07)',
  companionBg:   '#0C1A22',
  glow:          'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(40,110,160,.16) 0%, transparent 65%)',
  mysticalGlow:  'radial-gradient(circle 400px at 15% 40%, rgba(30,90,130,.08) 0%, transparent 70%)',
  goldFoil:      'linear-gradient(90deg, #7A5A28 0%, #C4A058 50%, #8A6830 100%)',
  goldAccent:    '#C4A058',
  goldDim:       'rgba(196,160,88,.18)',
  rowAlt:        'rgba(60,122,170,.05)',
  tabActive:     '#C4A058',
  tabInactive:   '#2C4050',
}
const D11LIGHT = {
  bg:            '#FAF7F0',
  cardBase:      '#FFFFFF',
  cardDeep:      '#F3EDE2',
  cardHover:     '#EDE5D8',
  textPrimary:   '#1C1410',
  textSecondary: '#7A6040',
  textDim:       '#B0A080',
  accent:        '#8A6028',
  accentDim:     'rgba(138,96,40,.12)',
  separator:     'rgba(138,96,40,.14)',
  separatorSoft: 'rgba(138,96,40,.08)',
  companionBg:   '#F3EDE2',
  glow:          'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(196,160,88,.18) 0%, transparent 65%)',
  mysticalGlow:  'radial-gradient(circle 400px at 15% 40%, rgba(196,160,88,.10) 0%, transparent 70%)',
  goldFoil:      'linear-gradient(90deg, #A07A40 0%, #D8C490 50%, #B89060 100%)',
  goldAccent:    '#8A6028',
  goldDim:       'rgba(138,96,40,.12)',
  rowAlt:        'rgba(138,96,40,.04)',
  tabActive:     '#8A6028',
  tabInactive:   '#B0A080',
}

function D11Scholar() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]     = useState('Mysteries')
  const [libExpanded, setLibExpanded] = useState(false)
  const [hoveredBook, setHoveredBook] = useState(null)
  const [hoveredTab, setHoveredTab]   = useState(null)
  const SERIF = "'Playfair Display', Georgia, serif"
  const MONO  = "'JetBrains Mono', 'Fira Mono', monospace"
  const M = mode === 'dark' ? D11DARK : D11LIGHT
  const SL = { fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: M.textDim, marginBottom: 14 }

  const visibleBooks = libExpanded ? LIBRARY : LIBRARY.filter(b => b.status === 'reading')

  const tabContent = () => {
    switch (activeTab) {
      case 'Progress': return (
        <div key="prog" className="view-enter">
          <p style={SL}>Chapter log</p>
          {CHAPTERS_DEMO.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${M.separatorSoft}`, opacity: ch.completed ? 1 : 0.45 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: M.textDim, minWidth: 24 }}>{ch.num}</span>
              <span style={{ fontSize: 11, color: ch.completed ? M.goldAccent : M.textDim }}>{ch.completed ? '✓' : '·'}</span>
              <span style={{ flex: 1, fontSize: 14, fontFamily: SERIF, color: ch.singularity ? M.textPrimary : M.textSecondary }}>
                {ch.title}{ch.singularity && <span style={{ color: M.goldAccent, marginLeft: 6, fontSize: 10 }}>✦</span>}
              </span>
              {ch.notesCount > 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: M.goldAccent, background: M.goldDim, padding: '1px 6px', borderRadius: 3 }}>{ch.notesCount}</span>}
            </div>
          ))}
        </div>
      )
      case 'Characters': return (
        <div key="chars" className="view-enter">
          <p style={SL}>Cast</p>
          {CHARACTERS.map((ch, i) => (
            <div key={i} style={{ padding: '14px 0', borderBottom: `1px solid ${M.separatorSoft}` }}>
              <p style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: M.textPrimary, marginBottom: 2 }}>{ch.name}</p>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: M.textDim, marginBottom: 6 }}>{ch.role}</p>
              <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.6 }}>{ch.description}</p>
            </div>
          ))}
        </div>
      )
      case 'Notes': return (
        <div key="notes" className="view-enter">
          <p style={SL}>Field notes</p>
          {NOTES.map((n, i) => (
            <div key={i} style={{ marginBottom: 22, paddingBottom: 22, borderBottom: `1px solid ${M.separatorSoft}` }}>
              <p style={{ fontSize: 14, fontFamily: SERIF, color: M.textSecondary, lineHeight: 1.7, marginBottom: 6 }}>{n.text}</p>
              <p style={{ fontFamily: MONO, fontSize: 10, color: M.textDim }}>{n.days}d · {n.tag}</p>
            </div>
          ))}
        </div>
      )
      case 'Mysteries': return (
        <div key="myst" className="view-enter">
          <p style={SL}>Open questions</p>
          {MYSTERIES.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: `1px solid ${M.separatorSoft}` }}>
              <span style={{ color: m.haunt === 'haunted' ? M.goldAccent : M.textDim, fontSize: 11, marginTop: 3, flexShrink: 0 }}>✦</span>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: m.haunt === 'dormant' ? M.textSecondary : M.textPrimary, lineHeight: 1.6, opacity: m.haunt === 'dormant' ? 0.55 : 1 }}>{m.text}</p>
            </div>
          ))}
        </div>
      )
      case 'Discussion': return (
        <div key="disc" className="view-enter">
          <p style={SL}>Discussion</p>
          {DISCUSSION.map((q, i) => (
            <div key={i} style={{ marginBottom: 14, padding: '14px 16px', background: M.cardBase, border: `1px solid ${M.separator}`, borderRadius: 10 }}>
              <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.65 }}>{q}</p>
            </div>
          ))}
        </div>
      )
      default: return null
    }
  }

  return (
    <div style={{ background: M.bg, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* D3-style atmospheric glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: M.glow }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: M.mysticalGlow }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ padding: '52px 40px 0', maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.11em', textTransform: 'uppercase', color: M.textDim, marginBottom: 6 }}>Direction 11</p>
          <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: M.textPrimary, lineHeight: 1.2, marginBottom: 10 }}>Scholar's Study</h2>
          <p style={{ fontSize: 13, color: M.textSecondary, lineHeight: 1.65, maxWidth: 520 }}>
            A reading room with memory. Entries are logged, chapters are marked, open questions stay open. The companion holds the thread.
          </p>
          {/* Gold foil accent rule — D3 style */}
          <div style={{ height: 1, marginTop: 28, background: M.goldFoil, opacity: 0.45, borderRadius: 1 }} />
        </div>

        {/* Library — D7-style ledger rows */}
        <div style={{ maxWidth: 900, margin: '44px auto 0', padding: '0 40px' }}>
          <p style={SL}>Library</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 8 }}>
            {visibleBooks.map((b, i) => {
              const li = LIBRARY.indexOf(b)
              const isH = hoveredBook === li
              return (
                <div key={i}
                  onMouseEnter={() => setHoveredBook(li)}
                  onMouseLeave={() => setHoveredBook(null)}
                  style={{
                    display: 'flex', gap: 14, alignItems: 'center',
                    padding: '11px 14px',
                    borderBottom: `1px solid ${M.separator}`,
                    background: isH ? M.cardHover : (i % 2 === 0 ? 'transparent' : M.rowAlt),
                    opacity: b.depth === 'dormant' ? 0.45 : 1,
                    transition: 'background .15s', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 9, color: M.textDim, minWidth: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                  <BookCover index={li} w={30} h={42} radius={2} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: SERIF, fontSize: 14, fontWeight: b.depth === 'deep' ? 600 : 400, color: M.textPrimary }}>{b.title}</p>
                    <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: M.textDim }}>{b.author}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: b.depth === 'deep' ? M.goldAccent : M.textDim }}>
                      {b.status === 'finished' ? '100%' : b.status === 'paused' ? 'paused' : `${b.progress}%`}
                    </p>
                    {b.depth === 'deep' && (
                      <div style={{ marginTop: 4, width: 48, height: 2, borderRadius: 1, background: M.accentDim }}>
                        <div style={{ height: '100%', width: `${b.progress}%`, borderRadius: 1, background: M.goldAccent, opacity: 0.7 }} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {!libExpanded && (
            <button
              onClick={() => setLibExpanded(true)}
              onMouseEnter={e => e.currentTarget.style.color = M.textPrimary}
              onMouseLeave={e => e.currentTarget.style.color = M.goldAccent}
              style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: M.goldAccent, background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0', transition: 'color .15s' }}
            >
              See full room → ({LIBRARY.length} companions)
            </button>
          )}
        </div>

        {/* Separator */}
        <div style={{ maxWidth: 900, margin: '32px auto 0', padding: '0 40px' }}>
          <div style={{ borderTop: `1px solid ${M.separator}` }} />
        </div>

        {/* Book detail — D9-style full-width, companion embedded */}
        <div style={{ maxWidth: 900, margin: '36px auto 0', padding: '0 40px' }}>

          {/* Active book header */}
          <div style={{ background: M.cardDeep, border: `1px solid ${M.separator}`, borderRadius: 16, padding: '24px 24px 0', marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
              <BookCover index={0} w={72} h={100} radius={6} style={{ boxShadow: '0 4px 20px rgba(0,0,0,.4)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, marginBottom: 8 }}>Now reading</p>
                <h1 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, color: M.textPrimary, lineHeight: 1.15, marginBottom: 5, letterSpacing: '-0.01em' }}>The Master and Margarita</h1>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: M.textSecondary, marginBottom: 10 }}>Mikhail Bulgakov</p>
                <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                  {[['Chapter', '19 / 32'], ['Days', '54'], ['Notes', '23'], ['Open', '3']].map(([l, v]) => (
                    <div key={l}>
                      <p style={{ fontFamily: MONO, fontSize: 8, color: M.textDim, letterSpacing: '0.08em', marginBottom: 2 }}>{l.toUpperCase()}</p>
                      <p style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: M.textPrimary }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div style={{ height: 3, borderRadius: 2, background: M.accentDim, width: 220 }}>
                  <div style={{ height: '100%', width: '59%', borderRadius: 2, background: M.goldFoil }} />
                </div>
              </div>

              {/* Companion — embedded to the right of book info */}
              <div style={{ width: 260, background: M.companionBg, border: `1px solid ${M.separator}`, borderRadius: 12, padding: '18px 18px', flexShrink: 0, alignSelf: 'stretch' }}>
                <p style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, marginBottom: 12 }}>Companion</p>
                <p style={{ fontFamily: SERIF, fontSize: 13, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.7, opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease', marginBottom: 12 }}>{c.text}</p>
                {c.typing
                  ? <p style={{ fontFamily: MONO, fontSize: 9, color: M.textDim, marginBottom: 10 }}>thinking…</p>
                  : <button onClick={c.next} style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: M.goldAccent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12, transition: 'opacity .15s' }}>Next thought</button>
                }
                <div style={{ borderTop: `1px solid ${M.separatorSoft}`, paddingTop: 10 }}>
                  <input value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
                    placeholder="Speak to the companion…"
                    style={{ width: '100%', border: 'none', borderBottom: `1px solid ${M.separator}`, background: 'transparent', fontSize: 11, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, outline: 'none', padding: '5px 0', boxSizing: 'border-box', marginBottom: 8 }}
                  />
                  <button onClick={() => c.ask(c.input)} style={{ fontFamily: MONO, fontSize: 9, color: M.goldAccent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.06em' }}>↵ send</button>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 20, borderTop: `1px solid ${M.separator}`, paddingTop: 0 }}>
              {TABS.map(t => (
                <button key={t}
                  onMouseEnter={() => setHoveredTab(t)}
                  onMouseLeave={() => setHoveredTab(null)}
                  onClick={() => setActiveTab(t)}
                  style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0',
                    color: activeTab === t ? M.tabActive : hoveredTab === t ? M.textSecondary : M.tabInactive,
                    borderBottom: `2px solid ${activeTab === t ? M.tabActive : 'transparent'}`,
                    transition: 'color .12s, border-color .12s' }}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* Tab content — full width below */}
          <div style={{ padding: '24px 24px', background: M.cardBase, border: `1px solid ${M.separator}`, borderTop: 'none', borderRadius: '0 0 16px 16px', marginBottom: 0 }}>
            {tabContent()}
          </div>
        </div>

        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   DIRECTION 12 — Scholar's Study II
   D3's spatial card library + D3's open side-companion layout
   Fixed: warm cream text in dark (not cold blue); warm cognac light mode
   New: wider companion, gold foil border, hover-alive effect
══════════════════════════════════════════════════════════════════════════════ */

const D12DARK = {
  bg:            '#0A1A1E',
  cardBase:      '#101E26',
  cardDeep:      '#162836',
  cardHover:     '#1C3040',
  cardArchival:  '#0C1820',
  textPrimary:   '#D8CCBA',
  textSecondary: '#A89E8E',   // warm off-white — readable, slightly receded
  textDim:       '#5C7080',   // was nearly invisible — now legible
  accent:        '#3C7AAA',
  accentDim:     'rgba(60,122,170,.18)',
  separator:     'rgba(60,122,170,.16)',
  separatorSoft: 'rgba(60,122,170,.10)',
  companionBg:   '#090F14',   // halfway between old and new — present but shadowed
  companionHoverBg: '#0F1E2C',
  glow:          'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(40,110,160,.16) 0%, transparent 65%)',
  mysticalGlow:  'radial-gradient(circle 400px at 15% 40%, rgba(30,90,130,.08) 0%, transparent 70%)',
  goldFoil:      'linear-gradient(135deg, #7A5A28 0%, #C4A058 40%, #F0D898 60%, #8A6830 100%)',
  goldAccent:    '#C4A058',
  goldDim:       'rgba(196,160,88,.22)',
  goldGlow:      '0 0 32px rgba(196,160,88,.18), 0 4px 28px rgba(0,0,0,.60)',
  goldGlowHover: '0 0 52px rgba(196,160,88,.38), 0 8px 44px rgba(0,0,0,.70)',
}
const D12LIGHT = {
  bg:            '#FAF6EE',
  cardBase:      '#FFFFFF',
  cardDeep:      '#F3EDE2',
  cardHover:     '#EDE5D8',
  cardArchival:  '#F7F1E6',
  textPrimary:   '#1C1410',
  textSecondary: '#5C4828',   // richer cognac — legible
  textDim:       '#9A8868',   // was too faded
  accent:        '#8A6028',
  accentDim:     'rgba(138,96,40,.12)',
  separator:     'rgba(138,96,40,.14)',
  separatorSoft: 'rgba(138,96,40,.08)',
  companionBg:   '#EDE3D0',   // slightly deeper warm parchment
  companionHoverBg: '#E5D8C0',
  glow:          'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(196,160,88,.18) 0%, transparent 65%)',
  mysticalGlow:  'radial-gradient(circle 400px at 15% 40%, rgba(196,160,88,.10) 0%, transparent 70%)',
  goldFoil:      'linear-gradient(135deg, #A07A40 0%, #D8C490 40%, #F0E4B8 60%, #B89060 100%)',
  goldAccent:    '#8A6028',
  goldDim:       'rgba(138,96,40,.18)',
  goldGlow:      '0 0 20px rgba(138,96,40,.14), 0 4px 20px rgba(0,0,0,.10)',
  goldGlowHover: '0 0 36px rgba(138,96,40,.28), 0 8px 32px rgba(0,0,0,.16)',
}

function D12Scholar() {
  const c = useCompanion()
  const { mode } = useDirectionMode()
  const [activeTab, setActiveTab]       = useState('Mysteries')
  const [libExpanded, setLibExpanded]   = useState(false)
  const [hoveredBook, setHoveredBook]   = useState(null)
  const [hoveredTab, setHoveredTab]     = useState(null)
  const [companionHovered, setCompanionHovered] = useState(false)
  const SERIF = "'Playfair Display', Georgia, serif"
  const M = mode === 'dark' ? D12DARK : D12LIGHT
  const D12SL = { fontSize: 12, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textSecondary, marginBottom: 20 }

  const readingBooks  = LIBRARY.filter(b => b.status === 'reading')
  const dormantBooks  = LIBRARY.filter(b => b.status === 'paused')
  const finishedBooks = LIBRARY.filter(b => b.status === 'finished')

  const tabContent = () => {
    switch (activeTab) {
      case 'Progress': return (
        <div key="prog" className="view-enter">
          <p style={D12SL}>Progress</p>
          <p style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 600, color: M.textPrimary, letterSpacing: '-0.02em', marginBottom: 2 }}>Chapter 19</p>
          <p style={{ fontSize: 16, color: M.textSecondary, marginBottom: 24 }}>of 32 · 59% complete · 54 days</p>
          {CHAPTERS_DEMO.map((ch, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${M.separatorSoft}`, opacity: ch.completed ? 1 : 0.55 }}>
              <span style={{ fontSize: 13, color: M.textDim, minWidth: 24 }}>{ch.num}</span>
              <span style={{ fontSize: 14, color: ch.completed ? M.goldAccent : M.textDim }}>{ch.completed ? '✓' : '·'}</span>
              <span style={{ flex: 1, fontSize: 16, fontFamily: SERIF, color: ch.singularity ? M.textPrimary : M.textSecondary }}>
                {ch.title}{ch.singularity && <span style={{ color: M.goldAccent, marginLeft: 6, fontSize: 13 }}>✦</span>}
              </span>
              {ch.notesCount > 0 && <span style={{ fontSize: 12, color: M.goldAccent, background: M.goldDim, padding: '2px 7px', borderRadius: 3 }}>{ch.notesCount}</span>}
            </div>
          ))}
        </div>
      )
      case 'Characters': return (
        <div key="chars" className="view-enter">
          <p style={D12SL}>Characters</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CHARACTERS.map((ch, i) => (
              <div key={i} style={{ background: M.cardBase, border: `1px solid ${M.separator}`, borderRadius: 10, padding: '16px 18px' }}>
                <p style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: M.textPrimary, marginBottom: 3 }}>{ch.name}</p>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: M.textSecondary, marginBottom: 10 }}>{ch.role}</p>
                <p style={{ fontSize: 15, color: M.textSecondary, lineHeight: 1.6 }}>{ch.description}</p>
              </div>
            ))}
          </div>
        </div>
      )
      case 'Notes': return (
        <div key="notes" className="view-enter">
          <p style={D12SL}>Your notes</p>
          {NOTES.map((n, i) => (
            <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${M.separatorSoft}` }}>
              <p style={{ fontSize: 16, color: M.textSecondary, lineHeight: 1.7, marginBottom: 8, fontFamily: SERIF }}>{n.text}</p>
              <p style={{ fontSize: 13, color: M.textDim }}>{n.days}d ago · {n.tag}</p>
            </div>
          ))}
        </div>
      )
      case 'Mysteries': return (
        <div key="myst" className="view-enter">
          <p style={D12SL}>Still unresolved</p>
          {MYSTERIES.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 0', borderBottom: `1px solid ${M.separatorSoft}` }}>
              <span style={{ color: m.haunt === 'haunted' ? M.goldAccent : M.textDim, fontSize: 13, marginTop: 3, flexShrink: 0 }}>✦</span>
              <p style={{ fontSize: 15, fontFamily: SERIF, fontStyle: 'italic', color: m.haunt === 'dormant' ? M.textSecondary : M.textPrimary, lineHeight: 1.6, opacity: m.haunt === 'dormant' ? 0.55 : 1 }}>{m.text}</p>
            </div>
          ))}
        </div>
      )
      case 'Discussion': return (
        <div key="disc" className="view-enter">
          <p style={D12SL}>Discussion</p>
          {DISCUSSION.map((q, i) => (
            <div key={i} style={{ marginBottom: 18, padding: '16px 18px', background: M.cardBase, border: `1px solid ${M.separator}`, borderRadius: 10 }}>
              <p style={{ fontSize: 15, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.65 }}>{q}</p>
            </div>
          ))}
        </div>
      )
      default: return null
    }
  }

  return (
    <div style={{ background: M.bg, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* D3-style atmospheric glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: M.glow }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: M.mysticalGlow }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Gold rule — nav/body divider */}
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ height: 1, background: M.goldFoil, opacity: 0.45, borderRadius: 1 }} />
        </div>

        {/* Library — D3-style card grid */}
        <div style={{ padding: '40px 40px 0', maxWidth: 1000, margin: '0 auto' }}>

          {/* Zone: Reading Now */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, whiteSpace: 'nowrap' }}>Reading Now</p>
            <div style={{ flex: 1, borderTop: `1px solid ${M.separator}` }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 32 }}>
            {readingBooks.map((b, i) => {
              const li = LIBRARY.indexOf(b)
              const isH = hoveredBook === li
              return (
                <div key={i}
                  onMouseEnter={() => setHoveredBook(li)}
                  onMouseLeave={() => setHoveredBook(null)}
                  style={{
                    background: isH ? M.cardHover : M.cardDeep,
                    border: `1px solid ${isH ? M.goldDim : M.separator}`,
                    borderRadius: 14, padding: '20px',
                    boxShadow: isH ? `0 8px 32px ${M.goldDim}` : '0 4px 16px rgba(0,0,0,.18)',
                    transform: isH ? 'translateY(-2px)' : 'none',
                    transition: 'all .22s ease', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <BookCover index={li} w={52} h={72} radius={5} style={{ boxShadow: '0 2px 10px rgba(0,0,0,.4)' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: M.textPrimary, lineHeight: 1.3, marginBottom: 5 }}>{b.title}</p>
                      <p style={{ fontSize: 13, fontStyle: 'italic', fontFamily: SERIF, color: M.textSecondary, marginBottom: 12 }}>{b.author}</p>
                      <div style={{ height: 2, borderRadius: 1, background: M.accentDim }}>
                        <div style={{ height: '100%', width: `${b.progress}%`, background: M.goldFoil, borderRadius: 1 }} />
                      </div>
                      <p style={{ fontSize: 12, color: M.textSecondary, marginTop: 7 }}>{b.progress}% · {b.notes} notes</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {!libExpanded && (
            <button
              onClick={() => setLibExpanded(true)}
              onMouseEnter={e => e.currentTarget.style.color = M.textPrimary}
              onMouseLeave={e => e.currentTarget.style.color = M.goldAccent}
              style={{ fontSize: 14, color: M.goldAccent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 40, transition: 'color .15s', fontFamily: SERIF, fontStyle: 'italic' }}
            >
              See the full room → ({LIBRARY.length} companions)
            </button>
          )}

          {libExpanded && (
            <>
              {dormantBooks.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, whiteSpace: 'nowrap' }}>Set Aside</p>
                    <div style={{ flex: 1, borderTop: `1px solid ${M.separatorSoft}` }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, opacity: 0.6 }}>
                    {dormantBooks.map((b, i) => {
                      const li = LIBRARY.indexOf(b)
                      return (
                        <div key={i} style={{ background: M.cardBase, border: `1px solid ${M.separatorSoft}`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
                          <BookCover index={li} w={36} h={50} radius={3} />
                          <div>
                            <p style={{ fontFamily: SERIF, fontSize: 16, color: M.textSecondary, marginBottom: 3 }}>{b.title}</p>
                            <p style={{ fontSize: 13, fontStyle: 'italic', color: M.textDim, fontFamily: SERIF }}>{b.author} · {b.progress}%</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              {finishedBooks.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: M.textDim, whiteSpace: 'nowrap' }}>Complete</p>
                    <div style={{ flex: 1, borderTop: `1px solid ${M.separatorSoft}` }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40, opacity: 0.45 }}>
                    {finishedBooks.map((b, i) => {
                      const li = LIBRARY.indexOf(b)
                      return (
                        <div key={i} style={{ background: M.cardArchival, border: `1px solid ${M.separatorSoft}`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
                          <BookCover index={li} w={30} h={42} radius={3} />
                          <div>
                            <p style={{ fontFamily: SERIF, fontSize: 15, color: M.textSecondary, marginBottom: 2 }}>{b.title}</p>
                            <p style={{ fontSize: 12, fontStyle: 'italic', color: M.textDim, fontFamily: SERIF }}>{b.author}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Separator */}
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ borderTop: `1px solid ${M.separator}` }} />
        </div>

        {/* Book detail — D3 open layout, wider companion with gold foil border */}
        <div style={{ maxWidth: 1000, margin: '40px auto 0', padding: '0 40px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 48 }}>
          {/* Main */}
          <div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
              <BookCover index={0} w={72} h={100} radius={6} style={{ boxShadow: '0 4px 24px rgba(0,0,0,.5)' }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: M.textDim, marginBottom: 10 }}>Now reading</p>
                <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: M.textPrimary, lineHeight: 1.1, marginBottom: 5, letterSpacing: '-0.02em' }}>The Master<br />and Margarita</h1>
                <p style={{ fontSize: 15, fontStyle: 'italic', fontFamily: SERIF, color: M.textSecondary, marginBottom: 10 }}>Mikhail Bulgakov</p>
                <p style={{ fontSize: 14, color: M.textSecondary }}>Chapter 19 of 32 · 54 days · 23 notes</p>
                <div style={{ position: 'relative', height: 3, borderRadius: 2, background: M.accentDim, marginTop: 12, width: 200 }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '59%', borderRadius: 2, background: M.goldFoil }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20, borderBottom: `1px solid ${M.separator}`, marginBottom: 24 }}>
              {TABS.map(t => (
                <button key={t}
                  onMouseEnter={() => setHoveredTab(t)}
                  onMouseLeave={() => setHoveredTab(null)}
                  onClick={() => setActiveTab(t)}
                  style={{
                    fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px',
                    color: activeTab === t ? M.goldAccent : hoveredTab === t ? M.textSecondary : M.textDim,
                    borderBottom: `2px solid ${activeTab === t ? M.goldAccent : 'transparent'}`,
                    transition: 'color .12s, border-color .12s',
                  }}
                >{t}</button>
              ))}
            </div>
            {tabContent()}
          </div>

          {/* Companion — gold foil border, hover-alive */}
          <div
            onMouseEnter={() => setCompanionHovered(true)}
            onMouseLeave={() => setCompanionHovered(false)}
            style={{
              background: M.goldFoil,
              padding: 1.5,
              borderRadius: 20,
              boxShadow: companionHovered ? M.goldGlowHover : M.goldGlow,
              transform: companionHovered ? 'translateY(-3px)' : 'none',
              transition: 'all .28s ease',
              alignSelf: 'flex-start',
              position: 'sticky',
              top: 24,
            }}
          >
            <div style={{
              background: companionHovered ? M.companionHoverBg : M.companionBg,
              borderRadius: 18.5,
              padding: '24px 22px',
              transition: 'background .28s ease',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: companionHovered ? M.goldAccent : M.textDim, marginBottom: 18, transition: 'color .28s ease' }}>Companion</p>

              {/* Current thought */}
              <p style={{ fontFamily: SERIF, fontSize: 17, fontStyle: 'italic', color: companionHovered ? M.textPrimary : M.textSecondary, lineHeight: 1.75, opacity: c.fading ? 0 : 1, transition: 'opacity .48s ease, color .28s ease', marginBottom: 18 }}>
                {c.text}
              </p>

              {/* Open questions — 3 mystery hints */}
              <div style={{ borderTop: `1px solid ${companionHovered ? M.separator : M.separatorSoft}`, paddingTop: 14, marginBottom: 16, transition: 'border-color .28s ease' }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: M.textDim, marginBottom: 10 }}>Open Questions</p>
                {MYSTERIES.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: m.haunt === 'haunted' ? M.goldAccent : M.textDim, fontSize: 11, marginTop: 3, flexShrink: 0 }}>✦</span>
                    <p style={{ fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: M.textSecondary, lineHeight: 1.5, opacity: m.haunt === 'dormant' ? 0.5 : 1 }}>{m.text}</p>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div style={{ borderTop: `1px solid ${companionHovered ? M.separator : M.separatorSoft}`, paddingTop: 16, transition: 'border-color .28s ease' }}>
                {c.typing
                  ? <p style={{ fontSize: 13, color: M.textDim, fontStyle: 'italic', marginBottom: 12 }}>thinking…</p>
                  : <button
                      onMouseEnter={e => e.currentTarget.style.color = M.textPrimary}
                      onMouseLeave={e => e.currentTarget.style.color = M.goldAccent}
                      onClick={c.next}
                      style={{ fontSize: 13, color: M.goldAccent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontStyle: 'italic', fontFamily: SERIF, transition: 'color .15s', marginBottom: 14, display: 'block' }}
                    >Next thought</button>
                }
                <input
                  value={c.input} onChange={e => c.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && c.ask(c.input)}
                  placeholder="Speak to the companion…"
                  style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: `1px solid ${M.separator}`, background: 'transparent', fontSize: 14, color: M.textSecondary, fontFamily: SERIF, fontStyle: 'italic', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => c.ask(c.input)} style={{ fontSize: 13, color: M.goldAccent, background: 'none', border: 'none', cursor: 'pointer' }}>↵</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */

const DIRECTION_COMPONENTS = { 1: D1Editorial, 2: D2Archival, 3: D3Spatial, 4: D4Margins, 5: D5Territory, 6: D6Typographic, 7: D7Ledger, 8: D8Greenhouse, 9: D9Codex, 10: D10Gallery, 11: D11Scholar, 12: D12Scholar }

export default function DirectionsDemoPage() {
  const { activeDirection } = useDirectionMode()
  const DirectionComponent = DIRECTION_COMPONENTS[activeDirection] ?? D1Editorial
  return <DirectionComponent key={activeDirection} />
}
