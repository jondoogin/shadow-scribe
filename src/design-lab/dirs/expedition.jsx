/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark, Lockup, Cover } from '../brand.jsx'
import './expedition.css'

// B · Expedition — the field journal of a long walk. Topographic paper, a
// trail that only shows what you've walked (the rest is uncharted, so it can't
// spoil anything), and a campfire at the end of every chapter.

export const meta = {
  id: 'expedition', name: 'Expedition', defaultMode: 'light',
  tagline: 'Every book is a route, every chapter a camp',
  signature: 'A trail map that stays uncharted past where you are',
  research: 'Specimen’s labels move into an explorer’s field journal: contour-line paper, typewritten log entries and a route card. Spoiler protection becomes part of the metaphor, because the map past your camp is literally blank. Dark mode is a night camp.',
}

// Waypoints along a hand-drawn trail, in a 340×150 box.
const TRAIL = [[18, 118], [62, 96], [96, 112], [138, 78], [176, 92], [214, 54], [252, 70], [292, 36], [326, 28]]
const trailPath = TRAIL.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')

function RouteMap({ reached = 1, frac = 0.64 }) {
  // reached = waypoints walked (chapter number); frac = progress to the next camp
  const [x0, y0] = TRAIL[reached - 1]; const [x1, y1] = TRAIL[reached]
  const here = [x0 + (x1 - x0) * frac, y0 + (y1 - y0) * frac]
  const walked = TRAIL.slice(0, reached).map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + ` L${here[0]} ${here[1]}`
  return (
    <svg className="ex-map" viewBox="0 0 340 150" role="img" aria-label={`Chapter ${reached}, ${Math.round(frac * 100)}% of the way to the next camp. The route ahead is uncharted.`}>
      <defs>
        <pattern id="ex-fog" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" className="ex-fog-line" /></pattern>
        <linearGradient id="ex-fade" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".25" stopColor="#fff" stopOpacity="1" /></linearGradient>
        <mask id="ex-fogmask"><rect x={here[0] + 6} y="0" width={340 - here[0]} height="150" fill="url(#ex-fade)" /></mask>
      </defs>
      {[30, 52, 74].map(r => <ellipse key={r} cx="230" cy="70" rx={r * 1.5} ry={r} className="ex-contour" />)}
      {[22, 40].map(r => <ellipse key={r} cx="70" cy="120" rx={r * 1.8} ry={r} className="ex-contour" />)}
      <path d={trailPath} className="ex-trail-ahead" />
      <path d={walked} className="ex-trail" />
      <rect x="0" y="0" width="340" height="150" fill="url(#ex-fog)" mask="url(#ex-fogmask)" className="ex-fog" />
      {TRAIL.slice(0, reached).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" className="ex-camp" />)}
      <text x={TRAIL[0][0]} y={TRAIL[0][1] + 20} className="ex-map-label">Ch. 1</text>
      <text x="262" y="132" className="ex-map-label ex-map-label--fog">Uncharted</text>
      <g transform={`translate(${here[0] - 7} ${here[1] - 22})`}><foreignObject width="14" height="20"><FlameMark size={20} live /></foreignObject></g>
      <g className="ex-compass" transform="translate(318 20)"><circle r="12" /><path d="M0 -10 L3 0 L0 10 L-3 0 Z" /><text y="-15">N</text></g>
    </svg>
  )
}

function Top({ left, right, center }) {
  return <header className="ex-top"><div>{left}</div><div className="ex-top-c">{center}</div><div className="ex-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const frac = isPP ? ctx.t / CHAPTER_SEC : 0.4
  const reached = Math.max(1, Math.min(TRAIL.length - 1, isPP ? 1 : Math.round((b.bookPct / 100) * (TRAIL.length - 2)) + 1))
  return (
    <div className="ex">
      <Top left={<Lockup kind="expedition" size={18} />} right={<><button className="ex-ic" aria-label="Search"><Icon name="search" /></button><button className="ex-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <div className="ex-head">
        <span className="ex-type ex-dim">Mon 16 Nov · 00:45 · Clear</span>
        <h1 className="ex-h1">Where we left off</h1>
      </div>

      <section className="ex-route">
        <div className="ex-route-head">
          <Cover book={b} size="sm" />
          <div className="ex-route-title">
            <h2 className="ex-h2">{b.title}</h2>
            <p className="ex-sub">{b.author}</p>
          </div>
          <span className="ex-type ex-route-day">Day {isPP ? 1 : b.chapter || 0}</span>
        </div>
        {b.status === 'next'
          ? <p className="ex-blank">Not yet set out. The whole map is uncharted.</p>
          : b.status === 'finished'
            ? <p className="ex-blank">Route complete. All {b.chapters} camps reached.</p>
            : <RouteMap reached={reached} frac={frac} />}
        <dl className="ex-coords">
          <div><dt>Camp</dt><dd>{b.chapter ? `Ch. ${pad2(b.chapter)}` : '—'}</dd></div>
          <div><dt>To next camp</dt><dd>{isPP ? fmt(CHAPTER_SEC - ctx.t) : `${100 - b.bookPct}%`}</dd></div>
          <div><dt>Route</dt><dd>{b.chapters} ch.</dd></div>
        </dl>
        <div className="ex-actions">
          <button className="ex-btn ex-btn--go" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Set out</button>
          <button className="ex-btn" onClick={() => ctx.go('companion')}>Journal</button>
        </div>
      </section>

      <div className="ex-section"><span className="ex-type">Logbook</span><span className="ex-type ex-dim">{pad2(BOOKS.length)} routes</span></div>
      <ol className="ex-list">
        {BOOKS.map(x => (
          <li key={x.id}>
            <button className={`ex-row${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
              <Cover book={x} size="sm" />
              <span className="ex-row-text"><span className="ex-row-title">{x.title}</span><span className="ex-row-meta">{x.author}</span></span>
              <span className="ex-row-trail" aria-label={`${x.bookPct}% walked`}><i style={{ width: `${x.bookPct}%` }} />{x.status !== 'next' && x.status !== 'finished' && <FlameMark size={11} />}</span>
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
    <div className="ex">
      <Top left={<button className="ex-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="ex-type ex-dim">Field journal</span>} right={<button className="ex-ic" aria-label="More"><Icon name="more" /></button>} />
      <section className="ex-bookhead">
        <Cover book={pp} size="md" />
        <div>
          <h1 className="ex-h2">{pp.title}</h1>
          <p className="ex-sub">{pp.author}, 1813</p>
          <span className="ex-pin">Map ends at Ch. 01</span>
        </div>
      </section>
      <nav className="ex-tabs" aria-label="Sections">
        {['Journal', 'People', 'Plot', 'Questions', 'Discussion'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
      </nav>

      <article className="ex-card">
        <span className="ex-type ex-dim">Camp 1 · reflection</span>
        <p className="ex-quote">{REFLECTION}</p>
      </article>

      <div className="ex-log" aria-label="Conversation">
        {CHAT.map((m, i) => (
          <div key={i} className={`ex-entry ex-entry--${m.who}`}>
            <span className="ex-type ex-entry-who">{m.who === 'reader' ? '22:14 — You' : <><FlameMark size={12} /> 22:14 — Lantern</>}</span>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <form className="ex-compose" onSubmit={e => e.preventDefault()}>
        <input placeholder="Write in the journal…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
      <p className="ex-type ex-dim ex-fine">Lantern never talks about ground you haven’t covered.</p>

      <div className="ex-section"><span className="ex-type">Pressed in the margins</span><span className="ex-type ex-dim">{pad2(NOTES.length)}</span></div>
      {NOTES.map((n, i) => <div key={i} className="ex-note"><span className="ex-type ex-note-tag">{n.tag}</span><p>{n.text}</p></div>)}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="ex ex--reader">
      <Top left={<button className="ex-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="ex-type ex-dim">Pride and Prejudice</span>}
        right={<><button className="ex-ic ex-aa" aria-label="Text settings">Aa</button><button className="ex-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="ex-chap">
        <span className="ex-type ex-dim">Day 1</span>
        <span className="ex-chap-title">Chapter I</span>
      </header>
      <article className="ex-prose">
        {PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}
      </article>
      <footer className="ex-foot">
        <span className="ex-type">Camp 1</span>
        <span className="ex-foot-trail"><i style={{ width: `${pct}%` }} /><b style={{ left: `${pct}%` }}><FlameMark size={14} /></b></span>
        <span className="ex-type">Camp 2</span>
      </footer>
    </div>
  )
}

// Elevation profile for the chapter: sentence-length gives the terrain.
const PROFILE = [40, 52, 46, 70, 62, 88, 74, 96, 80, 104, 92, 84, 110, 98, 76, 90, 72, 60, 66, 50]
function Elevation({ pct }) {
  const W = 340; const H = 120
  const pts = PROFILE.map((v, i) => [(i / (PROFILE.length - 1)) * W, H - v])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y}`).join(' ')
  const cut = (pct / 100) * W
  const i = Math.min(PROFILE.length - 2, Math.floor((pct / 100) * (PROFILE.length - 1)))
  const f = (pct / 100) * (PROFILE.length - 1) - i
  const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f
  return (
    <svg className="ex-elev" viewBox={`0 0 ${W} ${H + 4}`} aria-hidden="true">
      <defs><clipPath id="ex-walked"><rect x="0" y="0" width={cut} height={H + 4} /></clipPath></defs>
      <path d={`${d} L${W} ${H + 4} L0 ${H + 4} Z`} className="ex-elev-ground" />
      <path d={d} className="ex-elev-line" />
      <g clipPath="url(#ex-walked)"><path d={`${d} L${W} ${H + 4} L0 ${H + 4} Z`} className="ex-elev-walked" /><path d={d} className="ex-elev-line ex-elev-line--walked" /></g>
      <line x1={cut} x2={cut} y1={y} y2={H + 4} className="ex-elev-here" />
      <foreignObject x={cut - 9} y={y - 28} width="18" height="26"><FlameMark size={24} live /></foreignObject>
    </svg>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="ex">
      <Top left={<button className="ex-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="ex-type ex-dim">On the trail</span>} right={<button className="ex-ic" aria-label="More"><Icon name="more" /></button>} />
      <div className="ex-listen-head">
        <span className="ex-type ex-dim">Day 1 · read aloud by Aiden</span>
        <h1 className="ex-h1">Chapter I</h1>
        <p className="ex-sub">Pride and Prejudice</p>
      </div>
      <div className="ex-elev-wrap">
        <Elevation pct={pct} />
        <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
        <div className="ex-elev-axis"><span className="ex-type">{fmt(ctx.t)}</span><span className="ex-type ex-dim">{fmt(CHAPTER_SEC - ctx.t)} to camp</span></div>
      </div>

      <div className="ex-transport">
        <button className="ex-skip" aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}><Icon name="rew" size={22} /><span>15</span></button>
        <button className="ex-play" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={30} /></button>
        <button className="ex-skip" aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}><Icon name="fwd" size={22} /><span>15</span></button>
      </div>
      <div className="ex-pills"><span>1.0×</span><span>Aiden</span><span>Sleep · end of chapter</span></div>

      <section className="ex-card ex-transcript">
        <span className="ex-type ex-dim">Heard on the trail</span>
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>

      <div className="ex-section"><span className="ex-type">Around the fire</span></div>
      <div className="ex-chips">{AMBIENT.map((a, i) => <button key={a} className={i === 2 ? 'is-on' : ''}>{a}</button>)}</div>
      <p className="ex-type ex-dim ex-fine">Your companion stays at Camp 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="ex ex--preview">
      <Lockup kind="expedition" size={22} />
      <RouteMap reached={1} frac={0.64} />
    </div>
  )
}
