/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark, Cover } from '../brand.jsx'
import './sketchbook.css'

// 4 · Sketchbook — the human one. A naturalist's sketchbook: dot-grid paper,
// handwriting, ink doodles, tape, circled numbers and margin arrows. The
// grid is the dot grid of the paper. Progress is drawn, not rendered.

export const meta = {
  id: 'sketchbook', name: 'Sketchbook', defaultMode: 'light',
  tagline: 'A naturalist’s sketchbook you read in',
  signature: 'Handwritten notes, ink doodles, taped polaroids and marker highlights',
  research: 'The opposite of an instrument: Field Lab’s explorer keeping a field sketchbook. Dot-grid paper, a handwritten hand for headings and notes (body text stays a proper reading serif), loose ink circles and arrows, tape, and a highlighter swipe for the line being read aloud. Dark mode is chalk on a slate notebook.',
}

// A hand-drawn, slightly wobbly circle path.
function wobble(cx, cy, r, seed = 1, turns = 1.08) {
  const pts = []
  for (let i = 0; i <= 40 * turns; i++) {
    const a = (i / 40) * Math.PI * 2 - Math.PI / 2
    const rr = r * (1 + Math.sin(i * 0.7 + seed) * 0.025 + Math.sin(i * 0.23 + seed * 2) * 0.03)
    pts.push(`${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}
const Scribble = ({ w = 140 }) => (
  <svg className="sk-underline" viewBox={`0 0 ${w} 10`} width={w} height="10" aria-hidden="true">
    <path d={`M2 6 C ${w * 0.25} 2, ${w * 0.5} 9, ${w * 0.75} 4 S ${w - 2} 6, ${w - 2} 5`} />
  </svg>
)
const Lockup = () => (
  <span className="sk-lockup"><FlameMark size={22} live /><span>Lantern</span></span>
)
function Top({ left, right, center }) {
  return <header className="sk-top"><div>{left}</div><div className="sk-top-c">{center}</div><div className="sk-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="sk">
      <Top left={<Lockup />} right={<><button className="sk-ic" aria-label="Search"><Icon name="search" /></button><button className="sk-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <p className="sk-date">mon. 16 nov — late</p>
      <h1 className="sk-h1">Currently reading<Scribble w={180} /></h1>

      <section className="sk-spread">
        <button className="sk-polaroid" onClick={() => ctx.go(b.id === 'pp' ? 'listen' : 'companion')} aria-label={`Open ${b.title}`}>
          <span className="sk-tape" aria-hidden="true" />
          <Cover book={b} size="lg" />
          <span className="sk-caption">{b.title}</span>
        </button>
        <div className="sk-annot">
          <p className="sk-hand sk-hand--big">{b.chapter ? `ch. ${b.chapter} of ${b.chapters}` : 'not started yet!'}</p>
          <p className="sk-hand">{b.author}</p>
          <div className="sk-dial">
            <svg className="sk-dial-ring" viewBox="0 0 100 100" aria-hidden="true">
              <path d={wobble(50, 50, 40, 2)} className="sk-ring" />
              <path d={wobble(50, 50, 40, 2, pct / 100)} className="sk-ring sk-ring--done" />
            </svg>
            <span className="sk-dial-n">{Math.round(pct)}<small>%</small></span>
          </div>
          <p className="sk-hand sk-arrow-note">← {isPP ? `${fmt(CHAPTER_SEC - ctx.t)} to go in ch. 1` : `${100 - b.bookPct}% left`}</p>
        </div>
      </section>
      <div className="sk-actions">
        <button className="sk-btn sk-btn--ink" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> keep reading</button>
        <button className="sk-btn" onClick={() => ctx.go('companion')}>my notes</button>
      </div>

      <h2 className="sk-h2">the pile<Scribble w={90} /></h2>
      <ul className="sk-list">
        {BOOKS.map((x, i) => (
          <li key={x.id}>
            <button className={`sk-row${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
              <svg className="sk-box" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5 L20 4 L19.5 20 L4.5 19.5 Z" />
                {x.status === 'finished' && <path d="M7 12 L11 16 L19 5" className="sk-tick" />}
                {x.id === b.id && <path d={wobble(12, 12, 13, i)} className="sk-circle" />}
              </svg>
              <span className="sk-row-text"><span className="sk-row-title">{x.title}</span><span className="sk-row-meta">{x.author}</span></span>
              <span className="sk-hand sk-row-pct">{x.status === 'finished' ? 'done!' : x.status === 'next' ? 'next?' : `${x.bookPct || 1}%`}</span>
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
    <div className="sk">
      <Top left={<button className="sk-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sk-hand sk-dim">notes on…</span>} right={<button className="sk-ic" aria-label="More"><Icon name="more" /></button>} />
      <h1 className="sk-h1">{pp.title}<Scribble w={220} /></h1>
      <p className="sk-hand sk-dim">{pp.author}, 1813</p>
      <div className="sk-fold">
        <span className="sk-tape sk-tape--long" aria-hidden="true" />
        <p className="sk-hand">no peeking past chapter 1 ✋</p>
        <p className="sk-small">Lantern only talks about pages you’ve read.</p>
      </div>
      <nav className="sk-tabs" aria-label="Sections">
        {['notes', 'people', 'plot', 'questions', 'discussion'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
      </nav>
      <blockquote className="sk-quote">{REFLECTION}</blockquote>
      <div className="sk-chat" aria-label="Conversation">
        {CHAT.map((m, i) => (
          <div key={i} className={`sk-msg sk-msg--${m.who}`}>
            {m.who === 'companion' && <span className="sk-msg-mark"><FlameMark size={20} /></span>}
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <form className="sk-compose" onSubmit={e => e.preventDefault()}>
        <input placeholder="jot a question…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
      <h2 className="sk-h2">scribbles<Scribble w={90} /></h2>
      {NOTES.map((n, i) => <div key={i} className="sk-sticky" style={{ '--r': `${i ? 1.2 : -1}deg` }}><span className="sk-hand">{n.tag.toLowerCase()}:</span><p>{n.text}</p></div>)}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="sk sk--reader">
      <Top left={<button className="sk-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sk-hand sk-dim">pride &amp; prejudice</span>}
        right={<><button className="sk-ic sk-aa" aria-label="Text settings">Aa</button><button className="sk-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="sk-chap">
        <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true"><path d={wobble(40, 40, 32, 5)} className="sk-ring sk-ring--done" /></svg>
        <span className="sk-chap-n">1</span>
        <span className="sk-hand sk-chap-label">chapter one</span>
      </header>
      <article className="sk-prose">
        {PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}><span>{p}</span></p>)}
      </article>
      <footer className="sk-foot">
        <span className="sk-hand">{fmt(CHAPTER_SEC - ctx.t)} left</span>
        <span className="sk-pencil"><i style={{ width: `${pct}%` }} /></span>
        <span className="sk-hand">{Math.round(pct)}%</span>
      </footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="sk">
      <Top left={<button className="sk-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="sk-hand sk-dim">listening</span>} right={<button className="sk-ic" aria-label="More"><Icon name="more" /></button>} />
      <div className="sk-lamp">
        <svg className="sk-lamp-ring" viewBox="0 0 240 240" aria-hidden="true">
          <path d={wobble(120, 120, 104, 3)} className="sk-ring" />
          <path d={wobble(120, 120, 104, 3, pct / 100)} className="sk-ring sk-ring--done sk-ring--thick" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = (i / 8) * Math.PI * 2; return <path key={i} d={`M${120 + 78 * Math.cos(a)} ${120 + 78 * Math.sin(a)} L${120 + 90 * Math.cos(a)} ${120 + 90 * Math.sin(a)}`} className={`sk-ray${ctx.playing ? ' is-on' : ''}`} style={{ '--i': i }} /> })}
        </svg>
        <span className="sk-lamp-mark"><FlameMark size={92} live={ctx.playing} className={ctx.playing ? 'lx-flame--fast' : ''} /></span>
        <span className="sk-hand sk-lamp-note">read by Aiden ↘</span>
      </div>
      <h1 className="sk-h1 sk-center">Chapter 1</h1>
      <p className="sk-hand sk-dim sk-center">pride &amp; prejudice · {fmt(ctx.t)} / {fmt(CHAPTER_SEC)}</p>
      <div className="sk-scrub"><span className="sk-pencil sk-pencil--big"><i style={{ width: `${pct}%` }} /></span><input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" /></div>
      <div className="sk-keys">
        <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}><svg className="sk-keybg" viewBox="0 0 60 60" aria-hidden="true"><path d={wobble(30, 30, 26, 1)} className="sk-ring" /></svg><span className="sk-hand">−15</span></button>
        <button className="sk-key-go" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><svg className="sk-keybg" viewBox="0 0 80 80" aria-hidden="true"><path d={wobble(40, 40, 36, 4)} className="sk-blob" /></svg><Icon name={ctx.playing ? 'pause' : 'play'} size={30} /></button>
        <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}><svg className="sk-keybg" viewBox="0 0 60 60" aria-hidden="true"><path d={wobble(30, 30, 26, 6)} className="sk-ring" /></svg><span className="sk-hand">+15</span></button>
      </div>
      <section className="sk-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}><span>{p}</span></p>
        })}
      </section>
      <h2 className="sk-h2">background noise<Scribble w={140} /></h2>
      <div className="sk-chips">{AMBIENT.map((a, i) => <button key={a} className={i === 2 ? 'is-on' : ''}>{i === 2 && <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M8 20 C 8 4, 92 2, 94 18 C 96 36, 10 38, 6 22" className="sk-circle" /></svg>}<span className="sk-hand">{a.toLowerCase()}</span></button>)}</div>
      <p className="sk-small">Your companion stays at chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="sk sk--preview">
      <Lockup />
      <h1 className="sk-h1">Currently reading<Scribble w={180} /></h1>
      <p className="sk-hand">ch. 1 of 61 ← {pad2(64)}%</p>
    </div>
  )
}
