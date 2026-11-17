/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useState } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT, CHARACTERS } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import './catalogue.css'

// Catalogue III. The index card is the core object. Every colour, including
// the Lantern mark, comes from one accent and one paper tone, so the style
// tweaker can retheme the whole thing. Lantern details: progress is a row of
// holes punched like a pierced-tin lantern (lit holes glow faintly), the
// card says "Lit" while Lantern reads, Listen keeps a lamp log, and the sleep
// timer is a wick that burns down.

export const meta = {
  id: 'catalogue', name: 'Catalogue III', defaultMode: 'light',
  tagline: 'The card catalogue, lit from inside',
  signature: 'Pierced-tin progress, a drawer you can see into, tabs set into the card, a mark that takes the theme colour',
  research: 'Round nine refines it from your notes: smaller holes, softer contrast between paper and ink, tabs that belong to their card, lantern details (pierced-tin progress, a lit status, a lamp log, a wick timer), and a Lantern mark that takes its colours from the accent. Tap Tune to change colour, type, shape and details.',
}

// The style tweaker reads this schema. `attr` tweaks become data attributes
// on the page; the rest become CSS variables through tweakVars().
export const tweaks = [
  { group: 'Colour', items: [
    { id: 'accent', label: 'Accent', type: 'swatch', default: '#236D86', options: [
      ['Deep teal', '#236D86'], ['Ember', '#C2512E'], ['Lamp oil', '#B7791F'], ['Brass', '#8F7536'], ['Ink blue', '#33598F'], ['Moss', '#4E7440'], ['Oxblood', '#8C2F2B'],
    ] },
    { id: 'paper', label: 'Paper', type: 'choice', default: 'stone', options: [['Linen', 'linen'], ['Bone', 'bone'], ['Stone', 'stone']] },
    { id: 'contrast', label: 'Contrast', type: 'range', min: 0, max: 100, default: 25, ends: ['Soft', 'Crisp'] },
    { id: 'warm', label: 'Lamplight', type: 'range', min: 0, max: 100, default: 20, ends: ['Daylight', 'Warm'] },
  ] },
  { group: 'Type', items: [
    { id: 'title', label: 'Titles', type: 'choice', default: 'literata', options: [['Caslon', 'caslon'], ['Young', 'young'], ['Literata', 'literata']] },
    { id: 'label', label: 'Labels', type: 'choice', default: 'spline', options: [['Plex', 'plex'], ['DM', 'dm'], ['Spline', 'spline']] },
    { id: 'body', label: 'Text size', type: 'range', min: 16, max: 22, default: 18, unit: 'px' },
  ] },
  { group: 'Shape', items: [
    { id: 'radius', label: 'Corners', type: 'range', min: 0, max: 16, default: 6, unit: 'px' },
    { id: 'shadow', label: 'Cards', type: 'choice', default: 'soft', options: [['Flat', 'flat'], ['Soft', 'soft'], ['Lifted', 'lifted']] },
    { id: 'density', label: 'Spacing', type: 'choice', default: 'comfy', attr: true, options: [['Compact', 'compact'], ['Comfy', 'comfy'], ['Roomy', 'roomy']] },
  ] },
  { group: 'Details', items: [
    { id: 'progress', label: 'Progress', type: 'choice', default: 'bar', attr: true, options: [['Pierced', 'holes'], ['Bar', 'bar'], ['Ticks', 'ticks']] },
    { id: 'hole', label: 'Hole size', type: 'range', min: 4, max: 12, default: 9, unit: 'px' },
    { id: 'tabs', label: 'Tabs', type: 'choice', default: 'guide', attr: true, options: [['Line', 'line'], ['Inset', 'inset'], ['Guide', 'guide']] },
    { id: 'glow', label: 'Lit holes glow', type: 'toggle', default: true, attr: true },
    { id: 'peek', label: 'Drawer cards', type: 'toggle', default: false, attr: true },
    { id: 'motion', label: 'Motion', type: 'toggle', default: true, attr: true },
  ] },
]

