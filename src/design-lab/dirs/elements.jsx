/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './elements.css'

// 3 · Elements — the library as a periodic table. Each book is an element
// tile (symbol, number of chapters, % read), colour-coded by state. Chapters
// you haven't reached are "undiscovered" tiles. Listen is an atom whose
// electrons orbit while Lantern reads. The grid is the layout itself.

export const meta = {
  id: 'elements', name: 'Elements', defaultMode: 'light',
  tagline: 'Your library as a periodic table',
  signature: 'Book tiles with symbols, undiscovered chapters, an orbiting atom on Listen',
  research: 'The most graphic of the five. Field Lab’s science becomes the periodic table: every book is an element tile with a symbol, its chapter count as the atomic number and how much you’ve read as its mass. Unread chapters are undiscovered elements, so spoiler protection is built into the metaphor. The wordmark is Ln, element zero.',
}

const SYM = { pp: 'Pp', je: 'Je', md: 'Md', gg: 'Gg', fr: 'Fr', mm: 'Mm' }
const STATE = { listening: 'Listening', reading: 'Reading', finished: 'Finished', next: 'Unread' }

function Tile({ b, size = 'md', pct, onClick, on }) {
  const p = pct ?? b.bookPct
  const T = onClick ? 'button' : 'div'
  return (
    <T className={`el-tile el-tile--${b.status} el-tile--${size}${on ? ' is-on' : ''}`} onClick={onClick}>
      <span className="el-num">{b.chapters}</span>
      <span className="el-mass">{p.toFixed(size === 'xl' ? 1 : 0)}</span>
      <span className="el-sym">{SYM[b.id]}</span>
      <span className="el-name">{b.title}</span>
    </T>
  )
}
const Lockup = () => (
  <span className="el-lockup">
    <span className="el-lk-tile"><span className="el-lk-n">0</span><FlameMark size={12} /><b>Ln</b></span>
    <span className="el-lk-word">Lantern</span>
  </span>
)
function Top({ left, right, center }) {
  return <header className="el-top"><div>{left}</div><div className="el-top-c">{center}</div><div className="el-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="el">
      <Top left={<Lockup />} right={<><button className="el-ic" aria-label="Search"><Icon name="search" /></button><button className="el-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <section className="el-hero">
        <Tile b={b} size="xl" pct={isPP ? pct : b.bookPct} />
        <div className="el-hero-props">
          <h1 className="el-h1">{b.title}</h1>
          <p className="el-by">{b.author}</p>
          <dl className="el-props">
            <div><dt>State</dt><dd>{STATE[b.status]}</dd></div>
            <div><dt>Chapter</dt><dd>{b.chapter || '—'} / {b.chapters}</dd></div>
            <div><dt>{isPP ? 'In chapter' : 'In book'}</dt><dd>{Math.round(pct)}%</dd></div>
          </dl>
        </div>
      </section>
      <div className="el-actions">
        <button className="el-btn el-btn--go" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
        <button className="el-btn" onClick={() => ctx.go('companion')}>Notes</button>
      </div>

      <div className="el-sec"><h2>Table of books</h2><span>{pad2(BOOKS.length)} elements</span></div>
      <div className="el-table">
        {BOOKS.map(x => <Tile key={x.id} b={x} on={x.id === b.id} onClick={() => ctx.setBook(x)} />)}
      </div>
      <ul className="el-legend">
        {['listening', 'reading', 'finished', 'next'].map(s => <li key={s}><i className={`el-sw el-tile--${s}`} />{STATE[s]}</li>)}
      </ul>
    </div>
  )
}

