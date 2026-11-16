/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark, Lockup, Cover } from '../brand.jsx'
import './kiln.css'

// C · Kiln — a maker's workshop where heat is the colour system. Progress
// glows through real fire colours (dull red, orange, yellow, white). Chapters
// are pyrometric cones that slump once they've been fired.

export const meta = {
  id: 'kiln', name: 'Kiln', defaultMode: 'light',
  tagline: 'The workshop, where reading turns up the heat',
  signature: 'Fire-colour progress and pyrometric cones for chapters',
  research: 'Specimen’s stamps and labels in a ceramicist’s studio: bisque-white surfaces, a heavy condensed lowercase wordmark, and progress coloured by real kiln temperatures instead of a brand gradient. Cones are the old maker’s tool for proving a firing actually happened.',
}

// Colour of fire at a given progress (0..1), from dull red to white-yellow.
const FIRE = [[0, [122, 36, 18]], [0.35, [204, 66, 20]], [0.65, [242, 128, 32]], [0.85, [252, 190, 70]], [1, [255, 238, 190]]]
function fire(p) {
  const i = Math.max(0, FIRE.findIndex(([s]) => s >= p) - 1)
  const [s0, c0] = FIRE[i]; const [s1, c1] = FIRE[Math.min(i + 1, FIRE.length - 1)]
  const f = s1 === s0 ? 0 : (p - s0) / (s1 - s0)
  return `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * f)).join(',')})`
}
const tempC = (p) => Math.round(600 + p * 680).toLocaleString('en-US')

function Cones({ total, fired, current }) {
  const n = Math.min(total, 12)
  return (
    <div className="kn-cones" aria-label={`${fired} of ${total} chapters fired`}>
      {Array.from({ length: n }, (_, i) => {
        const state = i < fired ? 'fired' : i === fired && current ? 'firing' : 'raw'
        return (
          <svg key={i} viewBox="0 0 14 30" className={`kn-cone kn-cone--${state}`} aria-hidden="true">
            {state === 'fired' ? <path d="M2 30 L5 12 Q7 6 13 8 Q9 12 9 30 Z" /> : <path d="M2 30 L7 2 L12 30 Z" />}
          </svg>
        )
      })}
      {total > n && <span className="kn-mono kn-dim">+{total - n} sealed</span>}
    </div>
  )
}

function Heat({ value }) {
  return (
    <div className="kn-heat" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <span className="kn-heat-fill" style={{ width: `${value}%` }} />
      <span className="kn-heat-tip" style={{ left: `${value}%`, background: fire(value / 100) }} />
    </div>
  )
}

