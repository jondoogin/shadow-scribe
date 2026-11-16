/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark, Lockup, Cover } from '../brand.jsx'
import './patent.css'

// D · Patent — Lantern drawn as an invention. Every screen is a numbered
// sheet; parts carry reference numerals; progress is a dimension line.
// Light mode is the ink drawing, dark mode is the cyanotype print.

export const meta = {
  id: 'patent', name: 'Patent', defaultMode: 'light',
  tagline: 'Lantern, drawn up as an invention',
  signature: 'Reference numerals and dimension-line progress on numbered sheets',
  research: 'Specimen’s precision taken to the inventor’s drawing board: patent-sheet frames, reference numerals, dimension lines and figure captions in an old-style serif. Dark mode is a cyanotype blueprint, so the night theme has a reason to be blue rather than grey.',
}

function Dim({ value, label }) {
  return (
    <div className="pt-dim" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <span className="pt-dim-line" />
      <span className="pt-dim-done" style={{ width: `${value}%` }}><b>{Math.round(value)}%</b></span>
      <span className="pt-dim-cut" style={{ left: `${value}%` }} />
    </div>
  )
}
const Ref = ({ n }) => <span className="pt-ref" aria-hidden="true">{n}</span>

function Sheet({ n, children, cls = '' }) {
  return (
    <div className={`pt ${cls}`}>
      <div className="pt-sheet">
        <span className="pt-sheet-no">Sheet {n} of 4</span>
        {children}
      </div>
    </div>
  )
}
function Top({ left, right, center }) {
  return <header className="pt-top"><div>{left}</div><div className="pt-top-c">{center}</div><div className="pt-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const pct = b.id === 'pp' ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <Sheet n={1}>
      <Top left={<Lockup kind="patent" size={17} />} right={<><button className="pt-ic" aria-label="Search"><Icon name="search" /></button><button className="pt-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <h1 className="pt-h1">Apparatus for reading by lamplight</h1>
      <p className="pt-cap">Fig. 1 — the volume presently in use.</p>

      <section className="pt-fig">
        <div className="pt-fig-obj">
          <button onClick={() => ctx.go(b.id === 'pp' ? 'listen' : 'companion')} aria-label={`Open ${b.title}`}><Cover book={b} size="lg" /></button>
          <Ref n="10" />
        </div>
        <ol className="pt-legend">
          <li><Ref n="10" /><span><b>{b.title}</b>, {b.author}</span></li>
          <li><Ref n="12" /><span>Position: {b.chapter ? `chapter ${b.chapter} of ${b.chapters}` : 'not begun'}</span></li>
          <li><Ref n="14" /><span>Remaining: {b.minutesLeft ? `${b.minutesLeft} min in chapter` : `${100 - b.bookPct}% of volume`}</span></li>
        </ol>
        <div className="pt-fig-dim"><Ref n="12" /><Dim value={pct} label="Progress" /></div>
        <div className="pt-actions">
          <button className="pt-btn pt-btn--ink" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume<Ref n="16" /></button>
          <button className="pt-btn" onClick={() => ctx.go('companion')}>Notes<Ref n="18" /></button>
        </div>
      </section>

      <div className="pt-section"><span>Schedule of volumes</span><span className="pt-dimtxt">{pad2(BOOKS.length)}</span></div>
      <ol className="pt-table">
        {BOOKS.map((x, i) => (
          <li key={x.id}>
            <button className={`pt-row${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
              <span className="pt-row-no">{20 + i * 2}</span>
              <span className="pt-row-text"><span className="pt-row-title">{x.title}</span><span className="pt-row-meta">{x.author}</span></span>
              <span className="pt-row-stat">{x.status === 'finished' ? 'complete' : x.status === 'next' ? '—' : `${x.bookPct || 1}%`}</span>
            </button>
          </li>
        ))}
      </ol>
    </Sheet>
  )
}

function Companion({ ctx }) {
  const pp = BOOKS[0]
  return (
    <Sheet n={2}>
      <Top left={<button className="pt-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="pt-dimtxt">Fig. 2 — companion</span>} right={<button className="pt-ic" aria-label="More"><Icon name="more" /></button>} />
      <section className="pt-bookhead">
        <Cover book={pp} size="md" />
        <div>
          <h1 className="pt-h2">{pp.title}</h1>
          <p className="pt-cap">{pp.author}, 1813</p>
          <span className="pt-seal"><FlameMark size={14} tone="ink" /> Withheld beyond chapter 1</span>
        </div>
      </section>
      <nav className="pt-tabs" aria-label="Sections">
        {['Notes', 'People', 'Plot', 'Questions', 'Discussion'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
      </nav>
      <article className="pt-claim">
        <span className="pt-dimtxt">Observation 1</span>
        <p>{REFLECTION}</p>
      </article>
      <div className="pt-log" aria-label="Conversation">
        {CHAT.map((m, i) => (
          <div key={i} className={`pt-entry pt-entry--${m.who}`}>
            <span className="pt-entry-who">{m.who === 'reader' ? 'You' : <><FlameMark size={12} /> Lantern</>}</span>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <form className="pt-compose" onSubmit={e => e.preventDefault()}>
        <input placeholder="Ask about chapter 1…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
      <p className="pt-dimtxt pt-fine">Lantern only refers to pages you’ve reached.</p>
      <div className="pt-section"><span>Annotations</span><span className="pt-dimtxt">{pad2(NOTES.length)}</span></div>
      {NOTES.map((n, i) => <div key={i} className="pt-note"><span className="pt-dimtxt pt-note-tag">{n.tag}</span><p>{n.text}</p></div>)}
    </Sheet>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <Sheet n={3} cls="pt--reader">
      <Top left={<button className="pt-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="pt-dimtxt">Pride and Prejudice</span>}
        right={<><button className="pt-ic pt-aa" aria-label="Text settings">Aa</button><button className="pt-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="pt-chap"><span className="pt-dimtxt">Chapter</span><span className="pt-chap-num">I.</span></header>
      <article className="pt-prose">
        {PASSAGE.map((p, i) => (
          <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}><span className="pt-ln" aria-hidden="true">{(i + 1) * 5}</span>{p}</p>
        ))}
      </article>
      <footer className="pt-foot">
        <span className="pt-dimtxt">Ch. 1 · {fmt(CHAPTER_SEC - ctx.t)} left</span>
        <Dim value={pct} label="Chapter progress" />
      </footer>
    </Sheet>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  const a = (pct / 100) * 360
  return (
    <Sheet n={4}>
      <Top left={<button className="pt-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="pt-dimtxt">Fig. 4 — reading aloud</span>} right={<button className="pt-ic" aria-label="More"><Icon name="more" /></button>} />
      <figure className="pt-lamp">
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <circle cx="120" cy="120" r="104" className="pt-lamp-ring" />
          <circle cx="120" cy="120" r="88" className="pt-lamp-ring pt-lamp-ring--thin" />
          {Array.from({ length: 72 }, (_, i) => {
            const d = (i * 5 * Math.PI) / 180; const r1 = i % 6 === 0 ? 96 : 100
            return <line key={i} x1={120 + r1 * Math.sin(d)} y1={120 - r1 * Math.cos(d)} x2={120 + 104 * Math.sin(d)} y2={120 - 104 * Math.cos(d)} className="pt-lamp-tick" />
          })}
          <path d={`M120 120 L120 16 A104 104 0 ${a > 180 ? 1 : 0} 1 ${120 + 104 * Math.sin((a * Math.PI) / 180)} ${120 - 104 * Math.cos((a * Math.PI) / 180)} Z`} className="pt-lamp-sweep" />
          <line x1="120" y1="120" x2={120 + 118 * Math.sin((a * Math.PI) / 180)} y2={120 - 118 * Math.cos((a * Math.PI) / 180)} className="pt-lamp-hand" />
        </svg>
        <span className="pt-lamp-mark"><FlameMark size={72} live={ctx.playing} className={ctx.playing ? 'lx-flame--fast' : ''} /></span>
        <span className="pt-lamp-ref"><Ref n="40" /></span>
        <figcaption className="pt-cap">Fig. 4 — chapter 1, read aloud by Aiden. Hand (42) shows the position.</figcaption>
      </figure>
      <div className="pt-clock"><span>{fmt(ctx.t)}</span><span className="pt-dimtxt">of {fmt(CHAPTER_SEC)}</span></div>
      <div className="pt-scrub"><Dim value={pct} label="Position" /><input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" /></div>
      <div className="pt-transport">
        <button className="pt-key" aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
        <button className="pt-key pt-key--main" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={22} /> {ctx.playing ? 'Pause' : 'Play'}</button>
        <button className="pt-key" aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
      </div>
      <ol className="pt-legend pt-legend--row">
        <li><Ref n="44" /><span>1.0×</span></li><li><Ref n="46" /><span>Aiden</span></li><li><Ref n="48" /><span>Sleep: end of ch.</span></li>
      </ol>
      <section className="pt-claim pt-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <div className="pt-section"><span>Ambient attachment</span></div>
      <ul className="pt-checks">{AMBIENT.map((x, i) => <li key={x}><button className={i === 2 ? 'is-on' : ''}><span className="pt-box" aria-hidden="true" />{x}</button></li>)}</ul>
      <p className="pt-dimtxt pt-fine">Your companion stays at chapter 1 until you move it.</p>
    </Sheet>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="pt pt--preview">
      <div className="pt-sheet">
        <Lockup kind="patent" size={22} />
        <p className="pt-cap" style={{ margin: '14px 0 12px' }}>Fig. 1 — the volume presently in use.</p>
        <div className="pt-fig-dim"><Ref n="12" /><Dim value={64} label="Progress" /></div>
      </div>
    </div>
  )
}
