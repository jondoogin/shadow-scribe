/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useState } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './catalogue.css'

// Catalogue II. The index card stays the core object, but everything that
// made round five hard to read is gone: no typewriter body text, no ruled
// lines behind data, no overlapping stamp. Labels are a small clean mono,
// content is a reading serif, and the only ornaments are the ones that carry
// meaning: the red rule, the call number, the punched rod hole and the seal.

export const meta = {
  id: 'catalogue', name: 'Catalogue III', defaultMode: 'light',
  tagline: 'The card catalogue, edited down and set in motion',
  signature: 'A drawer you can see into, punched-hole progress, a loan record stamped as you listen',
  research: 'Round eight pushes it further: the next cards in the drawer peek out behind the one you’re reading, choosing a book pulls its card up, the spoiler seal stamps itself on, and Listen keeps a loan record of your sessions as date stamps. Kept from round seven: the index card, call numbers, the red rule, the rubber-stamp seal. Changed: body text moves from Courier to a reading serif, labels to a clean 12px mono, the ruled lines leave the data cards, and every screen gets one obvious primary action. Progress is a row of punched holes, like the rod hole at the foot of a catalogue card.',
}

const STATUS = { listening: 'On loan · listening', reading: 'On loan · reading', finished: 'Returned', next: 'On the shelf' }
const call = (b) => `${b.author.split(' ').slice(-1)[0].slice(0, 3).toUpperCase()} ${pad2(BOOKS.indexOf(b) + 1)}`
const FILTERS = [['all', 'All'], ['active', 'On loan'], ['finished', 'Returned'], ['next', 'Shelf']]

export const Holes = ({ pct, n = 24 }) => (
  <div className="c2-holes" role="img" aria-label={`${Math.round(pct)} percent`}>
    {Array.from({ length: n }, (_, i) => <i key={i} className={i < Math.round((pct / 100) * n) ? 'is-on' : ''} />)}
  </div>
)
const Lockup = () => <span className="c2-lockup"><FlameMark size={20} /><span>Lantern</span></span>
function Top({ left, right, center }) {
  return <header className="c2-top"><div>{left}</div><div className="c2-top-c">{center}</div><div className="c2-top-r">{right}</div></header>
}
const Field = ({ k, v }) => <div className="c2-field"><dt>{k}</dt><dd>{v}</dd></div>

