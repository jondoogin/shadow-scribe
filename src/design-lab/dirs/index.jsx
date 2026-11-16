/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useEffect, useRef } from 'react'
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, Logo, FitText, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import './index.css'

// 5 · Index — type is the interface. Swiss grid, oversized variable-width
// headlines set to fill the column, monospace data, one signal colour.

export const meta = {
  id: 'index', name: 'Index', defaultMode: 'light',
  tagline: 'Big type, strict grid, one signal colour',
  signature: 'Titles that stretch to fill the screen, and lean in as you scroll',
  research: 'Built on 2026’s “typography as the hero” and Swiss / anti-grid brutalism with monospace data. Colour is saved for one signal orange (2026’s accent of choice); no cards, no shadows, no glass.',
}

// Variable weight follows scroll velocity a little: type that leans in.
function useLean() {
  const ref = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let last = window.scrollY, v = 0, raf
    const tick = () => {
      const y = window.scrollY
      v = v * 0.85 + (y - last) * 0.15
      last = y
      const w = Math.max(-1, Math.min(1, v / 25))
      ref.current?.style.setProperty('--lean', Math.abs(w).toFixed(3))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return ref
}

function Top({ left, right }) {
  return <header className="ix-top"><div>{left}</div><div className="ix-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const ref = useLean()
  const b = ctx.book
  const pct = b.id === 'pp' ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="ix" ref={ref}>
      <Top left={<Logo size={19} />} right={<><button className="ix-ic" aria-label="Search"><Icon name="search" stroke={2} /></button><button className="ix-ic" aria-label="Add"><Icon name="plus" stroke={2} /></button></>} />
      <div className="ix-grid ix-meta-row">
        <span className="ix-mono">Library</span><span className="ix-mono">{pad2(BOOKS.length)} titles</span><span className="ix-mono ix-r">Sun 15.11</span>
      </div>

      <button className="ix-now" onClick={() => ctx.go(b.id === 'pp' ? 'listen' : 'companion')}>
        <span className="ix-now-top"><span className="ix-mono">Now · {b.status === 'listening' ? 'Listening' : 'Reading'}</span><span className="ix-mono">{Math.round(pct)}%</span></span>
        <FitText className="ix-fit ix-fit--now">{b.title}</FitText>
        <span className="ix-now-bot">
          <span className="ix-mono">{b.author}</span>
          <span className="ix-mono">Ch {pad2(b.chapter || 1)}/{b.chapters}</span>
        </span>
        <span className="ix-now-bar"><span style={{ width: `${pct}%` }} /></span>
        <span className="ix-now-go"><Icon name="play" size={16} /> Resume</span>
      </button>

      <ol className="ix-list">
        {BOOKS.map((x, i) => (
          <li key={x.id}>
            <button className={`ix-item${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
              <span className="ix-item-no">{pad2(i + 1)}</span>
              <span className="ix-item-title"><FitText max={64}>{x.title}</FitText></span>
              <span className="ix-item-meta">
                <span className="ix-mono">{x.author}</span>
                <span className="ix-mono">{x.status === 'finished' ? 'Read' : x.status === 'next' ? 'Next' : `${pad2(x.bookPct)}%`}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Companion({ ctx }) {
  const ref = useLean()
  return (
    <div className="ix" ref={ref}>
      <Top left={<button className="ix-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" stroke={2} /></button>} right={<button className="ix-ic" aria-label="More"><Icon name="more" stroke={2} /></button>} />
      <div className="ix-head">
        <FitText className="ix-fit">Pride and</FitText>
        <FitText className="ix-fit">Prejudice</FitText>
      </div>
      <div className="ix-grid ix-meta-row">
        <span className="ix-mono">Austen</span><span className="ix-mono">Ch 01/61</span><span className="ix-mono ix-r ix-signal">Safe ≤ Ch 01</span>
      </div>
      <div className="ix-actions">
        <button className="ix-btn ix-btn--signal" onClick={() => ctx.go('listen')}>Listen</button>
        <button className="ix-btn" onClick={() => ctx.go('reader')}>Read</button>
      </div>
      <nav className="ix-tabs">{['Companion', 'Cast', 'Plot', 'Questions', 'Notes'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}</nav>

      <p className="ix-reflect">{REFLECTION}</p>

      <dl className="ix-qa">
        {CHAT.map((m, i) => (
          <div key={i} className={`ix-qa-row ix-qa-row--${m.who}`}>
            <dt className="ix-mono">{m.who === 'reader' ? 'Q' : 'A ✦'}</dt>
            <dd>{m.text}</dd>
          </div>
        ))}
      </dl>
      <form className="ix-compose" onSubmit={e => e.preventDefault()}>
        <span className="ix-mono">Q</span>
        <input placeholder="Ask about chapter 1…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} stroke={2} /></button>
      </form>
      <p className="ix-mono ix-fine">Answers only use pages you’ve reached.</p>

      <div className="ix-sec"><span className="ix-mono">Notes</span><span className="ix-mono">{pad2(NOTES.length)}</span></div>
      {NOTES.map((n, i) => (
        <div key={i} className="ix-qa-row"><dt className="ix-mono">{n.tag}</dt><dd>{n.text}</dd></div>
      ))}
    </div>
  )
}

function Reader({ ctx }) {
  const ref = useLean()
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="ix ix--reader" ref={ref}>
      <Top left={<button className="ix-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" stroke={2} /></button>}
        right={<><button className="ix-ic ix-aa" aria-label="Text settings">Aa</button><button className="ix-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" stroke={2} /></button></>} />
      <div className="ix-chap"><FitText className="ix-fit ix-fit--num" max={260}>01</FitText></div>
      <div className="ix-grid ix-meta-row"><span className="ix-mono">Chapter</span><span className="ix-mono">Pride and Prejudice</span><span className="ix-mono ix-r">{Math.round(pct)}%</span></div>
      <article className="ix-prose">
        {PASSAGE.map((p, i) => (
          <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}><span className="ix-pn">{pad2(i + 1)}</span>{p}</p>
        ))}
      </article>
      <footer className="ix-foot"><span className="ix-foot-bar" style={{ width: `${pct}%` }} /><span className="ix-mono">Ch 01 — {fmt(CHAPTER_SEC - ctx.t)} left</span></footer>
    </div>
  )
}

function Listen({ ctx }) {
  const ref = useLean()
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="ix ix--listen" ref={ref}>
      <Top left={<button className="ix-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" stroke={2} /></button>} right={<button className="ix-ic" aria-label="More"><Icon name="more" stroke={2} /></button>} />
      <div className="ix-grid ix-meta-row"><span className="ix-mono">Listening</span><span className="ix-mono">Ch 01/61</span><span className="ix-mono ix-r">Aiden</span></div>
      <div className="ix-clock"><FitText className="ix-fit ix-fit--clock" max={240}>{fmt(ctx.t)}</FitText></div>
      <div className="ix-scrub">
        <span className="ix-scrub-fill" style={{ width: `${pct}%` }} />
        <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
      </div>
      <div className="ix-grid ix-meta-row"><span className="ix-mono">{fmt(ctx.t)}</span><span className="ix-mono">Pride and Prejudice</span><span className="ix-mono ix-r">−{fmt(CHAPTER_SEC - ctx.t)}</span></div>

      <div className="ix-keys">
        <button onClick={() => ctx.setT(Math.max(0, ctx.t - 15))} aria-label="Back 15 seconds">−15</button>
        <button className="ix-keys-play" onClick={() => ctx.setPlaying(!ctx.playing)}>{ctx.playing ? 'Pause' : 'Play'}</button>
        <button onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))} aria-label="Forward 15 seconds">+15</button>
      </div>
      <div className="ix-keys ix-keys--sm">
        <button>1.0×</button><button>Sleep</button><button>Chapters</button><button>Voice</button>
      </div>

      <div className="ix-sec"><span className="ix-mono">Text</span><button className="ix-mono ix-signal" onClick={() => ctx.go('reader')}>Open reader →</button></div>
      <div className="ix-lines">
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </div>

      <div className="ix-sec"><span className="ix-mono">Ambience</span></div>
      <div className="ix-tags">{AMBIENT.map((a, i) => <button key={a} className={i === 2 ? 'is-on' : ''}>{a}</button>)}</div>
      <p className="ix-mono ix-fine">Companion stays at Ch 01 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="ix ix--preview">
      <div className="ix-grid ix-meta-row"><span className="ix-mono">Now</span><span className="ix-mono">Ch 01/61</span><span className="ix-mono ix-r">64%</span></div>
      <FitText className="ix-fit">Pride and</FitText>
      <FitText className="ix-fit ix-signal">Prejudice</FitText>
    </div>
  )
}
