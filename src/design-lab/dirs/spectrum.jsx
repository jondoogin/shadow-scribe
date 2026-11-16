/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './spectrum.css'

// 5 · Spectrum — the loud one. Field Lab's grid becomes bands of flat colour,
// the way a spectroscope splits light. Every book is a band, chapters are
// stripes, and listening fills a spectrogram with heat. Huge numerals, no
// boxes, no shadows: colour does all the structural work.

export const meta = {
  id: 'spectrum', name: 'Spectrum', defaultMode: 'light',
  tagline: 'Lantern’s light, split into bands of colour',
  signature: 'Full-bleed colour bands, giant numerals, a spectrogram that fills as you listen',
  research: 'The boldest of the five. A spectroscope splits a flame into bands; here each book is a band, each chapter a stripe, and the flame mark’s four colours stretch into the whole palette. Colour-field layouts and oversized grotesque numerals (the current editorial and music-app trend) instead of cards. Body text stays a calm serif on paper.',
}

const BAND = { pp: '#D69058', je: '#AA5634', md: '#2F4B5C', gg: '#D3C2A6', fr: '#6C7A4E', mm: '#A47044' }
const INK_ON = { pp: '#1A100A', je: '#FFF4EA', md: '#F2EEE6', gg: '#1A100A', fr: '#F7F3E8', mm: '#FFF4EA' }
const HEAT = ['#2A1B3D', '#5A1E3C', '#8E2A2E', '#AA5634', '#D69058', '#E8B46A', '#F6DFA0']

