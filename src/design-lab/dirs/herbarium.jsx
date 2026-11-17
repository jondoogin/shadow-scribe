/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useState } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT, CHARACTERS } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './herbarium.css'

// Herbarium. Catalogue's archive label meets Field Lab's specimen work: each
// book is a mounted herbarium sheet on faint field-grid paper, with the
// collection label in the corner and a millimetre rule up the edge that
// measures how far you've grown into it. Sealed chapters are "not yet
// collected".

export const meta = {
  id: 'herbarium', name: 'Herbarium', defaultMode: 'light',
  tagline: 'Every book is a mounted specimen sheet',
  signature: 'Collection label in the corner, a measuring rule up the edge, tape strips, chapters you haven’t collected yet',
  research: 'From Catalogue: the archive label with numbered fields and a cabinet you file through. From Field Lab: specimen work, a measuring rule and a grid you barely notice. Herbarium sheets are a real archive format, very legible by design: one object, one label, lots of white space. Spectral for reading and titles, DM Mono for label fields.',
}

const no = (b) => `L.${String(1813 + BOOKS.indexOf(b) * 37).padStart(5, '0')}`
const STATUS = { listening: 'In the press', reading: 'In the press', finished: 'Mounted', next: 'Not yet collected' }

const Lockup = () => <span className="hb-lockup"><FlameMark size={20} /><span>Lantern</span></span>
function Top({ left, right, center }) {
  return <header className="hb-top"><div>{left}</div><div className="hb-top-c">{center}</div><div className="hb-top-r">{right}</div></header>
}
// millimetre rule; fills from the bottom up
function Rule({ pct }) {
  return (
    <div className="hb-rule" role="img" aria-label={`${Math.round(pct)} percent`}>
      <span className="hb-rule-fill" style={{ height: `${pct}%` }} />
      {Array.from({ length: 21 }, (_, i) => <i key={i} className={i % 5 === 0 ? 'is-major' : ''} style={{ bottom: `${i * 5}%` }}>{i % 10 === 0 && <b>{i * 5}</b>}</i>)}
    </div>
  )
}
function Label({ rows, title }) {
  return (
    <dl className="hb-label">
      <p className="hb-label-head"><FlameMark size={14} /> Lantern Herbarium</p>
      {title && <p className="hb-label-title">{title}</p>}
      {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  )
}

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="hb">
      <Top left={<Lockup />} right={<><button className="hb-ic" aria-label="Search"><Icon name="search" /></button><button className="hb-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <article className="hb-sheet" key={b.id}>
        <Rule pct={pct} />
        <div className="hb-sheet-body">
          <span className="hb-tape hb-tape--a" aria-hidden="true" /><span className="hb-tape hb-tape--b" aria-hidden="true" />
          <p className="hb-kicker">{STATUS[b.status]}</p>
          <h1 className="hb-title">{b.title}</h1>
          <p className="hb-by">{b.author}</p>
          <p className="hb-big">{Math.round(pct)}<small>%</small> <span>{isPP ? `of chapter 1 · ${fmt(CHAPTER_SEC - ctx.t)} left` : 'of the book'}</span></p>
          <Label rows={[['Coll. no.', no(b)], ['Chapter', b.chapter ? `${b.chapter} of ${b.chapters}` : '—'], ['Det.', b.author.split(' ').slice(-1)[0]]]} />
        </div>
      </article>
      <div className="hb-actions">
        <button className="hb-btn hb-btn--go" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
        <button className="hb-btn" onClick={() => ctx.go('companion')}>Field notes</button>
      </div>
      <h2 className="hb-h2">The cabinet</h2>
      <ol className="hb-cabinet">
        {BOOKS.map(x => (
          <li key={x.id}>
            <button className={x.id === b.id ? 'is-on' : ''} onClick={() => ctx.setBook(x)}>
              <span className="hb-cab-no">{no(x)}</span>
              <span className="hb-cab-t"><b>{x.title}</b><span>{x.author}</span></span>
              <span className="hb-cab-s">{x.status === 'next' ? 'Not collected' : x.status === 'finished' ? 'Mounted' : `${x.bookPct}%`}</span>
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
    <div className="hb">
      <Top left={<button className="hb-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="hb-top-t">Field notes</span>} right={<button className="hb-ic" aria-label="More"><Icon name="more" /></button>} />
      <header className="hb-head">
        <h1 className="hb-title">{pp.title}</h1>
        <p className="hb-by">{pp.author}, 1813</p>
        <div className="hb-collected" aria-label="Chapter 1 collected. Chapters 2 to 61 not yet collected.">
          <span className="is-on">1</span>
          {Array.from({ length: 11 }, (_, i) => <span key={i}>{i + 2}</span>)}
          <em>…61</em>
        </div>
        <p className="hb-safe">Only chapter 1 is collected. Lantern won’t describe anything you haven’t found yet.</p>
      </header>
      <nav className="hb-tabs" aria-label="Sections">
        {['Ask', 'Notes', 'People', 'Plot'].map(t => <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </nav>
      {tab === 'Ask' && <>
        <p className="hb-pull">{REFLECTION}</p>
        <div className="hb-chat">
          {CHAT.map((m, i) => (
            <div key={i} className={`hb-msg hb-msg--${m.who}`}>
              <span className="hb-who">{m.who === 'reader' ? 'Query' : <><FlameMark size={12} /> Lantern</>}</span>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <form className="hb-compose" onSubmit={e => e.preventDefault()}>
          <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
          <button aria-label="Send"><Icon name="send" size={18} /></button>
        </form>
      </>}
      {tab === 'Notes' && NOTES.map((n, i) => <div key={i} className="hb-slip"><span className="hb-mono">Annotation {pad2(i + 1)} · {n.tag}</span><p>{n.text}</p></div>)}
      {tab === 'People' && CHARACTERS.map((c, i) => <div key={c} className="hb-slip"><span className="hb-mono">Specimen {pad2(i + 1)} · ch. 1</span><p>{c}</p></div>)}
      {tab === 'Plot' && <>
        <div className="hb-slip"><span className="hb-mono">Chapter 1</span><p>Netherfield Park is let at last, and Mrs. Bennet has plans for the new tenant.</p></div>
        <div className="hb-slip hb-slip--empty"><span className="hb-mono">Chapters 2–61</span><p>Not yet collected</p></div>
      </>}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="hb hb--reader">
      <Top left={<button className="hb-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="hb-top-t">Chapter 1 · {Math.round(pct)}%</span>}
        right={<><button className="hb-ic hb-aa" aria-label="Text settings">Aa</button><button className="hb-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <article className="hb-page">
        <header className="hb-page-head"><span className="hb-mono">{no(BOOKS[0])} · Pride and Prejudice</span><h1>Chapter I</h1></header>
        <div className="hb-prose">{PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}</div>
      </article>
      <footer className="hb-foot"><span className="hb-foot-bar"><i style={{ width: `${pct}%` }} /></span><span>{fmt(CHAPTER_SEC - ctx.t)} left</span></footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  const [amb, setAmb] = useState('Fireplace')
  return (
    <div className="hb">
      <Top left={<button className="hb-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="hb-top-t">Read by Aiden</span>} right={<button className="hb-ic" aria-label="More"><Icon name="more" /></button>} />
      <article className="hb-sheet hb-sheet--player">
        <Rule pct={pct} />
        <div className="hb-sheet-body">
          <p className="hb-kicker">Pride and Prejudice · Chapter 1</p>
          <p className="hb-clock">{fmt(ctx.t)}</p>
          <p className="hb-by">{fmt(CHAPTER_SEC - ctx.t)} left of {fmt(CHAPTER_SEC)}</p>
          <div className="hb-scrub">
            <span className="hb-foot-bar"><i style={{ width: `${pct}%` }} /></span>
            <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
          </div>
          <div className="hb-keys">
            <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}><Icon name="rew" size={22} /></button>
            <button className="hb-key-go" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={30} /></button>
            <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}><Icon name="fwd" size={22} /></button>
          </div>
        </div>
      </article>
      <section className="hb-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <h2 className="hb-h2">Ambience</h2>
      <div className="hb-amb">{AMBIENT.map(a => <button key={a} className={amb === a ? 'is-on' : ''} onClick={() => setAmb(a)}>{a}</button>)}</div>
      <p className="hb-fine">Your companion stays at chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="hb hb--preview">
      <article className="hb-sheet">
        <Rule pct={64} />
        <div className="hb-sheet-body">
          <span className="hb-tape hb-tape--a" aria-hidden="true" />
          <p className="hb-title">Pride and Prejudice</p>
          <Label rows={[['Coll. no.', 'L.01813'], ['Chapter', '1 of 61']]} />
        </div>
      </article>
    </div>
  )
}
