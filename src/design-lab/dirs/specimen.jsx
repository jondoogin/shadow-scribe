/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, Logo, CHAPTER_SEC, fmt, pad2, lineFor } from '../shared.jsx'
import './specimen.css'

// 1 · Specimen — the library as an archive. Books are catalogued objects
// with typed accession labels; progress is a measuring rule.

export const meta = {
  id: 'specimen', name: 'Specimen', defaultMode: 'light',
  tagline: 'Your library as a private archive',
  signature: 'Typed accession labels and a measuring-rule progress bar',
  research: 'Built on 2026’s “trinket / specimen” packaging look and micro-industrial labels, on a Cloud Dancer-style stone neutral. Depth only on the object you’re holding.',
}

const code = (b) => `LNT·${pad2(BOOKS.indexOf(b) + 1)}${b.id.toUpperCase()}`
const status = (b) => ({ listening: 'In listening', reading: 'In reading', finished: 'Completed', next: 'Not begun' })[b.status]

function Rule({ value, ticks = 20 }) {
  return (
    <div className="sp-rule" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="sp-rule-ticks">
        {Array.from({ length: ticks + 1 }, (_, i) => <span key={i} className={i % 5 === 0 ? 'is-major' : ''} />)}
      </div>
      <span className="sp-rule-mark" style={{ left: `${value}%` }} />
      <span className="sp-rule-fill" style={{ width: `${value}%` }} />
    </div>
  )
}

function Obj({ book, size = 'md' }) {
  const [a, b] = book.palette
  return (
    <div className={`sp-obj sp-obj--${size}`}>
      <div className="sp-obj-book" style={{ background: `linear-gradient(170deg, ${a}, ${a} 60%, ${b} 160%)` }}>
        <span className="sp-obj-title">{book.title}</span>
        <span className="sp-obj-author">{book.author.split(' ').slice(-1)[0]}</span>
      </div>
    </div>
  )
}

