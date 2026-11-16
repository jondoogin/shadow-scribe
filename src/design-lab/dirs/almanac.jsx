/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, Logo, Moon, CHAPTER_SEC, fmt, lineFor } from '../shared.jsx'
import './almanac.css'

// 4 · Almanac — reading as a night sky. Progress is a moon phase, your week
// is a tide chart, and big numerals carry the data.

export const meta = {
  id: 'almanac', name: 'Almanac', defaultMode: 'dark',
  tagline: 'Reading measured like the night sky',
  signature: 'Your progress as a moon phase, your week as a tide chart',
  research: 'Built on the 2026 Apple Design Award winners Tide Guide (data as the hero, palette from the sky) and Moonlitt (moon phases), plus oversized type as the main visual.',
}

const phaseName = (p) => p <= 0.02 ? 'New' : p < 0.25 ? 'Waxing crescent' : p < 0.48 ? 'First quarter' : p < 0.98 ? 'Waxing gibbous' : 'Full'
const WEEK = [12, 26, 8, 34, 19, 41, 23]
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function Tide() {
  const max = 45, w = 300, h = 90
  const pts = WEEK.map((v, i) => [i * (w / 6), h - (v / max) * h])
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`
  }
  return (
    <figure className="al-tide">
      <svg viewBox={`0 -6 ${w} ${h + 12}`} preserveAspectRatio="none" role="img" aria-label="Minutes read or listened each day this week">
        <defs><linearGradient id="al-tide-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--tide)" stopOpacity=".55" /><stop offset="1" stopColor="var(--tide)" stopOpacity="0" /></linearGradient></defs>
        <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="url(#al-tide-g)" />
        <path d={d} fill="none" stroke="var(--tide)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="al-tide-days">{DAYS.map((x, i) => <span key={i} className={i === 5 ? 'is-hi' : ''}>{x}</span>)}</div>
      <figcaption>High tide Saturday, 41 min. This week: {WEEK.reduce((a, b) => a + b, 0)} min.</figcaption>
    </figure>
  )
}

function Top({ left, center, right }) {
  return <header className="al-top"><div>{left}</div><div className="al-top-c">{center}</div><div className="al-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const chapP = b.id === 'pp' ? ctx.t / CHAPTER_SEC : (b.bookPct || 0) / 100
  return (
    <div className="al">
      <Top left={<Logo size={19} />} right={<><button className="al-ic" aria-label="Search"><Icon name="search" /></button><button className="al-ic" aria-label="Add"><Icon name="plus" /></button></>} />
      <section className="al-hero">
        <p className="al-label">Tonight · {b.title}</p>
        <button className="al-hero-moon" onClick={() => ctx.go(b.id === 'pp' ? 'listen' : 'companion')} aria-label={`Continue ${b.title}`}>
          <Moon phase={chapP} size={190} />
        </button>
        <div className="al-hero-num"><span className="al-big">{Math.round(chapP * 100)}</span><span className="al-pct">%</span></div>
        <p className="al-hero-cap">{b.id === 'pp' ? `of chapter 1 · ${phaseName(chapP)}` : `of the book · ${phaseName(chapP)}`}</p>
        <button className="al-cta" onClick={() => ctx.go('listen')}><Icon name="play" size={15} /> {b.id === 'pp' ? `Resume · ${b.minutesLeft} min left` : 'Resume'}</button>
      </section>

      <Tide />

      <h2 className="al-h3">The almanac</h2>
      <ul className="al-table">
        {BOOKS.map(x => (
          <li key={x.id}>
            <button className={`al-tr${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
              <Moon phase={(x.bookPct || 0) / 100} size={30} />
              <span className="al-tr-text"><span className="al-tr-title">{x.title}</span><span className="al-tr-sub">{x.author}</span></span>
              <span className="al-tr-num">{x.status === 'next' ? '—' : `${x.bookPct || 1}%`}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Companion({ ctx }) {
  const pp = BOOKS[0]
  return (
    <div className="al">
      <Top left={<button className="al-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="al-label">Observations</span>} right={<button className="al-ic" aria-label="More"><Icon name="more" /></button>} />
      <section className="al-bookhead">
        <Moon phase={0.016} size={64} />
        <div>
          <h1 className="al-h2">{pp.title}</h1>
          <p className="al-sub">{pp.author} · Chapter 1 of 61</p>
        </div>
      </section>
      <div className="al-horizon" role="note">
        <span className="al-horizon-line" />
        <span className="al-horizon-text">Horizon: chapter 1. Nothing past it is mentioned.</span>
      </div>
      <nav className="al-tabs">{['Companion', 'Cast', 'Plot', 'Questions', 'Notes'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}</nav>

      <p className="al-reflect">{REFLECTION}</p>

      <ol className="al-log">
        {CHAT.map((m, i) => (
          <li key={i} className={`al-log-${m.who}`}>
            <span className="al-log-time">{m.who === 'reader' ? '22:14' : '22:14'}</span>
            <div><span className="al-log-who">{m.who === 'reader' ? 'You' : '✦ Lantern'}</span><p>{m.text}</p></div>
          </li>
        ))}
      </ol>
      <form className="al-compose" onSubmit={e => e.preventDefault()}>
        <input placeholder="Log a thought…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>

      <h2 className="al-h3">Notes</h2>
      {NOTES.map((n, i) => <div key={i} className="al-note"><span className="al-label">{n.tag}</span><p>{n.text}</p></div>)}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const p = ctx.t / CHAPTER_SEC
  return (
    <div className="al al--reader">
      <Top left={<button className="al-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="al-mini"><Moon phase={p} size={16} /> {Math.round(p * 100)}%</span>}
        right={<><button className="al-ic al-aa" aria-label="Text settings">Aa</button><button className="al-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="al-chap"><span className="al-chap-num">I</span><span className="al-label">Pride and Prejudice</span></header>
      <article className="al-prose">
        {PASSAGE.map((x, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{x}</p>)}
      </article>
      <footer className="al-foot"><span>Chapter 1</span><span>{fmt(CHAPTER_SEC - ctx.t)} until the chapter sets</span></footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const p = ctx.t / CHAPTER_SEC
  return (
    <div className="al al--listen">
      <Top left={<button className="al-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="al-label">Chapter 1 · Pride and Prejudice</span>} right={<button className="al-ic" aria-label="More"><Icon name="more" /></button>} />
      <div className={`al-orbit${ctx.playing ? ' is-playing' : ''}`}>
        <svg className="al-orbit-ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" fill="none" stroke="var(--rule)" strokeWidth=".6" />
          <circle cx="50" cy="50" r="48" fill="none" stroke="var(--brass)" strokeWidth="1.2" strokeDasharray={`${p * 301.6} 301.6`} transform="rotate(-90 50 50)" strokeLinecap="round" />
        </svg>
        <Moon phase={p} size={230} />
      </div>
      <p className="al-phase">{phaseName(p)}</p>
      <div className="al-clock"><span className="al-big">{fmt(ctx.t)}</span></div>
      <p className="al-hero-cap">of {fmt(CHAPTER_SEC)} · read by Aiden</p>
      <input className="al-range" type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))}
        aria-label="Position" style={{ '--p': `${p * 100}%` }} />

      <div className="al-transport">
        <button className="al-ic" aria-label="Previous chapter"><Icon name="prev" /></button>
        <button className="al-skip" aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
        <button className="al-play" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={28} /></button>
        <button className="al-skip" aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
        <button className="al-ic" aria-label="Next chapter"><Icon name="next" /></button>
      </div>

      <dl className="al-stats">
        {[['Speed', '1.0×'], ['Voice', 'Aiden'], ['Sleep', 'Off'], ['Chapters', '61']].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>

      <section className="al-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((x, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{x}</p>
        })}
      </section>

      <h2 className="al-h3">Weather</h2>
      <div className="al-chips">{AMBIENT.map((a, i) => <button key={a} className={i === 2 ? 'is-on' : ''}>{a}</button>)}</div>
      <p className="al-fine">Your companion stays at chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="al al--preview">
      <Moon phase={0.64} size={110} />
      <div><span className="al-big">64</span><span className="al-pct">%</span><p className="al-hero-cap">Waxing gibbous</p></div>
    </div>
  )
}
