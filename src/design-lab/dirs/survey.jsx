/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useState } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT, CHARACTERS } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './survey.css'

// Survey Book. A surveyor's yellow field book: Field Lab's faint grid paper
// and measured readings, Catalogue's ruled log with numbered entries. Your
// progress is a traverse, a route walked station by station across the grid.
// The part you've walked is a solid line; the rest is unsurveyed.

export const meta = {
  id: 'survey', name: 'Survey Book', defaultMode: 'light',
  tagline: 'A surveyor’s field book for your reading',
  signature: 'A traverse route across faint grid paper, a ruled station log, unsurveyed ground for what’s still sealed',
  research: 'From Field Lab: the grid (now a whisper, exactly as asked in round three), instrument readings and the explorer’s route. From Catalogue: the ruled log, numbered entries and a strict column order. The yellow field-book band is the only loud colour; everything else is ink on grid. Archivo for headings, Source Serif 4 for reading, Spline Sans Mono for readings.',
}

const BOOKNO = (b) => `FB-${pad2(BOOKS.indexOf(b) + 1)}`
// a fixed, walkable route across a 320 × 120 grid
const ROUTE = [[8, 96], [44, 70], [70, 84], [104, 50], [142, 62], [170, 30], [206, 44], [236, 22], [268, 52], [296, 34], [312, 16]]
function pointAt(pct) {
  const segs = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]))
  const total = segs.reduce((a, b) => a + b, 0)
  let d = (pct / 100) * total
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]) {
      const t = segs[i] ? d / segs[i] : 0
      return { i, x: ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * t, y: ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * t }
    }
    d -= segs[i]
  }
  return { i: segs.length - 1, x: ROUTE.at(-1)[0], y: ROUTE.at(-1)[1] }
}
export function Traverse({ pct, label }) {
  const p = pointAt(Math.max(0, Math.min(100, pct)))
  const walked = [...ROUTE.slice(0, p.i + 1), [p.x, p.y]].map(q => q.join(',')).join(' ')
  return (
    <svg className="sv-trav" viewBox="0 0 320 120" role="img" aria-label={label || `${Math.round(pct)} percent surveyed`}>
      <polyline points={ROUTE.map(q => q.join(',')).join(' ')} className="sv-trav-todo" />
      <polyline points={walked} className="sv-trav-done" />
      {ROUTE.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={i <= p.i ? 3.5 : 3} className={i <= p.i ? 'sv-st is-done' : 'sv-st'} />)}
      <g transform={`translate(${p.x} ${p.y})`} className="sv-you"><circle r="9" /><circle r="3.5" /></g>
    </svg>
  )
}