const PAPER = {
  linen: ['#EEE9DF', '#171512'], bone: ['#F3F0E9', '#151514'], stone: ['#E8E8E3', '#131515'],
}
const FONTS = {
  caslon: '"Libre Caslon Text", Georgia, serif', young: '"Young Serif", Georgia, serif', literata: '"Literata", Georgia, serif',
  plex: '"IBM Plex Mono", ui-monospace, monospace', dm: '"DM Mono", ui-monospace, monospace', spline: '"Spline Sans Mono", ui-monospace, monospace',
}
const SHADOW = {
  flat: '0 0 0 1px var(--line)',
  soft: '0 0 0 1px var(--line), 0 10px 22px -18px rgba(40,25,10,.35)',
  lifted: '0 0 0 1px var(--line), 0 2px 3px rgba(40,25,10,.06), 0 18px 34px -18px rgba(40,25,10,.45)',
}
export function tweakVars(v, mode) {
  const dark = mode === 'dark'
  return {
    '--accent': v.accent, '--paper': PAPER[v.paper]?.[dark ? 1 : 0], '--k': v.contrast, '--warm': v.warm,
    '--title': FONTS[v.title], '--mono': FONTS[v.label], '--body': `${v.body}px`,
    '--r': `${v.radius}px`, '--shadow': SHADOW[v.shadow], '--hole': `${v.hole}px`,
  }
}

const STATUS = { listening: 'On loan · listening', reading: 'On loan · reading', finished: 'Returned', next: 'On the shelf' }
const call = (b) => `${b.author.split(' ').slice(-1)[0].slice(0, 3).toUpperCase()} ${pad2(BOOKS.indexOf(b) + 1)}`
const FILTERS = [['all', 'All'], ['active', 'On loan'], ['finished', 'Returned'], ['next', 'Shelf']]