function Top({ left, right, center }) {
  return <header className="kn-top"><div>{left}</div><div className="kn-top-c">{center}</div><div className="kn-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const pct = b.id === 'pp' ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="kn">
      <Top left={<Lockup kind="kiln" size={22} />} right={<><button className="kn-ic" aria-label="Search"><Icon name="search" /></button><button className="kn-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />

      <section className="kn-firing">
        <div className="kn-firing-top">
          <span className="kn-mono">Firing now</span>
          <span className="kn-mono">{b.id === 'pp' ? 'Ch. 01' : b.chapter ? `Ch. ${pad2(b.chapter)}` : 'Cold'}</span>
        </div>
        <div className="kn-firing-main">
          <Cover book={b} size="lg" />
          <div className="kn-firing-read">
            <span className="kn-temp" style={{ '--fire': fire(pct / 100) }}>{tempC(pct / 100)}<small>°C</small></span>
            <span className="kn-mono kn-firing-sub">{Math.round(pct)}% through {b.id === 'pp' ? 'the chapter' : 'the book'}</span>
          </div>
        </div>
        <h2 className="kn-h2">{b.title}</h2>
        <p className="kn-sub">{b.author}</p>
        <Heat value={pct} />
        <Cones total={b.chapters} fired={b.id === 'pp' ? 0 : b.chapter - 1} current={b.status !== 'finished' && b.status !== 'next'} />
        <div className="kn-actions">
          <button className="kn-btn kn-btn--fire" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Stoke</button>
          <button className="kn-btn" onClick={() => ctx.go('companion')}>Studio notes</button>
        </div>
      </section>

      <div className="kn-section"><h3 className="kn-h3">The shelf</h3><span className="kn-mono kn-dim">{pad2(BOOKS.length)} pieces</span></div>
      <ol className="kn-grid">
        {BOOKS.map(x => (
          <li key={x.id}>
            <button className={`kn-piece${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
              <Cover book={x} size="md" />
              <span className="kn-piece-title">{x.title}</span>
              <span className="kn-piece-meta">
                <i style={{ background: x.bookPct ? fire(x.bookPct / 100) : 'transparent' }} />
                {x.status === 'finished' ? 'Fired' : x.status === 'next' ? 'Raw clay' : `${x.bookPct || 1}%`}
              </span>
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
    <div className="kn">
      <Top left={<button className="kn-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="kn-mono kn-dim">Studio notes</span>} right={<button className="kn-ic" aria-label="More"><Icon name="more" /></button>} />
      <section className="kn-bookhead">
        <Cover book={pp} size="md" />
        <div>
          <h1 className="kn-h2">{pp.title}</h1>
          <p className="kn-sub">{pp.author}, 1813</p>
          <span className="kn-stamp"><FlameMark size={16} tone="ink" />Unfired past Ch. 01</span>
        </div>
      </section>
      <Cones total={61} fired={0} current />
      <nav className="kn-tabs" aria-label="Sections">
        {['Notes', 'People', 'Plot', 'Questions', 'Discussion'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
      </nav>

      <article className="kn-card">
        <span className="kn-mono">Chapter 1 · what’s taking shape</span>
        <p className="kn-quote">{REFLECTION}</p>
      </article>

      <div className="kn-log" aria-label="Conversation">
        {CHAT.map((m, i) => (
          <div key={i} className={`kn-msg kn-msg--${m.who}`}>
            {m.who === 'companion' && <span className="kn-msg-mark"><FlameMark size={18} /></span>}
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <form className="kn-compose" onSubmit={e => e.preventDefault()}>
        <input placeholder="Ask about Chapter 1…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
      <p className="kn-mono kn-dim kn-fine">Lantern only refers to pages you’ve reached.</p>

      <div className="kn-section"><h3 className="kn-h3">Your notes</h3><span className="kn-mono kn-dim">{pad2(NOTES.length)}</span></div>
      {NOTES.map((n, i) => <div key={i} className="kn-note"><span className="kn-mono kn-note-tag">{n.tag}</span><p>{n.text}</p></div>)}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="kn kn--reader">
      <div className="kn-reader-heat" style={{ width: `${pct}%` }} aria-hidden="true" />
      <Top left={<button className="kn-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="kn-mono kn-dim">Pride and Prejudice</span>}
        right={<><button className="kn-ic kn-aa" aria-label="Text settings">Aa</button><button className="kn-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="kn-chap">
        <span className="kn-chap-num">1</span>
        <span className="kn-mono kn-dim">Chapter one</span>
      </header>
      <article className="kn-prose">
        {PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}
      </article>
      <footer className="kn-foot">
        <span className="kn-mono">{fmt(CHAPTER_SEC - ctx.t)} left in chapter</span>
        <span className="kn-mono" style={{ color: fire(pct / 100) }}>{tempC(pct / 100)}°</span>
      </footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="kn">
      <Top left={<button className="kn-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="kn-mono kn-dim">Listening</span>} right={<button className="kn-ic" aria-label="More"><Icon name="more" /></button>} />
      <div className={`kn-spy${ctx.playing ? ' is-on' : ''}`} style={{ '--fire': fire(pct / 100) }}>
        <span className="kn-spy-ring" /><span className="kn-spy-ring" /><span className="kn-spy-ring" />
        <span className="kn-spy-core"><FlameMark size={96} live={ctx.playing} className={ctx.playing ? 'lx-flame--fast' : ''} /></span>
      </div>
      <h1 className="kn-h1 kn-center">Chapter 1</h1>
      <p className="kn-sub kn-center">Pride and Prejudice · read by Aiden</p>

      <div className="kn-scrub">
        <Heat value={pct} />
        <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
      </div>
      <div className="kn-times"><span className="kn-mono">{fmt(ctx.t)}</span><span className="kn-mono" style={{ color: fire(pct / 100) }}>{tempC(pct / 100)}°C</span><span className="kn-mono kn-dim">−{fmt(CHAPTER_SEC - ctx.t)}</span></div>

      <div className="kn-transport">
        <button className="kn-skip" aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
        <button className="kn-play" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={30} /></button>
        <button className="kn-skip" aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
      </div>
      <div className="kn-settings"><span>1.0×</span><span>Aiden</span><span>Sleep: chapter end</span></div>

      <section className="kn-card kn-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>

      <div className="kn-section"><h3 className="kn-h3">Room</h3></div>
      <div className="kn-chips">{AMBIENT.map((a, i) => <button key={a} className={i === 2 ? 'is-on' : ''}>{a}</button>)}</div>
      <p className="kn-mono kn-dim kn-fine">Your companion stays at Chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="kn kn--preview">
      <Lockup kind="kiln" size={26} />
      <span className="kn-temp" style={{ '--fire': fire(0.64) }}>1,035<small>°C</small></span>
      <Heat value={64} />
      <Cones total={61} fired={0} current />
    </div>
  )
}