function Label({ rows, title }) {
  return (
    <dl className="sp-label">
      {title && <div className="sp-label-title">{title}</div>}
      {rows.map(([k, v]) => <div key={k} className="sp-label-row"><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  )
}

function Top({ left, right, center }) {
  return (
    <header className="sp-top">
      <div>{left}</div>
      <div className="sp-top-c">{center}</div>
      <div className="sp-top-r">{right}</div>
    </header>
  )
}

function Library({ ctx }) {
  const b = ctx.book
  const pct = b.id === 'pp' ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="sp">
      <Top left={<Logo size={19} />} right={<><button className="sp-ic" aria-label="Search"><Icon name="search" /></button><button className="sp-ic" aria-label="Add a book"><Icon name="plus" /></button></>} />
      <div className="sp-head">
        <span className="sp-mono sp-dim">Collection · {pad2(BOOKS.length)} objects</span>
        <h1 className="sp-h1">On the desk</h1>
      </div>

      <section className="sp-plate">
        <button className="sp-plate-obj" onClick={() => ctx.go(b.id === 'pp' ? 'listen' : 'companion')} aria-label={`Open ${b.title}`}>
          <Obj book={b} size="lg" />
        </button>
        <div className="sp-plate-body">
          <h2 className="sp-h2">{b.title}</h2>
          <p className="sp-sub">{b.author}</p>
          <Label rows={[
            ['No.', code(b)],
            ['Status', status(b)],
            ['Position', b.chapter ? `Ch. ${pad2(b.chapter)} of ${b.chapters}` : '—'],
            ['Remaining', b.minutesLeft ? `${b.minutesLeft} min in chapter` : `${100 - b.bookPct}% of book`],
          ]} />
        </div>
        <Rule value={pct} />
        <div className="sp-plate-actions">
          <button className="sp-btn sp-btn--ink" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Resume</button>
          <button className="sp-btn" onClick={() => ctx.go('companion')}>Field notes</button>
        </div>
      </section>

      <div className="sp-section"><span className="sp-mono">Index</span><span className="sp-mono sp-dim">Sort: last opened</span></div>
      <ol className="sp-index">
        {BOOKS.map(x => (
          <li key={x.id}>
            <button className={`sp-row${x.id === b.id ? ' is-on' : ''}`} onClick={() => ctx.setBook(x)}>
              <span className="sp-mono sp-row-no">{pad2(BOOKS.indexOf(x) + 1)}</span>
              <Obj book={x} size="sm" />
              <span className="sp-row-text">
                <span className="sp-row-title">{x.title}</span>
                <span className="sp-row-meta">{x.author}</span>
              </span>
              <span className="sp-mono sp-row-stat">{x.status === 'finished' ? 'DONE' : x.status === 'next' ? '—' : `${x.bookPct || 1}%`}</span>
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
    <div className="sp">
      <Top left={<button className="sp-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sp-mono sp-dim">{code(pp)}</span>} right={<button className="sp-ic" aria-label="More"><Icon name="more" /></button>} />
      <section className="sp-bookhead">
        <Obj book={pp} size="md" />
        <div>
          <h1 className="sp-h2">{pp.title}</h1>
          <p className="sp-sub">{pp.author}, 1813</p>
          <span className="sp-stamp">Sealed beyond Ch. 01</span>
        </div>
      </section>
      <nav className="sp-tabs" aria-label="Sections">
        {['Notes', 'People', 'Plot', 'Questions', 'Discussion'].map((t, i) => <button key={t} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
      </nav>

      <article className="sp-card">
        <span className="sp-mono sp-dim">Observation · Ch. 01</span>
        <p className="sp-quote">{REFLECTION}</p>
      </article>

      <div className="sp-log" aria-label="Conversation">
        {CHAT.map((m, i) => (
          <div key={i} className={`sp-entry sp-entry--${m.who}`}>
            <span className="sp-mono sp-entry-who">{m.who === 'reader' ? 'You · 22:14' : '✦ Lantern'}</span>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <form className="sp-compose" onSubmit={e => e.preventDefault()}>
        <input placeholder="Add an observation…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
      <p className="sp-mono sp-dim sp-fine">Lantern only refers to pages you’ve reached.</p>

      <div className="sp-section"><span className="sp-mono">Your notes</span><span className="sp-mono sp-dim">{pad2(NOTES.length)}</span></div>
      {NOTES.map((n, i) => (
        <div key={i} className="sp-note">
          <span className="sp-mono sp-note-tag">{n.tag}</span>
          <p>{n.text}</p>
        </div>
      ))}
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="sp sp--reader">
      <Top left={<button className="sp-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sp-mono sp-dim">Pride and Prejudice</span>}
        right={<><button className="sp-ic sp-aa" aria-label="Text settings">Aa</button><button className="sp-ic" onClick={() => ctx.go('listen')} aria-label="Listen"><Icon name="headphones" /></button></>} />
      <header className="sp-chap">
        <span className="sp-mono sp-dim">Chapter</span>
        <span className="sp-chap-num">I</span>
      </header>
      <article className="sp-prose">
        {PASSAGE.map((p, i) => (
          <p key={i} className={ctx.playing && i === line ? 'is-now' : ''}>
            <span className="sp-pn" aria-hidden="true">{i + 1}</span>{p}
          </p>
        ))}
      </article>
      <footer className="sp-foot">
        <div className="sp-foot-row"><span className="sp-mono">Ch. 01 · {fmt(CHAPTER_SEC - ctx.t)} left</span><span className="sp-mono">{Math.round(pct)}%</span></div>
        <Rule value={pct} />
      </footer>
    </div>
  )
}

function Listen({ ctx }) {
  const pp = BOOKS[0]
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="sp">
      <Top left={<button className="sp-ic" onClick={() => ctx.go('companion')} aria-label="Close"><Icon name="down" /></button>}
        center={<span className="sp-mono sp-dim">Now playing</span>} right={<button className="sp-ic" aria-label="More"><Icon name="more" /></button>} />
      <figure className="sp-figure">
        <Obj book={pp} size="xl" />
        <figcaption className="sp-mono sp-dim">Pl. 1 — Read aloud by Aiden</figcaption>
      </figure>
      <h1 className="sp-h2 sp-center">Chapter I</h1>
      <p className="sp-sub sp-center">Pride and Prejudice</p>

      <div className="sp-counter" aria-live="off">
        <span>{fmt(ctx.t)}</span><span className="sp-dim">/</span><span className="sp-dim">{fmt(CHAPTER_SEC)}</span>
      </div>
      <input className="sp-range" type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))} aria-label="Position" />
      <Rule value={pct} ticks={30} />

      <div className="sp-transport">
        <button className="sp-key" aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}>−15</button>
        <button className="sp-key sp-key--main" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}>
          <Icon name={ctx.playing ? 'pause' : 'play'} size={22} /> {ctx.playing ? 'Pause' : 'Play'}
        </button>
        <button className="sp-key" aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}>+15</button>
      </div>

      <Label title="Playback" rows={[['Speed', '1.0×'], ['Voice', 'Aiden · Qwen3'], ['Sleep', 'End of chapter'], ['Chapters', '61']]} />

      <section className="sp-card sp-transcript">
        <span className="sp-mono sp-dim">Transcript</span>
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
      </section>

      <div className="sp-section"><span className="sp-mono">Room tone</span></div>
      <ul className="sp-checks">
        {AMBIENT.map((a, i) => (
          <li key={a}><button className={i === 2 ? 'is-on' : ''}><span className="sp-box" aria-hidden="true" />{a}</button></li>
        ))}
      </ul>
      <p className="sp-mono sp-dim sp-fine">Your companion stays at Ch. 01 until you move it.</p>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="sp sp--preview">
      <Obj book={BOOKS[0]} size="md" />
      <Label rows={[['No.', 'LNT·01PP'], ['Status', 'In listening'], ['Position', 'Ch. 01 of 61']]} />
    </div>
  )
}
