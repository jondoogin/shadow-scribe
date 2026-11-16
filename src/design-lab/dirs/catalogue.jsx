/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './catalogue.css'

// 2 · Catalogue — the library as a card-catalogue drawer. Every book is a
// typed index card with blue rules and a red margin line; the grid becomes
// ruled lines, and the Reader page is ruled to the exact line height.

export const meta = {
  id: 'catalogue', name: 'Catalogue', defaultMode: 'light',
  tagline: 'A card-catalogue drawer for your books',
  signature: 'Typed index cards, ruled lines and a rubber-stamped spoiler seal',
  research: 'Field Lab’s labels turned into an old library card catalogue: typewriter fields, blue rules with a red margin, call numbers, stacked cards you flick through, and a red rubber stamp for spoiler protection. The Reader page is ruled to the exact line height, so the text sits on the lines.',
}

const call = (b) => `${b.author.split(' ').slice(-1)[0].slice(0, 3).toUpperCase()} ${pad2(BOOKS.indexOf(b) + 1)}·${b.chapters}`
const Typed = ({ k, v }) => <div className="ct-field"><span className="ct-k">{k}</span><span className="ct-v">{v}</span></div>
const bar = (pct, n = 20) => '■'.repeat(Math.round((pct / 100) * n)) + '□'.repeat(n - Math.round((pct / 100) * n))

