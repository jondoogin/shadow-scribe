/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useState } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT, CHARACTERS } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './thumb.css'

// Thumb Index. The quietest of the five: a page of very readable type, with
// all the colour pushed to the edge as dictionary thumb tabs. Spectrum gives
// the colour, Catalogue gives the index-card order. Books are tabs down the
// right edge; inside a book, the tabs are its sections; while you read, one
// tab slides down the edge to show where you are.

export const meta = {
  id: 'thumb', name: 'Thumb Index', defaultMode: 'light',
  tagline: 'A calm page with colour tabs cut into the edge',
  signature: 'Coloured thumb tabs on the right edge for books, sections and your place in the chapter',
  research: 'The cleanest answer to “easier to read and use”. Text sits on a plain page in Literata at generous sizes; Spectrum’s colour moves to the edge as dictionary thumb tabs, and Catalogue’s A–Z drawer becomes the tab order. Tabs are always reachable with a thumb, so navigation lives where your hand already is. Spline Sans Mono for small labels.',
}

const TAB = { pp: '#E2572F', je: '#2C5BA8', md: '#13847A', gg: '#E2A622', fr: '#C23C6C', mm: '#5F8A35' }
const ON = { pp: '#FFFFFF', je: '#FFFFFF', md: '#FFFFFF', gg: '#1F1604', fr: '#FFFFFF', mm: '#FFFFFF' }
const tint = (id) => ({ '--c': TAB[id], '--on': ON[id] })
const STATUS = { listening: 'Listening', reading: 'Reading', finished: 'Finished', next: 'Up next' }

