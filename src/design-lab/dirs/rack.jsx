/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useState } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT, CHARACTERS } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './rack.css'

// Sample Rack. Field Lab's bench instruments meet Catalogue's numbered
// labels: your library is a test-tube rack, each book a labelled sample that
// fills as you read. Choosing a sample lifts it out of the rack. Inside a
// book, chapters are a row of tubes, and the ones you haven't reached are
// still empty and capped.

export const meta = {
  id: 'rack', name: 'Sample Rack', defaultMode: 'light',
  tagline: 'Your library as a rack of labelled samples',
  signature: 'Tubes that fill as you read, a lifted sample with its label, capped empty tubes for sealed chapters',
  research: 'From Field Lab: bench instruments, measured quantities, a clean lab-white palette. From Catalogue: numbered sample labels and a strict index. The rack is a single, glanceable picture of everything you’re reading, and the label below it holds the details in large type. IBM Plex Sans and Plex Mono, with colour only in the liquid.',
}

const LIQ = { pp: '#E8643A', je: '#3B6FD4', md: '#16998A', gg: '#E2AA2E', fr: '#C9476E', mm: '#6E9B3A' }
const liq = (id) => ({ '--c': LIQ[id] })
const sid = (b) => `S-${pad2(BOOKS.indexOf(b) + 1)}`

function Tube({ pct, id, capped = false, label, on = false, size = 'md' }) {
  return (
    <span className={`rk-tube rk-tube--${size}${on ? ' is-on' : ''}${capped ? ' is-capped' : ''}`} style={liq(id)}>
      <span className="rk-cap" />
      <span className="rk-glass"><span className="rk-liq" style={{ height: `${Math.max(0, Math.min(100, pct))}%` }} /></span>
      {label && <span className="rk-tube-l">{label}</span>}
    </span>
  )
}
const Lockup = () => <span className="rk-lockup"><FlameMark size={20} /><span>Lantern</span></span>
function Top({ left, right, center }) {
  return <header className="rk-top"><div>{left}</div><div className="rk-top-c">{center}</div><div className="rk-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="rk">
      <Top left={<Lockup />} right={<><button className="rk-ic" aria-label="Search"><Icon name="search" /></button><button className="rk-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <section className="rk-rack" aria-label="Your books">
        {BOOKS.map(x => (
          <button key={x.id} className="rk-slot" onClick={() => ctx.setBook(x)} aria-label={`${x.title}, ${x.bookPct}%`} aria-pressed={x.id === b.id}>
            <Tube id={x.id} pct={x.id === 'pp' && isPP ? Math.max(8, pct) : x.status === 'next' ? 0 : Math.max(6, x.bookPct)} capped={x.status === 'next'} on={x.id === b.id} label={sid(x)} />
          </button>
        ))}
        <span className="rk-rack-bar" aria-hidden="true" />
      </section>
      <article className="rk-label" style={liq(b.id)} key={b.id}>
        <div className="rk-label-head"><span>{sid(b)}</span><span>{b.status === 'next' ? 'Sealed' : b.status === 'finished' ? 'Complete' : 'Active'}</span></div>
        <h1 className="rk-title">{b.title}</h1>
        <p className="rk-by">{b.author}</p>
        <dl className="rk-read">
          <div><dt>{isPP ? 'Chapter fill' : 'Book fill'}</dt><dd>{Math.round(pct)}<small>%</small></dd></div>
          <div><dt>Chapter</dt><dd>{b.chapter || '—'}<small>/{b.chapters}</small></dd></div>
          <div><dt>Left</dt><dd>{isPP ? fmt(CHAPTER_SEC - ctx.t) : `${100 - b.bookPct}%`}</dd></div>
        </dl>
        <div className="rk-actions">
          <button className="rk-btn rk-btn--go" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
          <button className="rk-btn" onClick={() => ctx.go('companion')}>Notes</button>
        </div>
      </article>
    </div>
  )
}