// The Lantern mark (four squares in a diamond), coloured from the accent.
const PANES = { t: [50, 21], l: [21, 50], r: [79, 50], b: [50, 79] }
export function Mark({ size = 22, live = false }) {
  return (
    <svg className={`c3-mark${live ? ' is-live' : ''}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {Object.entries(PANES).map(([k, [x, y]]) => (
        <rect key={k} className={`c3-pane c3-pane--${k}`} x={x - 17} y={y - 17} width="34" height="34" rx="8.5" transform={`rotate(45 ${x} ${y})`} />
      ))}
    </svg>
  )
}
export const Holes = ({ pct, n = 24 }) => {
  const lit = Math.round((pct / 100) * n)
  return (
    <div className="c2-holes" role="img" aria-label={`${Math.round(pct)} percent`} style={{ '--pct': `${pct}%` }}>
      {Array.from({ length: n }, (_, i) => <i key={i} className={i < lit ? 'is-on' : ''} />)}
    </div>
  )
}
const Lockup = () => <span className="c2-lockup"><Mark size={22} /><span>Lantern</span></span>
function Top({ left, right, center }) {
  return <header className="c2-top"><div>{left}</div><div className="c2-top-c">{center}</div><div className="c2-top-r">{right}</div></header>
}
const Field = ({ k, v }) => <div className="c2-field"><dt>{k}</dt><dd>{v}</dd></div>
function Tabs({ items, value, onChange, label }) {
  return (
    <nav className="c3-tabs" aria-label={label}>
      {items.map(([id, text]) => <button key={id} className={value === id ? 'is-on' : ''} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}
    </nav>
  )
}

function Library({ ctx }) {
  const [f, setF] = useState('all')
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  const lit = isPP && ctx.playing
  const list = BOOKS.filter(x => f === 'all' || (f === 'active' ? ['listening', 'reading'].includes(x.status) : x.status === f))
  return (
    <div className="c2">
      <Top left={<Lockup />} right={<><button className="c2-ic" aria-label="Search"><Icon name="search" /></button><button className="c2-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <p className="c2-label">Now reading</p>
      <div className="c2-stack">
        <span className="c2-peek c2-peek--2" aria-hidden="true" />
        <span className="c2-peek c2-peek--1" aria-hidden="true"><span>{call(BOOKS[(BOOKS.indexOf(b) + 1) % BOOKS.length])}</span></span>
        <article className="c2-card c2-card--hero" key={b.id}>
          <div className="c2-card-head">
            <span className="c2-call">{call(b)}</span>
            <span className={`c2-label${lit ? ' c3-lit' : ''}`}>{lit ? <><Mark size={14} live /> Lit · listening</> : STATUS[b.status]}</span>
          </div>
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

      <section className="c3-box">
        <header className="c3-box-head"><h2>Your drawer</h2><span className="c2-label">{pad2(list.length)} of {pad2(BOOKS.length)} cards</span></header>
        <Tabs label="Filter" items={FILTERS} value={f} onChange={setF} />
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
      </section>
      <p className="c2-fine">Lit by lamplight for 4 h 12 m this week.</p>
    </div>
  )
}

function Companion({ ctx }) {
  const [tab, setTab] = useState('ask')
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
          <p>The lamp only reaches chapter 1. Everything after it stays sealed until you get there.</p>
        </div>
      </article>
      <section className="c3-box">
        <Tabs label="Sections" items={[['ask', 'Ask'], ['notes', 'Notes'], ['people', 'People'], ['plot', 'Plot']]} value={tab} onChange={setTab} />
        <div className="c2-sheet">
          {tab === 'ask' && <>
            <p className="c2-quote">{REFLECTION}</p>
            <div className="c2-thread">
              {CHAT.map((m, i) => (
                <div key={i} className={`c2-msg c2-msg--${m.who}`}>
                  <span className="c2-label">{m.who === 'reader' ? 'You asked' : <><Mark size={13} /> Lantern</>}</span>
                  <p>{m.text}</p>
                </div>
              ))}
            </div>
            <form className="c2-compose" onSubmit={e => e.preventDefault()}>
              <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
              <button aria-label="Send"><Icon name="send" size={18} /></button>
            </form>
          </>}
          {tab === 'notes' && NOTES.map((n, i) => <div key={i} className="c2-note"><span className="c2-label">{n.tag}</span><p>{n.text}</p></div>)}
          {tab === 'people' && CHARACTERS.map(p => <div key={p} className="c2-note"><span className="c2-label">First seen · ch. 1</span><p>{p}</p></div>)}
          {tab === 'plot' && <><div className="c2-note"><span className="c2-label">Ch. 1</span><p>Netherfield Park is let at last, and Mrs. Bennet has plans for the new tenant.</p></div><div className="c2-note c2-note--sealed"><span className="c2-label">Ch. 2–61</span><p>Sealed</p></div></>}
        </div>
      </section>
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

const WICKS = [0, 15, 30, 45]
function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  const [amb, setAmb] = useState('Fireplace')
  const [wick, setWick] = useState(30)
  return (
    <div className="c2">
      <Top left={<button className="c2-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="c2-label">Listening · Aiden</span>} right={<button className="c2-ic" aria-label="More"><Icon name="more" /></button>} />
      <article className="c2-card c2-card--slip">
        <div className="c2-card-head"><span className="c2-call">{call(BOOKS[0])}</span><span className={`c2-label${ctx.playing ? ' c3-lit' : ''}`}>{ctx.playing ? <><Mark size={14} live /> Lit</> : 'Chapter 1'}</span></div>
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

      <section className="c3-wick" aria-label="Sleep timer">
        <div className="c3-wick-head"><span className="c2-label">Wick</span><span className="c3-wick-v">{wick ? `${wick} min` : 'Off'}</span></div>
        <div className="c3-wick-bar"><i style={{ width: `${(wick / 45) * 100}%` }}><Mark size={16} live={ctx.playing && wick > 0} /></i></div>
        <div className="c3-wick-opts">{WICKS.map(w => <button key={w} className={wick === w ? 'is-on' : ''} onClick={() => setWick(w)}>{w ? `${w}m` : 'Off'}</button>)}</div>
      </section>

      <section className="c2-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <div className="c2-sec"><h2>Lamp log</h2><span className="c2-label">Ch. 1</span></div>
      <ol className="c2-loans">
        {[['16 NOV', '9:12 PM', 'Lit 2 min · listened'], ['15 NOV', '10:40 PM', 'Lit 14 min · read 4 pages'], ['14 NOV', '8:05 AM', 'Borrowed']].map(([d, h, w], i) => (
          <li key={d}><span className="c2-datestamp" style={{ '--rot': `${[-3, 2, -1][i]}deg` }}>{d}</span><span><b>{w}</b><small>{h}</small></span></li>
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
        <Holes pct={64} n={20} />
      </article>
    </div>
  )
}
