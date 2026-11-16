/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark, Lockup, Cover } from '../brand.jsx'
import './beacon.css'

// E · Beacon — a navigator's chart with Lantern as the light. Each book is a
// light on the chart with its own characteristic; progress is the lit sector
// of a compass rose; water you haven't sailed is marked unsurveyed.

export const meta = {
  id: 'beacon', name: 'Beacon', defaultMode: 'light',
  tagline: 'A navigator’s chart, with Lantern as the light',
  signature: 'Lit compass sectors and light-list labels for every book',
  research: 'Specimen’s labels rewritten as a light list: the coded entries sailors use to identify lighthouses. The lockup goes back to Libre Baskerville from the current logo. Progress is the lit sector of a compass rose, and the beam turns while narration plays.',
}

const lightCode = (b) => b.status === 'finished' ? 'F. W.' : b.status === 'next' ? 'Unlit' : `Fl.(${b.chapter}) ${b.status === 'listening' ? 'Y' : 'W'}`

function Rose({ value, size = 240, beam = false, unsurveyed = true }) {
  const a = (value / 100) * 360
  const pt = (deg, r) => [120 + r * Math.sin((deg * Math.PI) / 180), 120 - r * Math.cos((deg * Math.PI) / 180)]
  const sector = (from, to, r) => { const [x1, y1] = pt(from, r); const [x2, y2] = pt(to, r); return `M120 120 L${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2} Z` }
  return (
    <svg className={`bc-rose${beam ? ' is-beam' : ''}`} viewBox="0 0 240 240" width={size} height={size} aria-hidden="true">
      {unsurveyed && <path d={sector(Math.max(a, 1), 359.9, 104)} className="bc-rose-unsurveyed" />}
      <path d={sector(0, Math.max(a, 0.5), 104)} className="bc-rose-lit" />
      <circle cx="120" cy="120" r="104" className="bc-rose-ring" />
      <circle cx="120" cy="120" r="92" className="bc-rose-ring bc-rose-ring--in" />
      {Array.from({ length: 36 }, (_, i) => { const [x1, y1] = pt(i * 10, i % 9 === 0 ? 84 : 96); const [x2, y2] = pt(i * 10, 104); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="bc-rose-tick" /> })}
      {['N', 'E', 'S', 'W'].map((c, i) => { const [x, y] = pt(i * 90, 72); return <text key={c} x={x} y={y + 4} className="bc-rose-cardinal">{c}</text> })}
      <path d="M120 40 L126 120 L120 200 L114 120 Z" className="bc-rose-needle" />
      <g className="bc-beam" style={{ transformOrigin: '120px 120px' }}><path d={sector(-8, 8, 118)} className="bc-beam-wedge" /></g>
    </svg>
  )
}

