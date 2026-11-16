/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useEffect, useRef } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, Logo, CHAPTER_SEC, fmt, lineFor } from '../shared.jsx'
import './riso.css'

// 2 · Riso — printed matter. Two-ink risograph overprint with a little
// mis-registration, halftone covers, paper grain, hand marks.

export const meta = {
  id: 'riso', name: 'Riso', defaultMode: 'light',
  tagline: 'A reading zine, printed in two inks',
  signature: 'Two-ink overprint that slips out of register as you scroll',
  research: 'Built on the 2026 “human touch” backlash against AI-smooth design: risograph mis-registration, paper grain, scribble-core marks and elements set 1–3° off the grid.',
}

// Headline printed twice: pink plate under blue plate, offset by scroll.
function Over({ children, as: Tag = 'h1', className = '' }) {
  return (
    <Tag className={`ri-over ${className}`}>
      <span className="ri-over-pink" aria-hidden="true">{children}</span>
      <span className="ri-over-blue">{children}</span>
    </Tag>
  )
}

function useRegistration() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    let raf
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        document.documentElement.style.setProperty('--reg-x', `${(Math.sin(y / 90) * 2.5 + 2).toFixed(2)}px`)
        document.documentElement.style.setProperty('--reg-y', `${(Math.cos(y / 120) * 1.5 - 1).toFixed(2)}px`)
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [])
}

function Cover({ book, tilt = 0, size = 'md' }) {
  return (
    <div className={`ri-cover ri-cover--${size}`} style={{ '--tilt': `${tilt}deg` }}>
      <span className="ri-cover-dots" />
      <span className="ri-cover-title">{book.title}</span>
      <span className="ri-cover-author">{book.author}</span>
    </div>
  )
}

function Top({ left, right }) {
  return <header className="ri-top"><div>{left}</div><div className="ri-top-r">{right}</div></header>
}

