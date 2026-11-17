/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useState } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT, CHARACTERS } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './spectrum.css'

// Spectrum II. Round five's colour bands, edited like a magazine redesign:
// one type family at four sizes, one primary action per band, bands that
// only carry what you need to choose a book, and a spectrogram that is
// the scrubber instead of decoration next to it.

export const meta = {
  id: 'spectrum', name: 'Spectrum II', defaultMode: 'light',
  tagline: 'Colour bands, calmer and easier to use',
  signature: 'One band per book, a giant number that means one thing, a spectrogram you scrub',
  research: 'Kept: full-bleed colour bands, the giant numeral, the chapter stripes, the night spectrogram. Changed: four type sizes instead of nine, every band has the same rhythm (number, title, author), the hero has one primary button, progress reads as words and a bar, and the stripes become a labelled chapter strip. Night keeps the colour in thin edges so text stays white on near-black.',
}

// flame-family palette, tuned so every band passes contrast with its ink
const BAND = { pp: '#E8834A', je: '#9C3B26', md: '#1F4A5E', gg: '#EBCB8B', fr: '#536B42', mm: '#C27C3E' }
const INK = { pp: '#1A0F08', je: '#FFF3EA', md: '#F1F5F6', gg: '#1F1609', fr: '#F4F6EE', mm: '#1A0F08' }
const HEAT = ['#2A1B3D', '#5A1E3C', '#8E2A2E', '#B4482C', '#E8834A', '#F0B35E', '#F8E2A6']
const band = (id) => ({ '--c': BAND[id], '--on': INK[id] })
const STATUS = { listening: 'Listening', reading: 'Reading', finished: 'Finished', next: 'Up next' }

