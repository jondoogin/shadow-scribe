/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './scope.css'

// 1 · Scope — Field Lab's instruments taken all the way: Lantern as an
// oscilloscope. The grid is the scope's graticule, every book is a channel
// with its own trace, and narration draws a live waveform. Dark first, warm
// amber phosphor; light mode is the paper printout from a chart recorder.

export const meta = {
  id: 'scope', name: 'Scope', defaultMode: 'dark',
  tagline: 'Lantern as a bench oscilloscope',
  signature: 'Every book is a channel with a live trace; the grid is a graticule',
  research: 'Pushes Field Lab’s instruments to the extreme: a warm amber-phosphor screen, monospace readouts in the corners, and a waveform that moves while Lantern reads aloud. Past your chapter the signal is cut, so the trace goes flat. Light mode is the printout from a chart recorder.',
}

const ch = (b) => `CH${BOOKS.indexOf(b) + 1}`
// A deterministic trace for a book: frequency from its chapter count.
function tracePath(seed, w, h, phase = 0, upto = 1, amp = 0.32) {
  const pts = []
  const n = 120
  for (let i = 0; i <= n * upto; i++) {
    const x = (i / n) * w
    const v = Math.sin(i * 0.21 * seed + phase) * 0.6 + Math.sin(i * 0.53 + seed * 3 + phase * 1.7) * 0.3 + Math.sin(i * 1.31 + phase * 2.3) * 0.1
    pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)} ${(h / 2 - v * h * amp).toFixed(1)}`)
  }
  return pts.join(' ')
}

function Screen({ children, w = 320, h = 200, cut, className = '' }) {
  return (
    <div className={`sc-screen ${className}`}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => <line key={`v${i}`} x1={(i * w) / 10} x2={(i * w) / 10} y1="0" y2={h} className={i === 5 ? 'sc-axis' : 'sc-div'} />)}
        {Array.from({ length: 9 }, (_, i) => <line key={`h${i}`} y1={(i * h) / 8} y2={(i * h) / 8} x1="0" x2={w} className={i === 4 ? 'sc-axis' : 'sc-div'} />)}
        {Array.from({ length: 51 }, (_, i) => <line key={`t${i}`} x1={(i * w) / 50} x2={(i * w) / 50} y1={h / 2 - 3} y2={h / 2 + 3} className="sc-div" />)}
        {cut != null && <rect x={cut * w} y="0" width={w - cut * w} height={h} className="sc-cut" />}
        {children}
      </svg>
    </div>
  )
}

function Top({ left, right, center }) {
  return <header className="sc-top"><div>{left}</div><div className="sc-top-c">{center}</div><div className="sc-top-r">{right}</div></header>
}
const Lockup = () => (
  <span className="sc-lockup"><FlameMark size={20} live /><span>LANTERN</span><i>v1</i></span>
)

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  const seed = (b.chapters % 7) + 1.3
  return (
    <div className="sc">
      <Top left={<Lockup />} right={<><button className="sc-ic" aria-label="Search"><Icon name="search" /></button><button className="sc-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />

      <section className="sc-bench">
        <div className="sc-bench-head"><span>{ch(b)} · {b.title.toUpperCase()}</span><span className="sc-live">● {b.status === 'listening' ? 'LISTEN' : b.status === 'reading' ? 'READ' : b.status === 'finished' ? 'DONE' : 'IDLE'}</span></div>
        <Screen cut={b.status === 'next' ? 0 : pct / 100}>
          {b.status !== 'next' && <path d={tracePath(seed, 320, 200, 0, pct / 100)} className="sc-trace" />}
          <path d={`M${(pct / 100) * 320} 100 L320 100`} className="sc-flat" />
          <line x1={(pct / 100) * 320} x2={(pct / 100) * 320} y1="0" y2="200" className="sc-cursor" />
        </Screen>
        <div className="sc-readouts">
          <span><b>{b.chapter ? pad2(b.chapter) : '--'}</b>/{b.chapters} CH</span>
          <span><b>{Math.round(pct)}</b>%</span>
          <span><b>{isPP ? fmt(CHAPTER_SEC - ctx.t) : `${100 - b.bookPct}%`}</b> LEFT</span>
        </div>
        <h1 className="sc-title">{b.title}</h1>
        <p className="sc-by">{b.author}</p>
        <div className="sc-actions">
          <button className="sc-btn sc-btn--hot" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> RUN</button>
          <button className="sc-btn" onClick={() => ctx.go('companion')}>LOG</button>
        </div>
      </section>

      <div className="sc-label">INPUTS · {pad2(BOOKS.length)}</div>
      <ol className="sc-channels">
        {BOOKS.map((x, i) => (
          <li key={x.id}>
            <button className={`sc-chan${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
              <span className="sc-chan-id">CH{i + 1}</span>
              <span className="sc-chan-text"><span className="sc-chan-title">{x.title}</span><span className="sc-chan-meta">{x.author}</span></span>
              <svg className="sc-spark" viewBox="0 0 80 24" aria-hidden="true">
                <line x1="0" x2="80" y1="12" y2="12" className="sc-div" />
                {x.bookPct > 0 && <path d={tracePath((x.chapters % 7) + 1.3, 80, 24, i, x.bookPct / 100, 0.38)} className="sc-trace sc-trace--thin" />}
              </svg>
              <span className="sc-chan-pct">{x.status === 'finished' ? 'END' : `${x.bookPct || 0}%`}</span>
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
    <div className="sc">
      <Top left={<button className="sc-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sc-dim">CH1 · SIGNAL LOG</span>} right={<button className="sc-ic" aria-label="More"><Icon name="more" /></button>} />
      <h1 className="sc-title">{pp.title}</h1>
      <p className="sc-by">{pp.author}, 1813</p>
      <div className="sc-cutline">
        <Screen h={60} cut={0.14}>
          <path d={tracePath(3.3, 320, 60, 0, 0.14, 0.4)} className="sc-trace" />
          <path d="M44.8 30 L320 30" className="sc-flat" />
        </Screen>
        <span className="sc-cut-label">SIGNAL CUT AFTER CH 01 · NO SPOILERS PAST THIS POINT</span>
      </div>
      <nav className="sc-tabs" aria-label="Sections">
        {['LOG', 'PEOPLE', 'PLOT', 'QUESTIONS', 'DISCUSS'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
      </nav>
      <article className="sc-reading">
        <span className="sc-dim">READING 001 · CH 01</span>
        <p>{REFLECTION}</p>
      </article>
      <div className="sc-log" aria-label="Conversation">
        {CHAT.map((m, i) => (
          <div key={i} className={`sc-line sc-line--${m.who}`}>
            <span className="sc-line-ts">22:14:0{i * 7}</span>
            <span className="sc-line-who">{m.who === 'reader' ? 'YOU >' : <><FlameMark size={11} /> LNT</>}</span>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <form className="sc-prompt" onSubmit={e => e.preventDefault()}>
        <span aria-hidden="true">&gt;</span>
        <input placeholder="ask about ch 01_" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
      <div className="sc-label">NOTES · {pad2(NOTES.length)}</div>
      {NOTES.map((n, i) => <div key={i} className="sc-note"><span className="sc-note-tag">{n.tag.toUpperCase()}</span><p>{n.text}</p></div>)}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="sc sc--reader">
      <Top left={<button className="sc-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sc-dim">CH1 · PRIDE AND PREJUDICE</span>}
        right={<><button className="sc-ic sc-aa" aria-label="Text settings">Aa</button><button className="sc-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="sc-chap"><span className="sc-dim">CHAPTER</span><span className="sc-chap-num">01</span></header>
      <article className="sc-prose">
        {PASSAGE.map((p, i) => (
          <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}><span className="sc-pn" aria-hidden="true">{pad2(i + 1)}</span>{p}</p>
        ))}
      </article>
      <footer className="sc-foot">
        <span>{fmt(ctx.t)}</span>
        <span className="sc-foot-bar"><i style={{ width: `${pct}%` }} /></span>
        <span>{fmt(CHAPTER_SEC - ctx.t)}</span>
      </footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  const phase = ctx.t * 0.9
  return (
    <div className="sc">
      <Top left={<button className="sc-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="sc-dim">CH1 · NARRATION</span>} right={<button className="sc-ic" aria-label="More"><Icon name="more" /></button>} />
      <Screen className={`sc-screen--big${ctx.playing ? ' is-running' : ''}`} h={240}>
        <path d={tracePath(2.2, 320, 240, phase, 1, ctx.playing ? 0.3 : 0.06)} className="sc-trace sc-trace--live" />
      </Screen>
      <div className="sc-readouts sc-readouts--big">
        <span>VOICE <b>AIDEN</b></span><span>RATE <b>1.0×</b></span><span>ST <b>{ctx.playing ? 'RUN' : 'HOLD'}</b></span>
      </div>
      <div className="sc-clock"><span>{fmt(ctx.t)}</span><small>/ {fmt(CHAPTER_SEC)}</small></div>
      <div className="sc-scrub">
        <span className="sc-foot-bar"><i style={{ width: `${pct}%` }} /></span>
        <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
      </div>
      <div className="sc-panel">
        <button className="sc-knob" aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}><span>−15</span></button>
        <button className={`sc-run${ctx.playing ? ' is-on' : ''}`} aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}>
          <Icon name={ctx.playing ? 'pause' : 'play'} size={26} /><span>{ctx.playing ? 'STOP' : 'RUN'}</span>
        </button>
        <button className="sc-knob" aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}><span>+15</span></button>
      </div>
      <section className="sc-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <div className="sc-label">AUX INPUT</div>
      <div className="sc-switches">{AMBIENT.map((a, i) => <button key={a} className={i === 2 ? 'is-on' : ''}><i />{a.toUpperCase()}</button>)}</div>
      <p className="sc-dim sc-fine">Companion holds at CH 01 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="sc sc--preview">
      <Lockup />
      <Screen h={120} cut={0.64}><path d={tracePath(2.3, 320, 120, 0, 0.64)} className="sc-trace" /><path d="M204.8 60 L320 60" className="sc-flat" /></Screen>
    </div>
  )
}