function Top({ left, right, center }) {
  return <header className="bc-top"><div>{left}</div><div className="bc-top-c">{center}</div><div className="bc-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const pct = b.id === 'pp' ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="bc">
      <Top left={<Lockup kind="beacon" size={19} />} right={<><button className="bc-ic" aria-label="Search"><Icon name="search" /></button><button className="bc-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />

      <section className="bc-chart">
        <div className="bc-chart-head">
          <span className="bc-mono">Chart 1 · your waters</span>
          <span className="bc-mono">{b.id === 'pp' ? 'Ch. 01' : b.chapter ? `Ch. ${pad2(b.chapter)}` : '—'}</span>
        </div>
        <div className="bc-chart-body">
          <div className="bc-chart-rose">
            <Rose value={pct} size={168} />
            <span className="bc-chart-mark"><FlameMark size={34} live /></span>
          </div>
          <div className="bc-chart-text">
            <h1 className="bc-h2">{b.title}</h1>
            <p className="bc-sub">{b.author}</p>
            <p className="bc-light">{lightCode(b)}</p>
            <p className="bc-mono bc-dim">{Math.round(pct)}% {b.id === 'pp' ? 'of chapter' : 'of book'}</p>
          </div>
        </div>
        <div className="bc-soundings" aria-hidden="true">{[7, 12, 9, 15, 21, 18, 26].map((d, i) => <span key={i}>{d}</span>)}<em>Unsurveyed</em></div>
        <div className="bc-actions">
          <button className="bc-btn bc-btn--lit" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
          <button className="bc-btn" onClick={() => ctx.go('companion')}>Log</button>
        </div>
      </section>

      <div className="bc-section"><span className="bc-caps">Light list</span><span className="bc-mono bc-dim">{pad2(BOOKS.length)} lights</span></div>
      <ol className="bc-list">
        {BOOKS.map((x, i) => (
          <li key={x.id}>
            <button className={`bc-row${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
              <span className="bc-mono bc-row-no">{pad2(i + 1)}</span>
              <span className="bc-row-text"><span className="bc-row-title">{x.title}</span><span className="bc-row-meta">{x.author}</span></span>
              <span className="bc-row-light"><span className={`bc-dot bc-dot--${x.status}`} />{lightCode(x)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Companion({ ctx }) {
  const pp = BOOKS[0]
  return (
    <div className="bc">
      <Top left={<button className="bc-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="bc-mono bc-dim">Ship’s log</span>} right={<button className="bc-ic" aria-label="More"><Icon name="more" /></button>} />
      <section className="bc-bookhead">
        <Cover book={pp} size="md" />
        <div>
          <h1 className="bc-h2">{pp.title}</h1>
          <p className="bc-sub">{pp.author}, 1813</p>
          <span className="bc-flag">Unsurveyed beyond Ch. 01</span>
        </div>
      </section>
      <nav className="bc-tabs" aria-label="Sections">
        {['Log', 'People', 'Plot', 'Questions', 'Discussion'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
      </nav>
      <article className="bc-card">
        <span className="bc-mono bc-dim">Bearing · Chapter 1</span>
        <p className="bc-quote">{REFLECTION}</p>
      </article>
      <div className="bc-log" aria-label="Conversation">
        {CHAT.map((m, i) => (
          <div key={i} className={`bc-entry bc-entry--${m.who}`}>
            <span className="bc-mono bc-entry-who">{m.who === 'reader' ? '22:14 · You' : <><FlameMark size={12} /> 22:14 · Lantern</>}</span>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <form className="bc-compose" onSubmit={e => e.preventDefault()}>
        <input placeholder="Add to the log…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
      <p className="bc-mono bc-dim bc-fine">Lantern only charts water you’ve already sailed.</p>
      <div className="bc-section"><span className="bc-caps">Your notes</span><span className="bc-mono bc-dim">{pad2(NOTES.length)}</span></div>
      {NOTES.map((n, i) => <div key={i} className="bc-note"><span className="bc-mono bc-note-tag">{n.tag}</span><p>{n.text}</p></div>)}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="bc bc--reader">
      <Top left={<button className="bc-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="bc-mono bc-dim">Pride and Prejudice</span>}
        right={<><button className="bc-ic bc-aa" aria-label="Text settings">Aa</button><button className="bc-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="bc-chap"><span className="bc-caps">Chapter</span><span className="bc-chap-num">I</span></header>
      <article className="bc-prose">
        {PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}
      </article>
      <footer className="bc-foot">
        <span className="bc-foot-rose"><Rose value={pct} size={34} unsurveyed={false} /></span>
        <span className="bc-mono">Ch. 01 · {fmt(CHAPTER_SEC - ctx.t)} left</span>
        <span className="bc-mono bc-lit">{Math.round((pct / 100) * 360)}°</span>
      </footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="bc bc--listen">
      <Top left={<button className="bc-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="bc-mono bc-dim">Light in use</span>} right={<button className="bc-ic" aria-label="More"><Icon name="more" /></button>} />
      <div className={`bc-lamp${ctx.playing ? ' is-on' : ''}`}>
        <Rose value={pct} size={280} beam={ctx.playing} />
        <span className="bc-lamp-mark"><FlameMark size={64} live={ctx.playing} /></span>
      </div>
      <p className="bc-light bc-center">Fl.(1) Y · Chapter I</p>
      <h1 className="bc-h1 bc-center">Pride and Prejudice</h1>
      <p className="bc-sub bc-center">read aloud by Aiden</p>
      <div className="bc-scrub">
        <span className="bc-scrub-fill" style={{ width: `${pct}%` }} />
        <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
      </div>
      <div className="bc-times"><span className="bc-mono">{fmt(ctx.t)}</span><span className="bc-mono bc-dim">−{fmt(CHAPTER_SEC - ctx.t)}</span></div>
      <div className="bc-transport">
        <button className="bc-skip" aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}><Icon name="rew" size={22} /></button>
        <button className="bc-play" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={30} /></button>
        <button className="bc-skip" aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}><Icon name="fwd" size={22} /></button>
      </div>
      <dl className="bc-table">
        <div><dt>Speed</dt><dd>1.0×</dd></div><div><dt>Voice</dt><dd>Aiden</dd></div><div><dt>Sleep</dt><dd>Ch. end</dd></div>
      </dl>
      <section className="bc-card bc-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <div className="bc-section"><span className="bc-caps">Weather</span></div>
      <div className="bc-chips">{AMBIENT.map((x, i) => <button key={x} className={i === 2 ? 'is-on' : ''}>{x}</button>)}</div>
      <p className="bc-mono bc-dim bc-fine">Your companion stays at Ch. 01 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="bc bc--preview">
      <Lockup kind="beacon" size={22} />
      <div className="bc-chart-rose"><Rose value={64} size={130} /><span className="bc-chart-mark"><FlameMark size={28} /></span></div>
    </div>
  )
}