const Lockup = ({ light }) => (
  <span className={`sp-lockup${light ? ' sp-lockup--light' : ''}`}><FlameMark size={22} /><span>lantern</span></span>
)
function Top({ left, right, center, tone }) {
  return <header className="sp-top" style={tone ? { color: tone } : undefined}><div>{left}</div><div className="sp-top-c">{center}</div><div className="sp-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="sp">
      <div className="sp-band sp-band--hero" style={{ '--c': BAND[b.id], '--on': INK_ON[b.id] }}>
        <Top tone={INK_ON[b.id]} left={<Lockup />} right={<><button className="sp-ic" aria-label="Search"><Icon name="search" /></button><button className="sp-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
        <p className="sp-kicker">{b.status === 'next' ? 'Up next' : b.status === 'finished' ? 'Finished' : 'Now'} · ch. {b.chapter || '—'} of {b.chapters}</p>
        <p className="sp-giant">{Math.round(pct)}<span>%</span></p>
        <h1 className="sp-h1">{b.title}</h1>
        <p className="sp-by">{b.author}</p>
        <div className="sp-meter" aria-hidden="true">{Array.from({ length: 40 }, (_, i) => <i key={i} className={i < (pct / 100) * 40 ? 'is-on' : ''} />)}</div>
        <div className="sp-actions">
          <button className="sp-btn sp-btn--solid" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> {isPP ? `Resume · ${fmt(CHAPTER_SEC - ctx.t)} left` : 'Open'}</button>
          <button className="sp-btn" onClick={() => ctx.go('companion')}>Notes</button>
        </div>
      </div>
      <ul className="sp-bands">
        {BOOKS.filter(x => x.id !== b.id).map(x => (
          <li key={x.id}>
            <button className="sp-band sp-band--row" style={{ '--c': BAND[x.id], '--on': INK_ON[x.id] }} onClick={() => ctx.setBook(x)}>
              <span className="sp-row-n">{x.status === 'finished' ? '✓' : `${x.bookPct || 0}`}</span>
              <span className="sp-row-t"><b>{x.title}</b><span>{x.author}</span></span>
              <span className="sp-row-s">{x.status === 'next' ? 'next' : x.status}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Companion({ ctx }) {
  const pp = BOOKS[0]
  return (
    <div className="sp sp--paper">
      <div className="sp-band" style={{ '--c': BAND.pp, '--on': INK_ON.pp }}>
        <Top tone={INK_ON.pp} left={<button className="sp-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
          center={<Lockup />} right={<button className="sp-ic" aria-label="More"><Icon name="more" /></button>} />
        <h1 className="sp-h1 sp-h1--xl">{pp.title}</h1>
        <p className="sp-by">{pp.author}, 1813</p>
      </div>
      <section className="sp-stripes" aria-label="Chapter 1 read. Chapters 2 to 61 are hidden.">
        {Array.from({ length: 61 }, (_, i) => <i key={i} className={i === 0 ? 'is-on' : ''} />)}
        <span className="sp-stripes-label"><b>1</b> / 61 — the rest stays dark</span>
      </section>
      <div className="sp-pad">
        <nav className="sp-tabs" aria-label="Sections">
          {['Notes', 'People', 'Plot', 'Questions', 'Discussion'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
        </nav>
        <p className="sp-pull">{REFLECTION}</p>
        <div className="sp-chat" aria-label="Conversation">
          {CHAT.map((m, i) => (
            <div key={i} className={`sp-msg sp-msg--${m.who}`}>
              {m.who === 'companion' && <span className="sp-msg-who"><FlameMark size={14} /> Lantern</span>}
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <form className="sp-compose" onSubmit={e => e.preventDefault()}>
          <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
          <button aria-label="Send"><Icon name="send" size={18} /></button>
        </form>
        <p className="sp-fine">Lantern only talks about chapters you’ve read.</p>
        <h2 className="sp-h2">Notes <span>{pad2(NOTES.length)}</span></h2>
        {NOTES.map((n, i) => <div key={i} className="sp-note" style={{ '--c': i ? BAND.md : BAND.je }}><b>{n.tag}</b><p>{n.text}</p></div>)}
      </div>
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="sp sp--paper sp--reader">
      <div className="sp-pad">
        <Top left={<button className="sp-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
          center={<span className="sp-fine">Pride and Prejudice</span>}
          right={<><button className="sp-ic sp-aa" aria-label="Text settings">Aa</button><button className="sp-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
        <header className="sp-chap"><span className="sp-chap-n">01</span><span className="sp-chap-w">Chapter<br />one</span></header>
        <article className="sp-prose">
          {PASSAGE.map((p, i) => (
            <p key={i} className={ctx.playing && i === line ? 'is-now' : ''} style={{ '--heat': HEAT[Math.min(HEAT.length - 1, 2 + (i % 5))] }}>{p}</p>
          ))}
        </article>
      </div>
      <footer className="sp-foot">
        <span className="sp-foot-fill" style={{ width: `${pct}%` }} />
        <span className="sp-foot-t"><b>{Math.round(pct)}%</b> {fmt(CHAPTER_SEC - ctx.t)} left</span>
      </footer>
    </div>
  )
}

function Spectrogram({ t, playing }) {
  const cols = 32, rows = 14
  const now = Math.floor((t / CHAPTER_SEC) * cols)
  const cells = []
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      let v = 0
      if (c <= now) {
        const base = Math.sin(c * 1.7 + r * 0.9) * 0.5 + Math.sin(c * 0.43 - r * 0.31) * 0.5
        const low = 1 - r / rows
        v = Math.max(0, Math.min(HEAT.length - 1, Math.round((base * 0.5 + 0.5) * low * 6 + low * 1.5)))
        if (c === now && playing) v = Math.min(HEAT.length - 1, v + 1)
      }
      cells.push(<i key={`${c}-${r}`} style={{ gridColumn: c + 1, gridRow: rows - r, background: c <= now ? HEAT[v] : undefined }} className={c === now ? 'is-now' : ''} />)
    }
  }
  return <div className="sp-gram" aria-hidden="true">{cells}</div>
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  return (
    <div className="sp sp--night">
      <div className="sp-pad">
        <Top left={<button className="sp-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
          center={<span className="sp-fine">Read by Aiden</span>} right={<button className="sp-ic" aria-label="More"><Icon name="more" /></button>} />
        <p className="sp-clock">{fmt(ctx.t)}</p>
        <p className="sp-clock-sub">of {fmt(CHAPTER_SEC)} · chapter 1 · Pride and Prejudice</p>
      </div>
      <div className="sp-gram-wrap">
        <Spectrogram t={ctx.t} playing={ctx.playing} />
        <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
      </div>
      <div className="sp-keys">
        <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
        <button className="sp-key-go" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={32} /></button>
        <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
      </div>
      <div className="sp-pad">
        <section className="sp-transcript">
          {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
            const idx = Math.max(0, line - 1) + i
            return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
          })}
        </section>
        <h2 className="sp-h2">Ambience</h2>
        <div className="sp-amb">{AMBIENT.map((a, i) => <button key={a} className={i === 2 ? 'is-on' : ''} style={{ '--c': HEAT[2 + i] || HEAT[6] }}>{a}</button>)}</div>
        <p className="sp-fine">Your companion stays at chapter 1 until you move it.</p>
      </div>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="sp sp--preview">
      {['pp', 'je', 'md', 'gg'].map((id, i) => (
        <div key={id} className="sp-pv-band" style={{ '--c': BAND[id], color: INK_ON[id], flex: i ? 1 : 2.4 }}>
          {i === 0 ? <><Lockup /><span className="sp-pv-n">64<small>%</small></span></> : <span>{BOOKS.find(b => b.id === id).title}</span>}
        </div>
      ))}
    </div>
  )
}