function Library({ ctx }) {
  useRegistration()
  const b = ctx.book
  const tilts = [-2.5, 2, -1.5, 3, -3, 1.5]
  return (
    <div className="ri">
      <Top left={<Logo size={20} />} right={<><button className="ri-ic" aria-label="Search"><Icon name="search" stroke={2.2} /></button><button className="ri-ic" aria-label="Add"><Icon name="plus" stroke={2.2} /></button></>} />
      <Over className="ri-h1">Reading pile</Over>
      <p className="ri-hand ri-hand--intro">6 books · 2 on the go</p>

      <button className="ri-poster" onClick={() => ctx.go(b.id === 'pp' ? 'listen' : 'companion')}>
        <span className="ri-tape ri-tape--l" /><span className="ri-tape ri-tape--r" />
        <Cover book={b} size="lg" tilt={-2} />
        <span className="ri-poster-body">
          <span className="ri-sticker">{b.status === 'listening' ? 'Now listening' : b.status === 'finished' ? 'Done!' : 'Now reading'}</span>
          <span className="ri-poster-title">{b.title}</span>
          <span className="ri-poster-meta">Chapter {b.chapter || 1} of {b.chapters}{b.minutesLeft ? ` · ${b.minutesLeft} min left` : ''}</span>
          <span className="ri-bar"><span style={{ width: `${b.id === 'pp' ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct}%` }} /></span>
          <span className="ri-go"><Icon name="play" size={16} /> Keep going</span>
        </span>
      </button>

      <div className="ri-pile">
        {BOOKS.map((x, i) => (
          <button key={x.id} className={`ri-pile-item${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
            <Cover book={x} tilt={tilts[i]} />
            <span className="ri-pile-title">{x.title}</span>
            <span className="ri-pile-meta">{x.status === 'finished' ? 'finished ✓' : x.status === 'next' ? 'up next' : `${x.bookPct || 1}% in`}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Companion({ ctx }) {
  useRegistration()
  const pp = BOOKS[0]
  return (
    <div className="ri">
      <Top left={<button className="ri-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" stroke={2.2} /></button>} right={<Logo size={16} />} />
      <div className="ri-bookhead">
        <Cover book={pp} size="md" tilt={-3} />
        <div>
          <Over as="h1" className="ri-h2">Pride and Prejudice</Over>
          <p className="ri-meta">Jane Austen · Ch. 1 of 61</p>
          <span className="ri-sticker ri-sticker--green">No spoilers past ch. 1</span>
        </div>
      </div>
      <div className="ri-actions">
        <button className="ri-btn ri-btn--blue" onClick={() => ctx.go('listen')}><Icon name="headphones" size={18} /> Listen</button>
        <button className="ri-btn" onClick={() => ctx.go('reader')}><Icon name="book" size={18} /> Read</button>
      </div>

      <blockquote className="ri-pull">
        <span className="ri-pull-mark" aria-hidden="true">“</span>
        {REFLECTION}
        <cite className="ri-hand">— your companion, after ch. 1</cite>
      </blockquote>

      <div className="ri-chat">
        {CHAT.map((m, i) => (
          <p key={i} className={`ri-strip ri-strip--${m.who}`} style={{ '--tilt': `${i % 2 ? 0.8 : -1.2}deg` }}>{m.text}</p>
        ))}
      </div>
      <form className="ri-compose" onSubmit={e => e.preventDefault()}>
        <input placeholder="Scribble a thought…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} stroke={2.4} /></button>
      </form>

      <h2 className="ri-hand ri-hand--h">your notes ↓</h2>
      <div className="ri-notes">
        {NOTES.map((n, i) => (
          <div key={i} className="ri-note" style={{ '--tilt': `${i ? 1.5 : -1}deg` }}>
            <span className="ri-note-tag">{n.tag}</span>
            <p>{n.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Reader({ ctx }) {
  useRegistration()
  const line = lineFor(ctx.t)
  return (
    <div className="ri ri--reader">
      <Top left={<button className="ri-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" stroke={2.2} /></button>}
        right={<><button className="ri-ic ri-aa" aria-label="Text settings">Aa</button><button className="ri-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" stroke={2.2} /></button></>} />
      <div className="ri-chap">
        <Over as="span" className="ri-chap-num">1</Over>
        <span className="ri-hand">Netherfield Park is let at last</span>
      </div>
      <article className="ri-prose">
        {PASSAGE.map((p, i) => <p key={i}><span className={ctx.playing && i === line ? 'ri-marker' : ''}>{p}</span></p>)}
      </article>
      <footer className="ri-foot">
        <span>ch. 1 · {fmt(CHAPTER_SEC - ctx.t)} left</span>
        <span className="ri-bar"><span style={{ width: `${(ctx.t / CHAPTER_SEC) * 100}%` }} /></span>
      </footer>
    </div>
  )
}

function Listen({ ctx }) {
  useRegistration()
  const line = lineFor(ctx.t)
  const range = useRef(null)
  return (
    <div className="ri">
      <Top left={<button className="ri-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" stroke={2.2} /></button>} right={<button className="ri-ic" aria-label="More"><Icon name="more" stroke={2.2} /></button>} />
      <div className="ri-art">
        <span className="ri-tape ri-tape--l" />
        <svg viewBox="0 0 300 300" className="ri-art-svg" role="img" aria-label="Netherfield, printed in two inks">
          <defs>
            <pattern id="ri-ht" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><circle cx="3.5" cy="3.5" r="2.4" fill="var(--pink)" /></pattern>
            <pattern id="ri-ht2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)"><circle cx="3" cy="3" r="1.6" fill="var(--blue)" /></pattern>
          </defs>
          <rect width="300" height="300" fill="var(--paper)" />
          <circle cx="205" cy="105" r="58" fill="url(#ri-ht)" />
          <g className="ri-art-blue">
            <path d="M0 205 C 60 170, 130 195, 180 178 S 270 160, 300 172 V300 H0Z" fill="url(#ri-ht2)" />
            <path d="M0 238 C 70 215, 140 236, 210 222 S 280 210, 300 216 V300 H0Z" fill="var(--blue)" opacity=".85" />
            <rect x="64" y="186" width="54" height="30" fill="var(--blue)" /><path d="M58 188 L91 166 L124 188Z" fill="var(--blue)" />
          </g>
        </svg>
      </div>
      <Over as="h1" className="ri-h2 ri-center">Chapter 1</Over>
      <p className="ri-meta ri-center">Pride and Prejudice · read by Aiden</p>

      <div className="ri-time"><Over as="span" className="ri-time-big">{fmt(ctx.t)}</Over><span className="ri-hand">of {fmt(CHAPTER_SEC)}</span></div>
      <input ref={range} className="ri-range" type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))}
        aria-label="Position" style={{ '--p': `${(ctx.t / CHAPTER_SEC) * 100}%` }} />

      <div className="ri-transport">
        <button className="ri-dot" aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
        <button className="ri-dot ri-dot--big" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}>
          <Icon name={ctx.playing ? 'pause' : 'play'} size={32} />
        </button>
        <button className="ri-dot" aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
      </div>
      <div className="ri-chips">
        {['1.0× speed', 'Voice: Aiden', 'Sleep: off', 'Chapters'].map(c => <button key={c} className="ri-chip">{c}</button>)}
      </div>

      <section className="ri-transcript">
        <span className="ri-hand">following along</span>
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx}><span className={idx === line ? 'ri-marker' : 'ri-faded'}>{p}</span></p>
        })}
      </section>
      <h2 className="ri-hand ri-hand--h">background sound</h2>
      <div className="ri-chips">
        {AMBIENT.map((a, i) => <button key={a} className={`ri-chip${i === 2 ? ' is-on' : ''}`}>{a}</button>)}
      </div>
      <p className="ri-fine">Your companion stays on ch. 1 until you say otherwise.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="ri ri--preview">
      <Over className="ri-h1">Reading pile</Over>
      <div className="ri-preview-row">
        <Cover book={BOOKS[0]} tilt={-3} />
        <Cover book={BOOKS[1]} tilt={2} />
        <Cover book={BOOKS[3]} tilt={-1} />
      </div>
    </div>
  )
}