const Lockup = () => <span className="sv-lockup"><FlameMark size={20} /><span>Lantern</span></span>
function Top({ left, right, center }) {
  return <header className="sv-top"><div>{left}</div><div className="sv-top-c">{center}</div><div className="sv-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="sv">
      <Top left={<Lockup />} right={<><button className="sv-ic" aria-label="Search"><Icon name="search" /></button><button className="sv-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <article className="sv-book" key={b.id}>
        <div className="sv-band"><span>Field book {BOOKNO(b)}</span><span>{b.status === 'next' ? 'Unsurveyed' : b.status === 'finished' ? 'Closed' : 'In progress'}</span></div>
        <div className="sv-page">
          <h1 className="sv-title">{b.title}</h1>
          <p className="sv-by">{b.author}</p>
          <Traverse pct={pct} />
          <table className="sv-log">
            <tbody>
              <tr><th>Station</th><td>Chapter {b.chapter || '—'} of {b.chapters}</td></tr>
              <tr><th>Surveyed</th><td>{Math.round(pct)}% of {isPP ? 'chapter' : 'book'}</td></tr>
              <tr><th>To go</th><td>{isPP ? fmt(CHAPTER_SEC - ctx.t) : `${100 - b.bookPct}%`}</td></tr>
            </tbody>
          </table>
        </div>
      </article>
      <div className="sv-actions">
        <button className="sv-btn sv-btn--go" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
        <button className="sv-btn" onClick={() => ctx.go('companion')}>Notes</button>
      </div>
      <h2 className="sv-h2">Book log</h2>
      <table className="sv-table">
        <thead><tr><th>No.</th><th>Title</th><th>%</th></tr></thead>
        <tbody>
          {BOOKS.map(x => (
            <tr key={x.id} className={x.id === b.id ? 'is-on' : ''}>
              <td className="sv-no">{BOOKNO(x)}</td>
              <td><button onClick={() => ctx.setBook(x)}><b>{x.title}</b><span>{x.author}</span></button></td>
              <td className="sv-pct">{x.status === 'next' ? '—' : x.bookPct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Companion({ ctx }) {
  const pp = BOOKS[0]
  const [tab, setTab] = useState('Ask')
  return (
    <div className="sv">
      <Top left={<button className="sv-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sv-top-t">{BOOKNO(pp)} · Notes</span>} right={<button className="sv-ic" aria-label="More"><Icon name="more" /></button>} />
      <h1 className="sv-title">{pp.title}</h1>
      <p className="sv-by">{pp.author}, 1813</p>
      <section className="sv-map" aria-label="Chapter 1 surveyed. Chapters 2 to 61 unsurveyed.">
        <div className="sv-map-done"><b>Ch. 1</b><span>Surveyed</span></div>
        <div className="sv-map-todo"><b>Ch. 2–61</b><span>Unsurveyed. Lantern stays out.</span></div>
      </section>
      <nav className="sv-tabs" aria-label="Sections">
        {['Ask', 'Notes', 'People', 'Plot'].map(t => <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </nav>
      {tab === 'Ask' && <>
        <p className="sv-pull">{REFLECTION}</p>
        <div className="sv-chat">
          {CHAT.map((m, i) => (
            <div key={i} className={`sv-msg sv-msg--${m.who}`}>
              <span className="sv-who">{m.who === 'reader' ? 'Q.' : <><FlameMark size={12} /> Lantern</>}</span>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <form className="sv-compose" onSubmit={e => e.preventDefault()}>
          <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
          <button aria-label="Send"><Icon name="send" size={18} /></button>
        </form>
      </>}
      {tab === 'Notes' && NOTES.map((n, i) => <div key={i} className="sv-entry"><span className="sv-mono">{pad2(i + 1)} · {n.tag}</span><p>{n.text}</p></div>)}
      {tab === 'People' && CHARACTERS.map((c, i) => <div key={c} className="sv-entry"><span className="sv-mono">{pad2(i + 1)} · station 1</span><p>{c}</p></div>)}
      {tab === 'Plot' && <>
        <div className="sv-entry"><span className="sv-mono">Station 1</span><p>Netherfield Park is let at last, and Mrs. Bennet has plans for the new tenant.</p></div>
        <div className="sv-entry sv-entry--todo"><span className="sv-mono">Stations 2–61</span><p>Unsurveyed</p></div>
      </>}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="sv sv--reader">
      <Top left={<button className="sv-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sv-top-t">Station 1 · {Math.round(pct)}%</span>}
        right={<><button className="sv-ic sv-aa" aria-label="Text settings">Aa</button><button className="sv-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <article className="sv-paper">
        <header className="sv-chap"><span className="sv-mono">Pride and Prejudice</span><h1>Chapter 1</h1></header>
        <div className="sv-prose">{PASSAGE.map((p, i) => <p key={i} data-n={pad2(i + 1)} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}</div>
      </article>
      <footer className="sv-foot"><span className="sv-foot-bar"><i style={{ width: `${pct}%` }} /></span><span>{fmt(CHAPTER_SEC - ctx.t)} to go</span></footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  const [amb, setAmb] = useState('Fireplace')
  return (
    <div className="sv">
      <Top left={<button className="sv-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="sv-top-t">Read by Aiden</span>} right={<button className="sv-ic" aria-label="More"><Icon name="more" /></button>} />
      <article className="sv-book">
        <div className="sv-band"><span>{BOOKNO(BOOKS[0])} · Chapter 1</span><span>{ctx.playing ? 'Walking' : 'Paused'}</span></div>
        <div className="sv-page">
          <p className="sv-clock">{fmt(ctx.t)}</p>
          <p className="sv-by">{fmt(CHAPTER_SEC - ctx.t)} to go of {fmt(CHAPTER_SEC)}</p>
          <div className="sv-scrub">
            <Traverse pct={pct} />
            <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
          </div>
          <div className="sv-keys">
            <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
            <button className="sv-key-go" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={30} /></button>
            <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
          </div>
        </div>
      </article>
      <section className="sv-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <h2 className="sv-h2">Ambience</h2>
      <div className="sv-amb">{AMBIENT.map(a => <button key={a} className={amb === a ? 'is-on' : ''} onClick={() => setAmb(a)}>{a}</button>)}</div>
      <p className="sv-fine">Your companion stays at chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="sv sv--preview">
      <article className="sv-book">
        <div className="sv-band"><span>Field book FB-01</span><span>In progress</span></div>
        <div className="sv-page"><p className="sv-title">Pride and Prejudice</p><Traverse pct={64} /></div>
      </article>
    </div>
  )
}