function Library({ ctx }) {
  const [f, setF] = useState('all')
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  const list = BOOKS.filter(x => f === 'all' || (f === 'active' ? ['listening', 'reading'].includes(x.status) : x.status === f))
  return (
    <div className="c2">
      <Top left={<Lockup />} right={<><button className="c2-ic" aria-label="Search"><Icon name="search" /></button><button className="c2-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <p className="c2-label">Now reading</p>
      <div className="c2-stack">
      <span className="c2-peek c2-peek--2" aria-hidden="true" />
      <span className="c2-peek c2-peek--1" aria-hidden="true"><span>{call(BOOKS[(BOOKS.indexOf(b) + 1) % BOOKS.length])}</span></span>
      <article className="c2-card c2-card--hero" key={b.id}>
        <div className="c2-card-head"><span className="c2-call">{call(b)}</span><span className="c2-label">{STATUS[b.status]}</span></div>
        <h1 className="c2-title">{b.title}</h1>
        <p className="c2-by">{b.author}</p>
        <dl className="c2-fields">
          <Field k="Chapter" v={b.chapter ? `${b.chapter} of ${b.chapters}` : '—'} />
          <Field k={isPP ? 'In chapter' : 'In book'} v={`${Math.round(pct)}%`} />
          <Field k="Left" v={isPP ? fmt(CHAPTER_SEC - ctx.t) : `${100 - b.bookPct}%`} />
        </dl>
        <Holes pct={pct} />
        <div className="c2-actions">
          <button className="c2-btn c2-btn--primary" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
          <button className="c2-btn" onClick={() => ctx.go('companion')}>Companion</button>
        </div>
      </article>
      </div>

      <div className="c2-sec"><h2>Your drawer</h2><span className="c2-label">{pad2(BOOKS.length)} cards</span></div>
      <nav className="c2-tabs" aria-label="Filter">
        {FILTERS.map(([id, label]) => <button key={id} className={f === id ? 'is-on' : ''} onClick={() => setF(id)}>{label}</button>)}
      </nav>
      <ol className="c2-drawer">
        {list.map(x => (
          <li key={x.id}>
            <button className={`c2-row${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)} aria-current={x.id === b.id}>
              <span className="c2-call">{call(x)}</span>
              <span className="c2-row-t"><b>{x.title}</b><span>{x.author}</span></span>
              <span className="c2-row-s">{x.status === 'finished' ? 'Returned' : x.status === 'next' ? 'Shelf' : `${x.bookPct}%`}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Companion({ ctx }) {
  const [tab, setTab] = useState('Ask')
  const pp = BOOKS[0]
  return (
    <div className="c2">
      <Top left={<button className="c2-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="c2-label">{call(pp)} · Companion</span>} right={<button className="c2-ic" aria-label="More"><Icon name="more" /></button>} />
      <article className="c2-card">
        <div className="c2-card-head"><span className="c2-call">{call(pp)}</span><span className="c2-label">Reader’s card</span></div>
        <h1 className="c2-title">{pp.title}</h1>
        <p className="c2-by">{pp.author}, 1813</p>
        <div className="c2-seal-row">
          <span className="c2-stamp">Sealed<small>after ch. 1</small></span>
          <p>Lantern only talks about chapter 1. Everything after it stays sealed until you get there.</p>
        </div>
      </article>
      <nav className="c2-tabs c2-tabs--attached" aria-label="Sections">
        {['Ask', 'Notes', 'People', 'Plot'].map(t => <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </nav>
      <div className="c2-sheet">
        {tab === 'Ask' && <>
          <p className="c2-quote">{REFLECTION}</p>
          <div className="c2-thread">
            {CHAT.map((m, i) => (
              <div key={i} className={`c2-msg c2-msg--${m.who}`}>
                <span className="c2-label">{m.who === 'reader' ? 'You asked' : <><FlameMark size={12} /> Lantern</>}</span>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <form className="c2-compose" onSubmit={e => e.preventDefault()}>
            <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
            <button aria-label="Send"><Icon name="send" size={18} /></button>
          </form>
        </>}
        {tab === 'Notes' && NOTES.map((n, i) => <div key={i} className="c2-note"><span className="c2-label">{n.tag}</span><p>{n.text}</p></div>)}
        {tab === 'People' && ['Mr. Bennet', 'Mrs. Bennet', 'Lizzy', 'Mr. Bingley (mentioned)'].map(p => <div key={p} className="c2-note"><span className="c2-label">First seen · ch. 1</span><p>{p}</p></div>)}
        {tab === 'Plot' && <><div className="c2-note"><span className="c2-label">Ch. 1</span><p>Netherfield Park is let at last, and Mrs. Bennet has plans for the new tenant.</p></div><div className="c2-note c2-note--sealed"><span className="c2-label">Ch. 2–61</span><p>Sealed</p></div></>}
      </div>
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="c2 c2--reader">
      <Top left={<button className="c2-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="c2-label">Chapter 1 · {Math.round(pct)}%</span>}
        right={<><button className="c2-ic c2-aa" aria-label="Text settings">Aa</button><button className="c2-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <div className="c2-page">
        <header className="c2-page-head"><span className="c2-call">{call(BOOKS[0])} · I</span><h1>Chapter One</h1></header>
        <article className="c2-prose">
          {PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}
        </article>
      </div>
      <footer className="c2-foot"><Holes pct={pct} n={20} /><span>{fmt(CHAPTER_SEC - ctx.t)} left</span></footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  const [amb, setAmb] = useState('Fireplace')
  return (
    <div className="c2">
      <Top left={<button className="c2-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="c2-label">Listening · Aiden</span>} right={<button className="c2-ic" aria-label="More"><Icon name="more" /></button>} />
      <article className="c2-card c2-card--slip">
        <div className="c2-card-head"><span className="c2-call">{call(BOOKS[0])}</span><span className="c2-label">Chapter 1</span></div>
        <p className="c2-time">{fmt(ctx.t)}</p>
        <p className="c2-by">Pride and Prejudice · {fmt(CHAPTER_SEC - ctx.t)} left</p>
        <div className="c2-scrub">
          <Holes pct={pct} n={24} />
          <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
        </div>
        <div className="c2-dates"><span>0:00</span><span>{fmt(CHAPTER_SEC)}</span></div>
      </article>
      <div className="c2-keys">
        <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
        <button className="c2-key-go" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={28} /></button>
        <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
      </div>
      <div className="c2-opts"><button>1.0×</button><button>Sleep · off</button><button>Chapters</button></div>
      <section className="c2-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <div className="c2-sec"><h2>Loan record</h2><span className="c2-label">Ch. 1</span></div>
      <ol className="c2-loans">
        {[['16 NOV', '9:12 PM', 'Listened 2 min'], ['15 NOV', '10:40 PM', 'Read 4 pages'], ['14 NOV', '8:05 AM', 'Borrowed']].map(([d, h, w], i) => (
          <li key={d}><span className="c2-datestamp" style={{ '--r': `${[-3, 2, -1][i]}deg` }}>{d}</span><span><b>{w}</b><small>{h}</small></span></li>
        ))}
      </ol>
      <div className="c2-sec"><h2>Reading room</h2></div>
      <div className="c2-chips">{AMBIENT.map(a => <button key={a} className={amb === a ? 'is-on' : ''} onClick={() => setAmb(a)}>{a}</button>)}</div>
      <p className="c2-fine">Your companion stays at chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="c2 c2--preview">
      <Lockup />
      <article className="c2-card">
        <div className="c2-card-head"><span className="c2-call">AUS 01</span><span className="c2-label">On loan</span></div>
        <h1 className="c2-title">Pride and Prejudice</h1>
        <Holes pct={64} n={18} />
      </article>
    </div>
  )
}