function Companion({ ctx }) {
  const pp = BOOKS[0]
  const [tab, setTab] = useState('Ask')
  return (
    <div className="rk">
      <Top left={<button className="rk-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="rk-top-t">{sid(pp)} · Companion</span>} right={<button className="rk-ic" aria-label="More"><Icon name="more" /></button>} />
      <h1 className="rk-title">{pp.title}</h1>
      <p className="rk-by">{pp.author}, 1813</p>
      <section className="rk-chapters" aria-label="Chapter 1 reached. Chapters 2 to 61 are sealed.">
        <div className="rk-chapters-row">
          {Array.from({ length: 10 }, (_, i) => <Tube key={i} id="pp" size="sm" pct={i === 0 ? 100 : 0} capped={i > 0} label={pad2(i + 1)} />)}
        </div>
        <p><b>Chapter 1 is filled.</b> Chapters 2–61 stay capped, so Lantern can’t talk about them yet.</p>
      </section>
      <nav className="rk-tabs" aria-label="Sections">
        {['Ask', 'Notes', 'People', 'Plot'].map(t => <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </nav>
      {tab === 'Ask' && <>
        <p className="rk-pull">{REFLECTION}</p>
        <div className="rk-chat">
          {CHAT.map((m, i) => (
            <div key={i} className={`rk-msg rk-msg--${m.who}`}>
              {m.who === 'companion' && <span className="rk-who"><FlameMark size={13} /> Lantern</span>}
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <form className="rk-compose" onSubmit={e => e.preventDefault()}>
          <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
          <button aria-label="Send" style={liq('pp')}><Icon name="send" size={18} /></button>
        </form>
      </>}
      {tab === 'Notes' && NOTES.map((n, i) => <div key={i} className="rk-entry"><span className="rk-mono">Obs. {pad2(i + 1)} · {n.tag}</span><p>{n.text}</p></div>)}
      {tab === 'People' && CHARACTERS.map(c => <div key={c} className="rk-entry"><span className="rk-mono">Present · ch. 1</span><p>{c}</p></div>)}
      {tab === 'Plot' && <>
        <div className="rk-entry"><span className="rk-mono">Chapter 1</span><p>Netherfield Park is let at last, and Mrs. Bennet has plans for the new tenant.</p></div>
        <div className="rk-entry rk-entry--sealed"><span className="rk-mono">Chapters 2–61</span><p>Capped</p></div>
      </>}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="rk rk--reader">
      <Top left={<button className="rk-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="rk-top-t">{sid(BOOKS[0])} · Chapter 1</span>}
        right={<><button className="rk-ic rk-aa" aria-label="Text settings">Aa</button><button className="rk-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="rk-chap"><span className="rk-mono">Pride and Prejudice</span><h1>Chapter 1</h1></header>
      <article className="rk-prose">{PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}</article>
      <footer className="rk-foot" style={liq('pp')}><span className="rk-htube"><i style={{ width: `${pct}%` }} /></span><span>{Math.round(pct)}% · {fmt(CHAPTER_SEC - ctx.t)} left</span></footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  const [amb, setAmb] = useState('Fireplace')
  return (
    <div className="rk">
      <Top left={<button className="rk-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="rk-top-t">Read by Aiden</span>} right={<button className="rk-ic" aria-label="More"><Icon name="more" /></button>} />
      <section className="rk-player" style={liq('pp')}>
        <span className="rk-mono">{sid(BOOKS[0])} · Pride and Prejudice · Ch. 1</span>
        <p className="rk-clock">{fmt(ctx.t)}</p>
        <p className="rk-by">{fmt(CHAPTER_SEC - ctx.t)} left of {fmt(CHAPTER_SEC)}</p>
        <div className="rk-scrub">
          <span className="rk-htube rk-htube--big"><i style={{ width: `${pct}%` }} /></span>
          <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
        </div>
        <div className="rk-keys">
          <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
          <button className="rk-key-go" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={30} /></button>
          <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
        </div>
      </section>
      <section className="rk-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <h2 className="rk-h2">Ambience</h2>
      <div className="rk-amb">{AMBIENT.map(a => <button key={a} className={amb === a ? 'is-on' : ''} onClick={() => setAmb(a)}>{a}</button>)}</div>
      <p className="rk-fine">Your companion stays at chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="rk rk--preview">
      <section className="rk-rack">
        {BOOKS.map((x, i) => <span key={x.id} className="rk-slot"><Tube id={x.id} pct={[64, 24, 30, 33, 100, 0][i]} capped={x.status === 'next'} on={i === 0} label={sid(x)} /></span>)}
        <span className="rk-rack-bar" aria-hidden="true" />
      </section>
    </div>
  )
}
