/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useState } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT, CHARACTERS } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './guide.css'

// Field Guide. A naturalist's pocket guide: numbered entries, a colour key
// down the edge, and a "range" bar for where you are. Catalogue gives the
// numbered, alphabetical entry; Field Lab gives the explorer. People in the
// companion are "species observed", and anything past your chapter is a
// silhouette marked "not yet observed".

export const meta = {
  id: 'guide', name: 'Field Guide', defaultMode: 'light',
  tagline: 'A naturalist’s pocket guide to your books',
  signature: 'Numbered entries with a colour key, a range bar for progress, silhouettes for what you haven’t met yet',
  research: 'Field guides are some of the most readable reference design there is: a strong entry number, one bold name, a few labelled facts, and a colour key to flip by. From Catalogue: the numbered, alphabetical entry. From Field Lab: the explorer, observation notes and a measured range. Young Serif for names, Literata for reading, DM Mono for the small facts.',
}

const KEY = { pp: '#D8572A', je: '#3466B8', md: '#1D8A7A', gg: '#D9A021', fr: '#A8436B', mm: '#5C8A32' }
const key = (id) => ({ '--c': KEY[id], '--on': id === 'gg' ? '#1F1604' : '#FFFFFF' })
const SEEN = { listening: 'Observing now', reading: 'Observing now', finished: 'Fully observed', next: 'Not yet observed' }

