/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useState } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT, CHARACTERS } from '../sample.js'
import { Icon, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import { FlameMark } from '../brand.jsx'
import './ticket.css'

// Ticket. Catalogue's paper object and Spectrum's colour block share one
// shape: a library admission ticket. The stub is a solid colour field with
// the chapter number set huge; the body is plain white with the facts.
// The spoiler rule becomes the ticket's validity: "admits chapters 1–1".

export const meta = {
  id: 'ticket', name: 'Ticket', defaultMode: 'light',
  tagline: 'Your place in the book, as an admission ticket',
  signature: 'Colour stub with a giant chapter number, perforated edge, a ticket that admits only the chapters you’ve read',
  research: 'From Spectrum: one bold colour per book and an oversized number. From Catalogue: a paper object with a code and a stamp. The ticket stub holds the colour and the number; the body holds title, author and one action, in large plain type. Archivo Condensed for numerals, Newsreader for reading. Progress tears off along the perforation.',
}

const STUB = { pp: '#FF6A3D', je: '#2F4FD8', md: '#0E9F87', gg: '#F4B400', fr: '#E0446A', mm: '#3E8EDB' }
const ON = { pp: '#1B0A04', je: '#FFFFFF', md: '#FFFFFF', gg: '#1E1500', fr: '#FFFFFF', mm: '#FFFFFF' }
const tone = (id) => ({ '--c': STUB[id], '--on': ON[id] })
const serial = (b) => `No. ${pad2(BOOKS.indexOf(b) + 1)}·${String(b.chapters).padStart(3, '0')}`

export function Ticket({ id, n, label, children, small = false, className = '' }) {
  return (
    <article className={`tk-ticket${small ? ' tk-ticket--sm' : ''} ${className}`} style={tone(id)}>
      <div className="tk-stub"><span className="tk-stub-l">{label}</span><span className="tk-stub-n">{n}</span></div>
      <div className="tk-perf" aria-hidden="true" />
      <div className="tk-body">{children}</div>
    </article>
  )
}
// tear-off progress: segments left of the line are torn (filled), the rest still attached
const Tear = ({ pct, n = 16 }) => (
  <div className="tk-tear" role="img" aria-label={`${Math.round(pct)} percent`}>
    {Array.from({ length: n }, (_, i) => <i key={i} className={i < Math.round((pct / 100) * n) ? 'is-on' : ''} />)}
  </div>
)
const Lockup = () => <span className="tk-lockup"><FlameMark size={20} /><span>Lantern</span></span>
function Top({ left, right, center }) {
  return <header className="tk-top"><div>{left}</div><div className="tk-top-c">{center}</div><div className="tk-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="tk">
      <Top left={<Lockup />} right={<><button className="tk-ic" aria-label="Search"><Icon name="search" /></button><button className="tk-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <p className="tk-label">Admit one · now reading</p>
      <Ticket id={b.id} n={b.chapter ? pad2(b.chapter) : '—'} label="Chapter">
        <span className="tk-serial">{serial(b)}</span>
        <h1 className="tk-title">{b.title}</h1>
        <p className="tk-by">{b.author}</p>
        <Tear pct={pct} />
        <p className="tk-under"><b>{Math.round(pct)}%</b> {isPP ? `· ${fmt(CHAPTER_SEC - ctx.t)} left` : 'of the book'}</p>
      </Ticket>
      <div className="tk-actions">
        <button className="tk-btn tk-btn--go" style={tone(b.id)} onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
        <button className="tk-btn" onClick={() => ctx.go('companion')}>Companion</button>
      </div>
      <h2 className="tk-h2">Your tickets</h2>
      <ul className="tk-roll">
        {BOOKS.filter(x => x.id !== b.id).map(x => (
          <li key={x.id}>
            <button className="tk-pick" onClick={() => ctx.setBook(x)}>
              <Ticket id={x.id} small n={x.status === 'next' ? '—' : pad2(x.chapter)} label={x.status === 'finished' ? 'Done' : x.status === 'next' ? 'Next' : 'Ch.'}>
                <b className="tk-row-t">{x.title}</b>
                <span className="tk-row-a">{x.author}</span>
                <span className="tk-row-p">{x.status === 'next' ? 'Not started' : x.status === 'finished' ? 'Finished' : `${x.bookPct}% · chapter ${x.chapter} of ${x.chapters}`}</span>
              </Ticket>
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
    <div className="tk">
      <Top left={<button className="tk-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="tk-top-t">Companion</span>} right={<button className="tk-ic" aria-label="More"><Icon name="more" /></button>} />
      <Ticket id="pp" n="01" label="Valid to">
        <span className="tk-serial">{serial(pp)}</span>
        <h1 className="tk-title">{pp.title}</h1>
        <p className="tk-by">{pp.author}, 1813</p>
        <p className="tk-valid"><Icon name="shield" size={16} /> Admits chapter 1 only. Chapters 2–61 open when you reach them.</p>
      </Ticket>
      <nav className="tk-tabs" aria-label="Sections">
        {['Ask', 'Notes', 'People', 'Plot'].map(t => <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)} style={tone('pp')}>{t}</button>)}
      </nav>
      {tab === 'Ask' && <>
        <p className="tk-pull">{REFLECTION}</p>
        <div className="tk-chat">
          {CHAT.map((m, i) => (
            <div key={i} className={`tk-msg tk-msg--${m.who}`}>
              {m.who === 'companion' && <span className="tk-who"><FlameMark size={13} /> Lantern</span>}
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <form className="tk-compose" onSubmit={e => e.preventDefault()}>
          <input placeholder="Ask about chapter 1" aria-label="Message your companion" />
          <button aria-label="Send" style={tone('pp')}><Icon name="send" size={18} /></button>
        </form>
      </>}
      {tab === 'Notes' && NOTES.map((n, i) => <div key={i} className="tk-slip"><span className="tk-label">{n.tag}</span><p>{n.text}</p></div>)}
      {tab === 'People' && CHARACTERS.map(c => <div key={c} className="tk-slip"><span className="tk-label">Chapter 1</span><p>{c}</p></div>)}
      {tab === 'Plot' && <>
        <div className="tk-slip"><span className="tk-label">Chapter 1</span><p>Netherfield Park is let at last, and Mrs. Bennet has plans for the new tenant.</p></div>
        <div className="tk-slip tk-slip--void"><span className="tk-label">Chapters 2–61</span><p>Not valid yet</p></div>
      </>}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="tk tk--reader">
      <Top left={<button className="tk-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="tk-top-t">Pride and Prejudice</span>}
        right={<><button className="tk-ic tk-aa" aria-label="Text settings">Aa</button><button className="tk-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="tk-chap" style={tone('pp')}><span className="tk-chap-n">01</span><span className="tk-chap-w">Chapter<br />one</span></header>
      <article className="tk-prose">
        {PASSAGE.map((p, i) => <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>{p}</p>)}
      </article>
      <footer className="tk-foot" style={tone('pp')}><Tear pct={pct} n={20} /><span>{fmt(CHAPTER_SEC - ctx.t)} left</span></footer>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  const [amb, setAmb] = useState('Fireplace')
  return (
    <div className="tk">
      <Top left={<button className="tk-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="tk-top-t">Read by Aiden</span>} right={<button className="tk-ic" aria-label="More"><Icon name="more" /></button>} />
      <Ticket id="pp" n="01" label="Chapter" className="tk-ticket--player">
        <span className="tk-serial">Pride and Prejudice</span>
        <p className="tk-clock">{fmt(ctx.t)}</p>
        <p className="tk-by">{fmt(CHAPTER_SEC - ctx.t)} left of {fmt(CHAPTER_SEC)}</p>
        <div className="tk-scrub">
          <Tear pct={pct} n={18} />
          <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
        </div>
      </Ticket>
      <div className="tk-keys">
        <button aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
        <button className="tk-key-go" style={tone('pp')} aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={30} /></button>
        <button aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
      </div>
      <section className="tk-transcript">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>
      <h2 className="tk-h2">Ambience</h2>
      <div className="tk-amb">{AMBIENT.map(a => <button key={a} className={amb === a ? 'is-on' : ''} onClick={() => setAmb(a)}>{a}</button>)}</div>
      <p className="tk-fine">Your companion stays at chapter 1 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="tk tk--preview">
      <Ticket id="pp" n="01" label="Chapter"><span className="tk-serial">No. 01·061</span><b className="tk-row-t">Pride and Prejudice</b><Tear pct={64} n={12} /></Ticket>
      <Ticket id="je" small n="09" label="Ch."><b className="tk-row-t">Jane Eyre</b></Ticket>
    </div>
  )
}