const Lockup = () => <span className="s2-lockup"><FlameMark size={22} /><span>lantern</span></span>
function Top({ left, right, center }) {
  return <header className="s2-top"><div>{left}</div><div className="s2-top-c">{center}</div><div className="s2-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="s2">
      <section className="s2-band s2-hero" style={band(b.id)}>
        <Top left={<Lockup />} right={<><button className="s2-ic" aria-label="Search"><Icon name="search" /></button><button className="s2-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
        <p className="s2-kicker">{STATUS[b.status]}{b.chapter ? ` · chapter ${b.chapter} of ${b.chapters}` : ''}</p>
        <p className="s2-giant" aria-label={`${Math.round(pct)} percent ${isPP ? 'through the chapter' : 'through the book'}`}>{Math.round(pct)}<span>%</span></p>
        <h1 className="s2-h1">{b.title}</h1>
        <p className="s2-by">{b.author}</p>
        <div className="s2-bar"><i style={{ width: `${pct}%` }} /></div>
        <p className="s2-bar-l">{isPP ? `${fmt(CHAPTER_SEC - ctx.t)} left in chapter 1` : `${Math.round(pct)}% of the book`}</p>
        <button className="s2-btn s2-btn--solid" onClick={() => ctx.go('listen')}><Icon name="play" size={18} /> {isPP ? 'Resume listening' : 'Continue'}</button>
      </section>
      <h2 className="s2-h2 s2-pad">Your shelf</h2>
      <ul className="s2-shelf">
        {BOOKS.filter(x => x.id !== b.id).map(x => (
          <li key={x.id}>
            <button className="s2-band s2-row" style={band(x.id)} onClick={() => ctx.setBook(x)}>
              <span className="s2-row-n">{x.status === 'finished' ? <>100<small>%</small></> : x.status === 'next' ? '—' : <>{x.bookPct}<small>%</small></>}</span>
              <span className="s2-row-t"><b>{x.title}</b><span>{x.author}</span></span>
              <span className="s2-row-s">{STATUS[x.status]}</span>
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
    <div className="s2 s2--paper">
      <section className="s2-band s2-head" style={band('pp')}>
        <Top left={<button className="s2-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
          center={<span className="s2-top-t">Companion</span>} right={<button className="s2-ic" aria-label="More"><Icon name="more" /></button>} />
        <h1 className="s2-h1">{pp.title}</h1>
        <p className="s2-by">{pp.author}, 1813</p>
      </section>
      <section className="s2-strip" aria-label="Chapter 1 read. Chapters 2 to 61 are sealed.">
        <div className="s2-strip-bars">{Array.from({ length: 61 }, (_, i) => <i key={i} className={i === 0 ? 'is-on' : ''} />)}</div>
        <p><b>Chapter 1 of 61.</b> Lantern only talks about what you’ve read.</p>
      </section>
      <div className="s2-pad">
        <nav className="s2-tabs" aria-label="Sections">
          {['Ask', 'Notes', 'People', 'Plot'].map(t => <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>)}
        </nav>
        {tab === 'Ask' && <>
          <p className="s2-pull">{REFLECTION}</p>
          <div className="s2-chat">
            {CHAT.map((m, i) => (
              <div key={i} className={`s2-msg s2-msg--${m.who}`}>
                {m.who === 'companion' && <span className="s2-msg-who"><FlameMark size={14} /> Lantern</span>}
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <form className="s2-compose" onSubmit={e => e.preventDefault()}>
            <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
            <button aria-label="Send"><Icon name="send" size={18} /></button>
          </form>
        </>}
        {tab === 'Notes' && NOTES.map((n, i) => <div key={i} className="s2-note" style={band(i ? 'md' : 'je')}><b>{n.tag}</b><p>{n.text}</p></div>)}
        {tab === 'People' && CHARACTERS.map((c, i) => <div key={c} className="s2-note" style={band(['pp', 'mm', 'gg', 'md'][i])}><b>Chapter 1</b><p>{c}</p></div>)}
        {tab === 'Plot' && <>
          <div className="s2-note" style={band('pp')}><b>Chapter 1</b><p>Netherfield Park is let at last, and Mrs. Bennet has plans for the new tenant.</p></div>
          <div className="s2-note s2-note--sealed"><b>Chapters 2–61</b><p>Sealed until you read them.</p></div>
        </>}
      </div>
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="s2 s2--paper s2--reader">
      <div className="s2-pad">
        <Top left={<button className="s2-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
          center={<span className="s2-top-t">Pride and Prejudice</span>}
          right={<><button className="s2-ic s2-aa" aria-label="Text settings">Aa</button><button className="s2-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
        <header className="s2-chap" style={band('pp')}><span className="s2-chap-n">01</span><span className="s2-chap-w">Chapter one</span></header>
        <article className="s2-prose">
          {PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}
        </article>
      </div>
      <footer className="s2-foot" style={band('pp')}>
        <span className="s2-foot-fill" style={{ width: `${pct}%` }} />
        <span className="s2-foot-t"><b>{Math.round(pct)}%</b><span>{fmt(CHAPTER_SEC - ctx.t)} left</span></span>
      </footer>
    </div>
  )
}

function Spectrogram({ t, playing }) {
  const cols = 30, rows = 10
  const now = Math.floor((t / CHAPTER_SEC) * (cols - 1))
  const cells = []
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      let v = -1
      if (c <= now) {
        const base = Math.sin(c * 1.7 + r * 0.9) * 0.5 + Math.sin(c * 0.43 - r * 0.31) * 0.5
        const low = 1 - r / rows
        v = Math.max(0, Math.min(HEAT.length - 1, Math.round((base * 0.5 + 0.5) * low * 5 + low * 2)))
        if (c === now && playing) v = Math.min(HEAT.length - 1, v + 1)
      }
      cells.push(<i key={`${c}-${r}`} style={{ gridColumn: c + 1, gridRow: rows - r, background: v >= 0 ? HEAT[v] : undefined }} />)
    }
  }
  return <div className="s2-gram" aria-hidden="true">{cells}<span className="s2-gram-head" style={{ left: `${((now + 1) / cols) * 100}%` }} /></div>
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const [amb, setAmb] = useState('Fireplace')
  return (
    <div className="s2 s2--night">
      <div className="s2-pad">
        <Top left={<button className="s2-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
          center={<span className="s2-top-t">Read by Aiden</span>} right={<button className="s2-ic" aria-label="More"><Icon name="more" /></button>} />
        <p className="s2-kicker">Pride and Prejudice · Chapter 1</p>
        <p className="s2-clock">{fmt(ctx.t)}</p>
        <p className="s2-clock-sub">{fmt(CHAPTER_SEC - ctx.t)} left of {fmt(CHAPTER_SEC)}</p>
      </div>
      <div className="s2-gram-wrap">
        <Spectrogram t={ctx.t} playing={ctx.playing} />
        <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
      </div>
      <div className="s2-keys">
        <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}><Icon name="rew" size={22} /><small>15</small></button>
        <button className="s2-key-go" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={32} /></button>
        <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}><Icon name="fwd" size={22} /><small>15</small></button>
      </div>
      <div className="s2-pad">
        <section className="s2-transcript">
          {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
            const idx = Math.max(0, line - 1) + i
            return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
          })}
        </section>
        <h2 className="s2-h2">Ambience</h2>
        <div className="s2-amb">{AMBIENT.map((a, i) => <button key={a} className={amb === a ? 'is-on' : ''} style={{ '--c': HEAT[Math.min(6, 2 + i)] }} onClick={() => setAmb(a)}>{a}</button>)}</div>
        <p className="s2-fine">Your companion stays at chapter 1 until you move it.</p>
      </div>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="s2 s2--preview">
      {['pp', 'je', 'md', 'gg'].map((id, i) => (
        <div key={id} className="s2-pv" style={{ ...band(id), flex: i ? 1 : 2.6 }}>
          {i === 0 ? <><Lockup /><span className="s2-pv-n">64<small>%</small></span></> : <><span>{BOOKS.find(b => b.id === id).title}</span><span>{pad2(BOOKS.find(b => b.id === id).bookPct)}%</span></>}
        </div>
      ))}
    </div>
  )
}
