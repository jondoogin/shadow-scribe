/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useState } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT, CHARACTERS } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './swatch.css'

// Swatch. Spectrum's colour fields meet Catalogue's labelled cards: every
// book is a paint chip with a name and a code, and progress is the strip of
// shades below it. Read sections fill in, deeper as you go; unread sections
// are blank chips, so the spoiler line is something you can see.

export const meta = {
  id: 'swatch', name: 'Swatch', defaultMode: 'light',
  tagline: 'Every book is a paint chip',
  signature: 'Named colour chips, a shade strip that fills in as you read, blank chips for what’s sealed',
  research: 'Takes Spectrum’s flat colour and Catalogue’s labelled card and merges them into one familiar object: the paint-store chip. Big colour, a short name, a code in mono, and a strip of shades as progress. Sealed chapters are blank chips, so spoiler protection reads at a glance. Archivo for the interface, Newsreader for reading.',
}

const CHIP = {
  pp: { c: '#E2694A', on: '#1C0D08', name: 'Netherfield' }, je: { c: '#3E5E95', on: '#FFFFFF', name: 'Thornfield' },
  md: { c: '#2C7C78', on: '#FFFFFF', name: 'Pequod' }, gg: { c: '#E6B547', on: '#1D1505', name: 'West Egg' },
  fr: { c: '#6B8A57', on: '#FFFFFF', name: 'Ingolstadt' }, mm: { c: '#C38A63', on: '#1C0F07', name: 'Lowick' },
}
const chip = (id) => ({ '--c': CHIP[id].c, '--on': CHIP[id].on })
const code = (b) => `LT-${pad2(BOOKS.indexOf(b) + 1)}${b.id.toUpperCase()}`