const Lockup = () => <span className="fg-lockup"><FlameMark size={20} /><span>Lantern</span></span>
function Top({ left, right, center }) {
  return <header className="fg-top"><div>{left}</div><div className="fg-top-c">{center}</div><div className="fg-top-r">{right}</div></header>
}
const Range = ({ pct, marks = ['Start', 'Middle', 'End'] }) => (
  <div className="fg-range">
    <div className="fg-range-bar"><i style={{ width: `${pct}%` }} /><b style={{ left: `${pct}%` }} /></div>
    <div className="fg-range-l">{marks.map(m => <span key={m}>{m}</span>)}</div>
  </div>
)

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  const n = BOOKS.indexOf(b) + 1
  return (
    <div className="fg">
      <Top left={<Lockup />} right={<><button className="fg-ic" aria-label="Search"><Icon name="search" /></button><button className="fg-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <article className="fg-entry" style={key(b.id)} key={b.id}>
        <div className="fg-entry-n"><span>{pad2(n)}</span></div>
        <div className="fg-entry-b">
          <p className="fg-seen"><i />{SEEN[b.status]}</p>
          <h1 className="fg-name">{b.title}</h1>
          <p className="fg-latin">{b.author}</p>
          <dl className="fg-facts">
            <div><dt>Chapter</dt><dd>{b.chapter ? `${b.chapter} of ${b.chapters}` : '—'}</dd></div>
            <div><dt>{isPP ? 'This chapter' : 'Whole book'}</dt><dd>{Math.round(pct)}%</dd></div>
            <div><dt>Time left</dt><dd>{isPP ? fmt(CHAPTER_SEC - ctx.t) : '—'}</dd></div>
          </dl>
          <p className="fg-sub">Range</p>
          <Range pct={pct} />
        </div>
      </article>
      <div className="fg-actions">
        <button className="fg-btn fg-btn--go" style={key(b.id)} onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
        <button className="fg-btn" onClick={() => ctx.go('companion')}>Field notes</button>
      </div>
      <h2 className="fg-h2">Index of entries</h2>
      <ol className="fg-index">
        {BOOKS.map((x, i) => (
          <li key={x.id} style={key(x.id)}>
            <button className={x.id === b.id ? 'is-on' : ''} onClick={() => ctx.setBook(x)}>
              <span className="fg-index-n">{pad2(i + 1)}</span>
              <span className="fg-index-t"><b>{x.title}</b><span>{x.author}</span></span>
              <span className="fg-index-s">{x.status === 'next' ? 'Unseen' : x.status === 'finished' ? 'Seen' : `${x.bookPct}%`}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Companion({ ctx }) {
  const pp = BOOKS[0]
  const [tab, setTab] = useState('Ask')
  return (
    <div className="fg">
      <Top left={<button className="fg-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="fg-top-t">Entry 01 · Field notes</span>} right={<button className="fg-ic" aria-label="More"><Icon name="more" /></button>} />
      <header className="fg-head" style={key('pp')}>
        <h1 className="fg-name">{pp.title}</h1>
        <p className="fg-latin">{pp.author}, 1813</p>
        <p className="fg-note"><Icon name="shield" size={16} /> You’ve explored chapter 1. Lantern won’t describe territory past it.</p>
      </header>
      <nav className="fg-tabs" aria-label="Sections" style={key('pp')}>
        {['Ask', 'Species', 'Notes', 'Plot'].map(t => <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </nav>
      {tab === 'Ask' && <>
        <p className="fg-pull">{REFLECTION}</p>
        <div className="fg-chat">
          {CHAT.map((m, i) => (
            <div key={i} className={`fg-msg fg-msg--${m.who}`}>
              <span className="fg-who">{m.who === 'reader' ? 'You' : <><FlameMark size={12} /> Lantern</>}</span>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <form className="fg-compose" onSubmit={e => e.preventDefault()} style={key('pp')}>
          <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
          <button aria-label="Send"><Icon name="send" size={18} /></button>
        </form>
      </>}
      {tab === 'Species' && <div className="fg-species">
        {CHARACTERS.map(c => <div key={c} className="fg-sp" style={key('pp')}><span className="fg-sp-dot" /><b>{c}</b><span>First seen in ch. 1</span></div>)}
        {[1, 2].map(i => <div key={i} className="fg-sp fg-sp--unseen"><span className="fg-sp-dot" /><b>Not yet observed</b><span>Appears later</span></div>)}
      </div>}
      {tab === 'Notes' && NOTES.map((n, i) => <div key={i} className="fg-obs"><span className="fg-mono">Observation {pad2(i + 1)} · {n.tag}</span><p>{n.text}</p></div>)}
      {tab === 'Plot' && <>
        <div className="fg-obs"><span className="fg-mono">Chapter 1</span><p>Netherfield Park is let at last, and Mrs. Bennet has plans for the new tenant.</p></div>
        <div className="fg-obs fg-obs--unseen"><span className="fg-mono">Chapters 2–61</span><p>Unexplored</p></div>
      </>}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="fg fg--reader">
      <Top left={<button className="fg-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="fg-top-t">Pride and Prejudice</span>}
        right={<><button className="fg-ic fg-aa" aria-label="Text settings">Aa</button><button className="fg-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="fg-chap" style={key('pp')}><span className="fg-chap-n">1</span><h1>Chapter One</h1></header>
      <article className="fg-prose" style={key('pp')}>{PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}</article>
      <footer className="fg-foot" style={key('pp')}><Range pct={pct} marks={['', '', '']} /><span>{fmt(CHAPTER_SEC - ctx.t)} left</span></footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  const [amb, setAmb] = useState('Fireplace')
  return (
    <div className="fg">
      <Top left={<button className="fg-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="fg-top-t">Read by Aiden</span>} right={<button className="fg-ic" aria-label="More"><Icon name="more" /></button>} />
      <section className="fg-player" style={key('pp')}>
        <p className="fg-seen"><i />Entry 01 · Chapter 1</p>
        <p className="fg-clock">{fmt(ctx.t)}</p>
        <p className="fg-latin">{fmt(CHAPTER_SEC - ctx.t)} left of {fmt(CHAPTER_SEC)}</p>
        <div className="fg-scrub">
          <Range pct={pct} marks={['0:00', '3:06', fmt(CHAPTER_SEC)]} />
          <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
        </div>
        <div className="fg-keys">
          <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}><Icon name="rew" size={22} /></button>
          <button className="fg-key-go" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={30} /></button>
          <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}><Icon name="fwd" size={22} /></button>
        </div>
      </section>
      <section className="fg-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <h2 className="fg-h2">Habitat sounds</h2>
      <div className="fg-amb">{AMBIENT.map(a => <button key={a} className={amb === a ? 'is-on' : ''} onClick={() => setAmb(a)}>{a}</button>)}</div>
      <p className="fg-fine">Your companion stays at chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="fg fg--preview">
      <article className="fg-entry" style={key('pp')}>
        <div className="fg-entry-n"><span>01</span></div>
        <div className="fg-entry-b"><p className="fg-seen"><i />Observing now</p><p className="fg-name">Pride and Prejudice</p><Range pct={64} /></div>
      </article>
    </div>
  )
}