const Lockup = () => <span className="th-lockup"><FlameMark size={20} /><span>Lantern</span></span>
function Top({ left, right, center }) {
  return <header className="th-top"><div>{left}</div><div className="th-top-c">{center}</div><div className="th-top-r">{right}</div></header>
}
// the edge: a column of tabs fixed to the right side of the page
function Edge({ tabs, label }) {
  return (
    <nav className="th-edge" aria-label={label}>
      {tabs.map(t => (
        <button key={t.key} className={`th-tab${t.label.length === 1 ? ' th-tab--letter' : ''}${t.on ? ' is-on' : ''}${t.sealed ? ' is-sealed' : ''}`} style={t.id ? tint(t.id) : undefined} onClick={t.onClick} aria-label={t.aria || t.label} aria-current={t.on || undefined} disabled={t.sealed}>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="th">
      <Edge label="Books" tabs={BOOKS.map(x => ({ key: x.id, id: x.id, label: x.title.replace(/^The /, '')[0], aria: x.title, on: x.id === b.id, onClick: () => ctx.setBook(x) }))} />
      <Top left={<Lockup />} right={<><button className="th-ic" aria-label="Search"><Icon name="search" /></button><button className="th-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <section className="th-now" style={tint(b.id)}>
        <p className="th-label"><i />{STATUS[b.status]}{b.chapter ? ` · chapter ${b.chapter} of ${b.chapters}` : ''}</p>
        <h1 className="th-title">{b.title}</h1>
        <p className="th-by">{b.author}</p>
        <div className="th-progress"><span style={{ width: `${pct}%` }} /></div>
        <p className="th-under"><b>{Math.round(pct)}%</b> {isPP ? `of chapter 1 · ${fmt(CHAPTER_SEC - ctx.t)} left` : 'of the book'}</p>
        <div className="th-actions">
          <button className="th-btn th-btn--go" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
          <button className="th-btn" onClick={() => ctx.go('reader')}>Read</button>
          <button className="th-btn" onClick={() => ctx.go('companion')}>Ask</button>
        </div>
      </section>
      <h2 className="th-h2">All books</h2>
      <ol className="th-list">
        {BOOKS.map(x => (
          <li key={x.id} style={tint(x.id)}>
            <button className={x.id === b.id ? 'is-on' : ''} onClick={() => ctx.setBook(x)}>
              <b>{x.title}</b>
              <span>{x.author} · {x.status === 'next' ? 'not started' : x.status === 'finished' ? 'finished' : `${x.bookPct}%`}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

const SECTIONS = ['Ask', 'Notes', 'People', 'Plot']
function Companion({ ctx }) {
  const pp = BOOKS[0]
  const [tab, setTab] = useState('Ask')
  return (
    <div className="th">
      <Edge label="Sections" tabs={[
        ...SECTIONS.map(s => ({ key: s, id: 'pp', label: s, on: tab === s, onClick: () => setTab(s) })),
        { key: 'sealed', label: 'Ch. 2+', aria: 'Chapters 2 to 61 are sealed', sealed: true },
      ]} />
      <Top left={<button className="th-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="th-top-t">Companion</span>} right={<button className="th-ic" aria-label="More"><Icon name="more" /></button>} />
      <header className="th-book" style={tint('pp')}>
        <p className="th-label"><i />Pride and Prejudice · {pp.author}</p>
        <h1 className="th-title">{tab === 'Ask' ? 'Ask about chapter 1' : tab}</h1>
        <p className="th-safe"><Icon name="shield" size={16} /> Lantern stays inside chapter 1. The grey tab opens when you get there.</p>
      </header>
      {tab === 'Ask' && <>
        <p className="th-pull">{REFLECTION}</p>
        <div className="th-chat">
          {CHAT.map((m, i) => (
            <div key={i} className={`th-msg th-msg--${m.who}`}>
              <span className="th-who">{m.who === 'reader' ? 'You' : <><FlameMark size={13} /> Lantern</>}</span>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <form className="th-compose" onSubmit={e => e.preventDefault()}>
          <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
          <button aria-label="Send" style={tint('pp')}><Icon name="send" size={18} /></button>
        </form>
      </>}
      {tab === 'Notes' && NOTES.map((n, i) => <div key={i} className="th-entry"><span className="th-label">{n.tag}</span><p>{n.text}</p></div>)}
      {tab === 'People' && CHARACTERS.map(c => <div key={c} className="th-entry"><span className="th-label">First seen · chapter 1</span><p>{c}</p></div>)}
      {tab === 'Plot' && <>
        <div className="th-entry"><span className="th-label">Chapter 1</span><p>Netherfield Park is let at last, and Mrs. Bennet has plans for the new tenant.</p></div>
        <div className="th-entry th-entry--sealed"><span className="th-label">Chapters 2–61</span><p>Sealed until you read them.</p></div>
      </>}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="th th--reader">
      <div className="th-rail" aria-hidden="true"><span className="th-thumb" style={{ ...tint('pp'), top: `${pct}%` }}>{Math.round(pct)}%</span></div>
      <Top left={<button className="th-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="th-top-t">Chapter 1 · {fmt(CHAPTER_SEC - ctx.t)} left</span>}
        right={<><button className="th-ic th-aa" aria-label="Text settings">Aa</button><button className="th-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="th-chap" style={tint('pp')}><p className="th-label"><i />Pride and Prejudice</p><h1>Chapter 1</h1></header>
      <article className="th-prose">
        {PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}
      </article>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  const [amb, setAmb] = useState('Fireplace')
  return (
    <div className="th th--listen">
      <Top left={<button className="th-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="th-top-t">Read by Aiden</span>} right={<button className="th-ic" aria-label="More"><Icon name="more" /></button>} />
      <header className="th-book" style={tint('pp')}>
        <p className="th-label"><i />Pride and Prejudice · Chapter 1</p>
      </header>
      <section className="th-transcript" aria-live="polite">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <div className="th-player" style={tint('pp')}>
        <div className="th-scrub">
          <div className="th-progress"><span style={{ width: `${pct}%` }} /></div>
          <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
        </div>
        <div className="th-times"><span>{fmt(ctx.t)}</span><span>−{fmt(CHAPTER_SEC - ctx.t)}</span></div>
        <div className="th-keys">
          <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}><Icon name="rew" size={22} /></button>
          <button className="th-key-go" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={30} /></button>
          <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}><Icon name="fwd" size={22} /></button>
        </div>
      </div>
      <h2 className="th-h2">Ambience</h2>
      <div className="th-amb">{AMBIENT.map(a => <button key={a} className={amb === a ? 'is-on' : ''} onClick={() => setAmb(a)}>{a}</button>)}</div>
      <p className="th-fine">Your companion stays at chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="th th--preview">
      <div className="th-edge th-edge--pv">{BOOKS.slice(0, 5).map((x, i) => <span key={x.id} className={`th-tab th-tab--letter${i === 0 ? ' is-on' : ''}`} style={tint(x.id)}><span>{x.title.replace(/^The /, '')[0]}</span></span>)}</div>
      <p className="th-label" style={tint('pp')}><i />Listening · chapter 1</p>
      <p className="th-title">Pride and Prejudice</p>
      <p className="th-by">Jane Austen</p>
    </div>
  )
}