// ten shades from pale to deep; filled up to `pct`, blank after
export function Shades({ pct, n = 10, big = false }) {
  const filled = Math.round((pct / 100) * n)
  return (
    <div className={`sw-shades${big ? ' sw-shades--big' : ''}`} role="img" aria-label={`${Math.round(pct)} percent`}>
      {Array.from({ length: n }, (_, i) => <i key={i} className={i < filled ? 'is-on' : ''} style={{ '--k': `${30 + (i / (n - 1)) * 70}%` }} />)}
    </div>
  )
}
const Lockup = () => <span className="sw-lockup"><FlameMark size={20} /><span>Lantern</span></span>
function Top({ left, right, center }) {
  return <header className="sw-top"><div>{left}</div><div className="sw-top-c">{center}</div><div className="sw-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="sw">
      <Top left={<Lockup />} right={<><button className="sw-ic" aria-label="Search"><Icon name="search" /></button><button className="sw-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <article className="sw-chip sw-chip--hero" style={chip(b.id)}>
        <div className="sw-chip-face">
          <span className="sw-code">{code(b)}</span>
          <p className="sw-name">{CHIP[b.id].name}</p>
          <p className="sw-pct">{Math.round(pct)}<small>%</small></p>
        </div>
        <div className="sw-chip-info">
          <h1 className="sw-title">{b.title}</h1>
          <p className="sw-by">{b.author} · {b.chapter ? `chapter ${b.chapter} of ${b.chapters}` : 'not started'}</p>
          <Shades pct={pct} big />
          <p className="sw-under">{isPP ? `${fmt(CHAPTER_SEC - ctx.t)} left in this chapter` : `${Math.round(pct)}% of the book`}</p>
          <div className="sw-actions">
            <button className="sw-btn sw-btn--go" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
            <button className="sw-btn" onClick={() => ctx.go('companion')}>Companion</button>
          </div>
        </div>
      </article>
      <h2 className="sw-h2">The rack <span>{BOOKS.length} chips</span></h2>
      <ul className="sw-rack">
        {BOOKS.filter(x => x.id !== b.id).map(x => (
          <li key={x.id}>
            <button className="sw-row" onClick={() => ctx.setBook(x)} style={chip(x.id)}>
              <span className="sw-row-chip"><span>{CHIP[x.id].name}</span></span>
              <span className="sw-row-t"><b>{x.title}</b><span>{x.author}</span><Shades pct={x.bookPct} /></span>
              <span className="sw-row-p">{x.status === 'next' ? 'Next' : x.status === 'finished' ? 'Done' : `${x.bookPct}%`}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Companion({ ctx }) {
  const pp = BOOKS[0]
  const [tab, setTab] = useState('Ask')
  return (
    <div className="sw">
      <Top left={<button className="sw-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sw-top-t">Companion</span>} right={<button className="sw-ic" aria-label="More"><Icon name="more" /></button>} />
      <div className="sw-head" style={chip('pp')}>
        <span className="sw-head-chip"><span className="sw-code">{code(pp)}</span><b>{CHIP.pp.name}</b></span>
        <div><h1 className="sw-title">{pp.title}</h1><p className="sw-by">{pp.author}, 1813</p></div>
      </div>
      <section className="sw-seal" style={chip('pp')} aria-label="Chapter 1 read. Chapters 2 to 61 sealed.">
        <span className="sw-seal-on"><b>Ch. 1</b>read</span>
        <span className="sw-seal-off"><b>Ch. 2–61</b>blank until you read them</span>
      </section>
      <nav className="sw-tabs" aria-label="Sections">
        {['Ask', 'Notes', 'People', 'Plot'].map(t => <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </nav>
      {tab === 'Ask' && <>
        <p className="sw-pull">{REFLECTION}</p>
        <div className="sw-chat">
          {CHAT.map((m, i) => (
            <div key={i} className={`sw-msg sw-msg--${m.who}`}>
              {m.who === 'companion' && <span className="sw-who"><FlameMark size={13} /> Lantern</span>}
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <form className="sw-compose" onSubmit={e => e.preventDefault()}>
          <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
          <button aria-label="Send" style={chip('pp')}><Icon name="send" size={18} /></button>
        </form>
      </>}
      {tab === 'Notes' && NOTES.map((n, i) => <div key={i} className="sw-card" style={chip(i ? 'md' : 'je')}><b>{n.tag}</b><p>{n.text}</p></div>)}
      {tab === 'People' && CHARACTERS.map((c, i) => <div key={c} className="sw-card" style={chip(['pp', 'gg', 'mm', 'md'][i])}><b>First seen in chapter 1</b><p>{c}</p></div>)}
      {tab === 'Plot' && <>
        <div className="sw-card" style={chip('pp')}><b>Chapter 1</b><p>Netherfield Park is let at last, and Mrs. Bennet has plans for the new tenant.</p></div>
        <div className="sw-card sw-card--blank"><b>Chapters 2–61</b><p>Blank chips. They fill in as you read.</p></div>
      </>}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="sw sw--reader">
      <Top left={<button className="sw-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sw-top-t">Chapter 1</span>}
        right={<><button className="sw-ic sw-aa" aria-label="Text settings">Aa</button><button className="sw-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="sw-chap" style={chip('pp')}><span className="sw-code">{code(BOOKS[0])} · I</span><h1>Chapter One</h1></header>
      <article className="sw-prose">
        {PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''} style={chip('pp')}>{p}</p>)}
      </article>
      <footer className="sw-foot" style={chip('pp')}><Shades pct={pct} /><span>{Math.round(pct)}% · {fmt(CHAPTER_SEC - ctx.t)} left</span></footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  const [amb, setAmb] = useState('Fireplace')
  return (
    <div className="sw">
      <Top left={<button className="sw-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="sw-top-t">Read by Aiden</span>} right={<button className="sw-ic" aria-label="More"><Icon name="more" /></button>} />
      <article className="sw-chip sw-chip--player" style={chip('pp')}>
        <div className="sw-chip-face">
          <span className="sw-code">{code(BOOKS[0])} · Chapter 1</span>
          <p className="sw-clock">{fmt(ctx.t)}</p>
          <p className="sw-name">{fmt(CHAPTER_SEC - ctx.t)} left</p>
        </div>
        <div className="sw-chip-info">
          <div className="sw-scrub">
            <Shades pct={pct} n={12} big />
            <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
          </div>
          <div className="sw-keys">
            <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
            <button className="sw-key-go" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={30} /></button>
            <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
          </div>
        </div>
      </article>
      <section className="sw-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <h2 className="sw-h2">Ambience</h2>
      <div className="sw-amb">{AMBIENT.map(a => <button key={a} className={amb === a ? 'is-on' : ''} onClick={() => setAmb(a)}>{a}</button>)}</div>
      <p className="sw-fine">Your companion stays at chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="sw sw--preview">
      {['pp', 'je', 'gg'].map((id, i) => (
        <div key={id} className="sw-pv" style={{ ...chip(id), flex: i ? 1 : 1.5 }}>
          <div className="sw-pv-face"><span className="sw-code">{code(BOOKS.find(b => b.id === id))}</span><b>{CHIP[id].name}</b></div>
          <Shades pct={[64, 24, 33][i]} n={6} />
        </div>
      ))}
    </div>
  )
}
