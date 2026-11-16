/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark, Lockup, Cover } from '../brand.jsx'
import './fieldlab.css'

// A · Field Lab — Specimen moved into a tinkerer's lab notebook. Graph paper,
// callout leader lines, instrument readouts. Heat is measured: every book has
// a burn gauge, and the flame mark sits in a sighting reticle.

export const meta = {
  id: 'fieldlab', name: 'Field Lab', defaultMode: 'light',
  tagline: 'Specimen, kept in a tinkerer’s lab notebook',
  signature: 'Burn gauges and callout labels on graph paper',
  research: 'Keeps Specimen’s accession labels and adds the instrument side: engineering graph paper, leader-line callouts, a thermometer for chapter progress and a dial for listening. The mark sits in a sighting reticle taken from the original app icon.',
}

const code = (b) => `LNT-${pad2(BOOKS.indexOf(b) + 1)}·${b.id.toUpperCase()}`

// Progress as heat. 0% is a cold wick, 100% is full burn.
function Burn({ value, label = 'Burn', ticks = 10 }) {
  return (
    <div className="fl-burn" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <span className="fl-burn-bulb" />
      <span className="fl-burn-tube"><span className="fl-burn-fill" style={{ width: `${value}%` }} /></span>
      <span className="fl-burn-scale" aria-hidden="true">
        {Array.from({ length: ticks + 1 }, (_, i) => <span key={i}><i />{i % 5 === 0 && <b>{i * 10}</b>}</span>)}
      </span>
    </div>
  )
}

function Dial({ value, playing }) {
  const a = -120 + (value / 100) * 240
  const arc = (from, to, r) => {
    const p = (d) => [100 + r * Math.sin((d * Math.PI) / 180), 108 - r * Math.cos((d * Math.PI) / 180)]
    const [x1, y1] = p(from); const [x2, y2] = p(to)
    return `M${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`
  }
  return (
    <svg className="fl-dial" viewBox="0 0 200 150" aria-hidden="true">
      <path d={arc(-120, 120, 84)} className="fl-dial-track" />
      <path d={arc(-120, a, 84)} className="fl-dial-heat" />
      {Array.from({ length: 25 }, (_, i) => {
        const d = -120 + i * 10; const r1 = i % 6 === 0 ? 66 : 72
        const s = Math.sin((d * Math.PI) / 180); const c = Math.cos((d * Math.PI) / 180)
        return <line key={i} x1={100 + r1 * s} y1={108 - r1 * c} x2={100 + 77 * s} y2={108 - 77 * c} className="fl-dial-tick" />
      })}
      <g style={{ transform: `rotate(${a}deg)`, transformOrigin: '100px 108px' }} className="fl-dial-needle">
        <line x1="100" y1="116" x2="100" y2="36" />
      </g>
      <circle cx="100" cy="108" r="5" className="fl-dial-hub" />
      <foreignObject x="86" y="118" width="28" height="30"><FlameMark size={26} live={playing} className={playing ? 'lx-flame--fast' : ''} /></foreignObject>
    </svg>
  )
}