function Top({ left, right, center }) {
  return <header className="ct-top"><div>{left}</div><div className="ct-top-c">{center}</div><div className="ct-top-r">{right}</div></header>
}
const Lockup = () => (
  <span className="ct-plate"><FlameMark size={18} /><span>Lantern</span></span>
)

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  const others = BOOKS.filter(x => x.id !== b.id)
  return (
    <div className="ct">
      <Top left={<Lockup />} right={<><button className="ct-ic" aria-label="Search"><Icon name="search" /></button><button className="ct-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <p className="ct-drawer">Drawer 1 · A–Z · {pad2(BOOKS.length)} cards</p>

      <div className="ct-stack">
        {others.slice(0, 3).map((x, i) => <div key={x.id} className="ct-behind" style={{ '--i': i }}><span>{x.title}</span></div>)}
        <article className="ct-card ct-card--front">
          <div className="ct-card-head"><span className="ct-call">{call(b)}</span><span className="ct-stat">{b.status === 'listening' ? 'ON LOAN · LISTENING' : b.status === 'reading' ? 'ON LOAN · READING' : b.status === 'finished' ? 'RETURNED' : 'ON SHELF'}</span></div>
          <h1 className="ct-title">{b.title}</h1>
          <Typed k="Author" v={b.author} />
          <Typed k="Position" v={b.chapter ? `Chapter ${b.chapter} of ${b.chapters}` : 'Not begun'} />
          <Typed k="Remaining" v={isPP ? `${fmt(CHAPTER_SEC - ctx.t)} in chapter` : `${100 - b.bookPct}% of book`} />
          <div className="ct-progress"><span>{bar(pct)}</span><b>{Math.round(pct)}%</b></div>
          <span className="ct-hole" aria-hidden="true" />
        </article>
      </div>
      <div className="ct-actions">
        <button className="ct-btn ct-btn--ink" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
        <button className="ct-btn" onClick={() => ctx.go('companion')}>Notes</button>
      </div>

      <div className="ct-tabs-row" aria-hidden="true">{['A–F', 'G–L', 'M–R', 'S–Z'].map((t, i) => <span key={t} className={i === 0 ? 'is-on' : ''}>{t}</span>)}</div>
      <ol className="ct-list">
        {BOOKS.map(x => (
          <li key={x.id}>
            <button className={`ct-row${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
              <span className="ct-row-call">{call(x)}</span>
              <span className="ct-row-title">{x.title}</span>
              <span className="ct-row-meta">{x.author}</span>
              <span className="ct-row-pct">{x.status === 'finished' ? 'RET.' : x.status === 'next' ? '—' : `${x.bookPct || 1}%`}</span>
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
    <div className="ct">
      <Top left={<button className="ct-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="ct-small">{call(pp)}</span>} right={<button className="ct-ic" aria-label="More"><Icon name="more" /></button>} />
      <article className="ct-card">
        <div className="ct-card-head"><span className="ct-call">Reader’s notes</span><span className="ct-stat">Card 1 of 1</span></div>
        <h1 className="ct-title">{pp.title}</h1>
        <Typed k="Author" v={`${pp.author}, 1813`} />
        <Typed k="Read to" v="Chapter 1" />
        <span className="ct-stamp">Restricted<small>Ch. 2 onward</small></span>
      </article>
      <nav className="ct-dividers" aria-label="Sections">
        {['Notes', 'People', 'Plot', 'Questions', 'Discussion'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
      </nav>
      <article className="ct-card ct-card--plain">
        <p className="ct-hand">{REFLECTION}</p>
      </article>
      <div className="ct-thread" aria-label="Conversation">
        {CHAT.map((m, i) => (
          <article key={i} className={`ct-card ct-msg ct-msg--${m.who}`}>
            <span className="ct-k">{m.who === 'reader' ? 'Query · you' : <><FlameMark size={11} /> Reply · Lantern</>}</span>
            <p>{m.text}</p>
          </article>
        ))}
      </div>
      <form className="ct-compose" onSubmit={e => e.preventDefault()}>
        <input placeholder="Type a query about Chapter 1…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
      <p className="ct-small ct-fine">Lantern only refers to pages you’ve reached.</p>
      {NOTES.map((n, i) => <div key={i} className="ct-slip"><span className="ct-k">{n.tag}</span><p>{n.text}</p></div>)}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="ct ct--reader">
      <Top left={<button className="ct-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="ct-small">Pride and Prejudice</span>}
        right={<><button className="ct-ic ct-aa" aria-label="Text settings">Aa</button><button className="ct-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <div className="ct-page">
        <header className="ct-page-head"><span className="ct-k">Chapter</span><span className="ct-page-num">I.</span></header>
        <article className="ct-prose">
          {PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}
        </article>
      </div>
      <footer className="ct-foot"><span>Ch. 1</span><span className="ct-foot-bar">{bar(pct, 16)}</span><span>{fmt(CHAPTER_SEC - ctx.t)}</span></footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="ct">
      <Top left={<button className="ct-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="ct-small">Listening</span>} right={<button className="ct-ic" aria-label="More"><Icon name="more" /></button>} />
      <article className="ct-card ct-loan">
        <div className="ct-card-head"><span className="ct-call">Loan record · audio</span><span className="ct-stat">Read by Aiden</span></div>
        <h1 className="ct-title">Chapter I</h1>
        <p className="ct-sub">Pride and Prejudice</p>
        <div className="ct-dates">
          {[['Started', '0:00'], ['Now', fmt(ctx.t)], ['Due', fmt(CHAPTER_SEC)]].map(([k, v], i) => (
            <div key={k} className={i === 1 ? 'is-now' : ''}><span className="ct-k">{k}</span><span className="ct-datestamp">{v}</span></div>
          ))}
        </div>
        <div className="ct-progress ct-progress--big"><span>{bar(pct, 24)}</span><b>{Math.round(pct)}%</b></div>
        <input className="ct-range" type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
        <span className="ct-hole" aria-hidden="true" />
      </article>
      <div className="ct-keys">
        <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
        <button className="ct-key-main" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={26} /></button>
        <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
      </div>
      <p className="ct-keylabels"><span>1.0×</span><span>Sleep: end of chapter</span></p>
      <div className="ct-slip ct-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </div>
      <p className="ct-k ct-amb-label">Reading room</p>
      <div className="ct-tickets">{AMBIENT.map((a, i) => <button key={a} className={i === 2 ? 'is-on' : ''}>{a}</button>)}</div>
      <p className="ct-small ct-fine">Your companion stays at Chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="ct ct--preview">
      <Lockup />
      <article className="ct-card ct-card--front">
        <div className="ct-card-head"><span className="ct-call">AUS 01·61</span><span className="ct-stat">ON LOAN</span></div>
        <h1 className="ct-title">Pride and Prejudice</h1>
        <div className="ct-progress"><span>{bar(64, 14)}</span><b>64%</b></div>
      </article>
    </div>
  )
}