function Companion({ ctx }) {
  const pp = BOOKS[0]
  return (
    <div className="el">
      <Top left={<button className="el-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="el-dim">Element 61 · Pp</span>} right={<button className="el-ic" aria-label="More"><Icon name="more" /></button>} />
      <section className="el-hero el-hero--sm">
        <Tile b={pp} size="lg" pct={1} />
        <div><h1 className="el-h1">{pp.title}</h1><p className="el-by">{pp.author}, 1813</p></div>
      </section>
      <div className="el-sec"><h2>Chapters discovered</h2><span>1 of 61</span></div>
      <div className="el-undiscovered" aria-label="Chapter 1 discovered. Chapters 2 to 61 are undiscovered.">
        {Array.from({ length: 61 }, (_, i) => <span key={i} className={i === 0 ? 'is-found' : ''}>{i === 0 ? '1' : '?'}</span>)}
      </div>
      <nav className="el-tabs" aria-label="Sections">
        {['Notes', 'People', 'Plot', 'Questions', 'Discussion'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
      </nav>
      <article className="el-obs"><span className="el-dim">Observation · Ch. 1</span><p>{REFLECTION}</p></article>
      <div className="el-chat" aria-label="Conversation">
        {CHAT.map((m, i) => (
          <div key={i} className={`el-msg el-msg--${m.who}`}>
            <span className="el-msg-tag">{m.who === 'reader' ? 'You' : <FlameMark size={14} />}</span>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <form className="el-compose" onSubmit={e => e.preventDefault()}>
        <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
      <p className="el-dim el-fine">Lantern only refers to chapters you’ve discovered.</p>
      <div className="el-sec"><h2>Notes</h2><span>{pad2(NOTES.length)}</span></div>
      {NOTES.map((n, i) => <div key={i} className="el-note"><span className="el-note-tag">{n.tag.slice(0, 2)}</span><p>{n.text}</p></div>)}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="el el--reader">
      <Top left={<button className="el-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="el-dim">Pride and Prejudice</span>}
        right={<><button className="el-ic el-aa" aria-label="Text settings">Aa</button><button className="el-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="el-chap"><span className="el-chap-tile"><small>1</small>Ch</span><span className="el-chap-word">Chapter one</span></header>
      <article className="el-prose">
        {PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}
      </article>
      <footer className="el-foot"><span className="el-foot-bar"><i style={{ width: `${pct}%` }} /></span><span>{Math.round(pct)}% · {fmt(CHAPTER_SEC - ctx.t)} left</span></footer>
    </div>
  )
}

function Atom({ pct, playing }) {
  const shells = [52, 84, 116]
  return (
    <svg className={`el-atom${playing ? ' is-playing' : ''}`} viewBox="0 0 260 260" aria-hidden="true">
      {shells.map((r, i) => <circle key={r} cx="130" cy="130" r={r} className="el-shell" style={{ '--d': `${8 + i * 5}s` }} />)}
      <circle cx="130" cy="130" r="116" className="el-shell-progress" style={{ strokeDasharray: `${(pct / 100) * 728.8} 728.8` }} transform="rotate(-90 130 130)" />
      {shells.map((r, i) => (
        <g key={i} className="el-orbit" style={{ '--d': `${6 + i * 4}s`, '--start': `${i * 120}deg` }}>
          <circle cx={130 + r} cy="130" r="6" className="el-electron" />
        </g>
      ))}
    </svg>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="el">
      <Top left={<button className="el-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="el-dim">Listening · Aiden</span>} right={<button className="el-ic" aria-label="More"><Icon name="more" /></button>} />
      <div className="el-atom-wrap">
        <Atom pct={pct} playing={ctx.playing} />
        <div className="el-nucleus"><Tile b={BOOKS[0]} size="lg" pct={pct} /></div>
      </div>
      <h1 className="el-h1 el-center">Chapter 1</h1>
      <p className="el-by el-center">Pride and Prejudice</p>
      <div className="el-time"><span>{fmt(ctx.t)}</span><span className="el-dim">{fmt(CHAPTER_SEC)}</span></div>
      <div className="el-scrub"><span className="el-foot-bar"><i style={{ width: `${pct}%` }} /></span><input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" /></div>
      <div className="el-keys">
        <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}><small>−</small>15</button>
        <button className="el-key-go" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={28} /></button>
        <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}><small>+</small>15</button>
      </div>
      <section className="el-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <div className="el-sec"><h2>Ambient</h2></div>
      <div className="el-amb">{AMBIENT.map((a, i) => <button key={a} className={i === 2 ? 'is-on' : ''}><b>{a.slice(0, 2)}</b><span>{a}</span></button>)}</div>
      <p className="el-dim el-fine">Your companion stays at chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="el el--preview">
      <Lockup />
      <div className="el-table el-table--preview">{BOOKS.slice(0, 4).map(x => <Tile key={x.id} b={x} />)}</div>
    </div>
  )
}