function Callouts({ rows }) {
  return (
    <dl className="fl-callouts">
      {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  )
}

function Top({ left, right, center }) {
  return (
    <header className="fl-top">
      <div>{left}</div><div className="fl-top-c">{center}</div><div className="fl-top-r">{right}</div>
    </header>
  )
}

function Library({ ctx }) {
  const b = ctx.book
  const pct = b.id === 'pp' ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="fl">
      <Top left={<Lockup kind="fieldlab" size={17} />} right={<><button className="fl-ic" aria-label="Search"><Icon name="search" /></button><button className="fl-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <div className="fl-head">
        <span className="fl-mono fl-dim">Bench log · 16 Nov · {pad2(BOOKS.length)} specimens</span>
        <h1 className="fl-h1">On the bench</h1>
      </div>

      <section className="fl-plate">
        <span className="fl-mono fl-plate-no">Fig. 1</span>
        <button className="fl-plate-obj" onClick={() => ctx.go(b.id === 'pp' ? 'listen' : 'companion')} aria-label={`Open ${b.title}`}>
          <Cover book={b} size="lg" />
        </button>
        <Callouts rows={[
          ['Specimen', code(b)],
          ['Position', b.chapter ? `Ch. ${pad2(b.chapter)} / ${b.chapters}` : 'Unopened'],
          ['Remaining', b.minutesLeft ? `${b.minutesLeft} min` : `${100 - b.bookPct}%`],
        ]} />
        <div className="fl-plate-cap">
          <h2 className="fl-h2">{b.title}</h2>
          <p className="fl-sub">{b.author}</p>
        </div>
        <Burn value={pct} label={b.id === 'pp' ? 'Chapter burn' : 'Book burn'} />
        <div className="fl-actions">
          <button className="fl-btn fl-btn--heat" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
          <button className="fl-btn" onClick={() => ctx.go('companion')}>Notebook</button>
        </div>
      </section>

      <div className="fl-section"><span className="fl-mono">Specimen drawer</span><span className="fl-mono fl-dim">Burn %</span></div>
      <ol className="fl-index">
        {BOOKS.map(x => (
          <li key={x.id}>
            <button className={`fl-row${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
              <span className="fl-mono fl-row-no">{pad2(BOOKS.indexOf(x) + 1)}</span>
              <Cover book={x} size="sm" />
              <span className="fl-row-text"><span className="fl-row-title">{x.title}</span><span className="fl-row-meta">{x.author}</span></span>
              <span className="fl-row-heat" style={{ '--v': `${x.bookPct}%` }} aria-label={`${x.bookPct}% read`}><i /></span>
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
    <div className="fl">
      <Top left={<button className="fl-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="fl-mono fl-dim">{code(pp)}</span>} right={<button className="fl-ic" aria-label="More"><Icon name="more" /></button>} />
      <section className="fl-bookhead">
        <Cover book={pp} size="md" />
        <div>
          <h1 className="fl-h2">{pp.title}</h1>
          <p className="fl-sub">{pp.author}, 1813</p>
          <span className="fl-seal"><FlameMark size={14} tone="ink" /> Sealed beyond Ch. 01</span>
        </div>
      </section>
      <div className="fl-strip" aria-label="Chapters reached: 1 of 61. Later chapters are sealed.">
        {Array.from({ length: 61 }, (_, i) => <span key={i} className={i === 0 ? 'is-lit' : ''} />)}
      </div>
      <nav className="fl-tabs" aria-label="Sections">
        {['Notebook', 'People', 'Plot', 'Questions', 'Discussion'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
      </nav>

      <article className="fl-card">
        <span className="fl-mono fl-dim">Observation 01 · Ch. 01</span>
        <p className="fl-quote">{REFLECTION}</p>
      </article>

      <div className="fl-log" aria-label="Conversation">
        {CHAT.map((m, i) => (
          <div key={i} className={`fl-entry fl-entry--${m.who}`}>
            <span className="fl-mono fl-entry-who">{m.who === 'reader' ? <>Q{pad2(i / 2 + 1)} · You · 22:14</> : <><FlameMark size={12} /> Lantern</>}</span>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <form className="fl-compose" onSubmit={e => e.preventDefault()}>
        <input placeholder="Log an observation…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
      <p className="fl-mono fl-dim fl-fine">Lantern only refers to pages you’ve reached.</p>

      <div className="fl-section"><span className="fl-mono">Your notes</span><span className="fl-mono fl-dim">{pad2(NOTES.length)}</span></div>
      {NOTES.map((n, i) => (
        <div key={i} className="fl-note"><span className="fl-mono fl-note-tag">{n.tag}</span><p>{n.text}</p></div>
      ))}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="fl fl--reader">
      <Top left={<button className="fl-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="fl-mono fl-dim">Pride and Prejudice</span>}
        right={<><button className="fl-ic fl-aa" aria-label="Text settings">Aa</button><button className="fl-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="fl-chap">
        <span className="fl-mono fl-dim">Chapter</span>
        <span className="fl-chap-num">I</span>
        <span className="fl-mono fl-dim">of LXI</span>
      </header>
      <article className="fl-prose">
        {PASSAGE.map((p, i) => (
          <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>
            <span className="fl-pn" aria-hidden="true">¶{i + 1}</span>{p}
          </p>
        ))}
      </article>
      <footer className="fl-foot">
        <div className="fl-foot-row"><span className="fl-mono">Ch. 01 · {fmt(CHAPTER_SEC - ctx.t)} left</span><span className="fl-mono">{Math.round(pct)}°</span></div>
        <Burn value={pct} label="Chapter burn" />
      </footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="fl">
      <Top left={<button className="fl-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="fl-mono fl-dim">Instrument · Read aloud</span>} right={<button className="fl-ic" aria-label="More"><Icon name="more" /></button>} />
      <h1 className="fl-h2 fl-center">Chapter I</h1>
      <p className="fl-sub fl-center">Pride and Prejudice · Aiden</p>

      <div className="fl-gauge">
        <Dial value={pct} playing={ctx.playing} />
        <div className="fl-readout"><span>{fmt(ctx.t)}</span><span className="fl-dim">/ {fmt(CHAPTER_SEC)}</span></div>
      </div>
      <div className="fl-scrub">
        <Burn value={pct} label="Chapter position" ticks={10} />
        <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
      </div>

      <div className="fl-transport">
        <button className="fl-key" aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
        <button className="fl-key fl-key--main" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}>
          <Icon name={ctx.playing ? 'pause' : 'play'} size={22} /> {ctx.playing ? 'Pause' : 'Ignite'}
        </button>
        <button className="fl-key" aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
      </div>

      <Callouts rows={[['Speed', '1.0×'], ['Voice', 'Aiden · Qwen3'], ['Sleep', 'End of chapter']]} />

      <section className="fl-card fl-transcript">
        <span className="fl-mono fl-dim">Transcript</span>
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>

      <div className="fl-section"><span className="fl-mono">Room tone</span></div>
      <ul className="fl-checks">
        {AMBIENT.map((a, i) => <li key={a}><button className={i === 2 ? 'is-on' : ''}><span className="fl-box" aria-hidden="true" />{a}</button></li>)}
      </ul>
      <p className="fl-mono fl-dim fl-fine">Your companion stays at Ch. 01 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="fl fl--preview">
      <Lockup kind="fieldlab" size={22} />
      <div className="fl--preview-row">
        <Cover book={BOOKS[0]} size="md" />
        <div style={{ flex: 1 }}>
          <Callouts rows={[['Specimen', 'LNT-01·PP'], ['Position', 'Ch. 01 / 61']]} />
          <Burn value={64} />
        </div>
      </div>
    </div>
  )
}
