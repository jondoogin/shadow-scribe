/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { BOOKS, PASSAGE, CHAT, REFLECTION, NOTES, AMBIENT } from '../sample.js'
import { Icon, Logo, CHAPTER_SEC, fmt, lineFor } from '../shared.jsx'
import './shelf.css'

// 3 · Shelf — a quiet dark room with real paper in it. Tonal dark chrome,
// one physical page, books as spines, and the page stack shows how much is left.

export const meta = {
  id: 'shelf', name: 'Shelf', defaultMode: 'dark',
  tagline: 'A dark room, real paper, books on a shelf',
  signature: 'Books as spines, and a page stack that thins as you read',
  research: 'Built on dark-first done properly (tonal surfaces, no glow) with a light reading page, as in Readwise and Apple Books, plus 2026’s “depth is hierarchy”: only the page you’re reading has physical weight. Controls sit in thumb reach.',
}

const spineW = (b) => Math.round(26 + Math.min(1, b.chapters / 135) * 34)

function Spine({ book, active, onClick }) {
  const [a, b, c] = book.palette
  return (
    <button className={`sh-spine${active ? ' is-out' : ''}`} onClick={onClick} aria-pressed={active} aria-label={book.title}
      style={{ width: spineW(book), '--a': a, '--b': b, '--c': c, height: `${170 + (book.title.length % 4) * 12}px` }}>
      <span className="sh-spine-band" />
      <span className="sh-spine-title">{book.title}</span>
      <span className="sh-spine-band sh-spine-band--b" />
    </button>
  )
}

function Top({ left, center, right }) {
  return <header className="sh-top"><div>{left}</div><div className="sh-top-c">{center}</div><div className="sh-top-r">{right}</div></header>
}

function Library({ ctx }) {
  const b = ctx.book
  const pct = b.id === 'pp' ? (ctx.t / CHAPTER_SEC) * 100 : b.bookPct
  return (
    <div className="sh">
      <Top left={<Logo size={19} />} right={<button className="sh-ic" aria-label="Add a book"><Icon name="plus" /></button>} />
      <h1 className="sh-h1">Shelf</h1>
      <div className="sh-shelf" role="list">
        {BOOKS.map(x => <Spine key={x.id} book={x} active={x.id === b.id} onClick={() => ctx.setBook(x)} />)}
        <span className="sh-bookend" aria-hidden="true" />
      </div>
      <div className="sh-plank" aria-hidden="true" />

      <section className="sh-detail">
        <p className="sh-eyebrow">{b.status === 'listening' ? 'Listening' : b.status === 'finished' ? 'Finished' : b.status === 'next' ? 'Up next' : 'Reading'}</p>
        <h2 className="sh-h2">{b.title}</h2>
        <p className="sh-sub">{b.author} · {b.chapter ? `Chapter ${b.chapter} of ${b.chapters}` : `${b.chapters} chapters`}</p>
        <div className="sh-meter"><span style={{ width: `${pct}%` }} /></div>
        <div className="sh-row2">
          <button className="sh-btn sh-btn--primary" onClick={() => ctx.go('listen')}><Icon name="play" size={16} /> Listen</button>
          <button className="sh-btn" onClick={() => ctx.go('reader')}>Read</button>
          <button className="sh-btn" onClick={() => ctx.go('companion')}>Notes</button>
        </div>
      </section>

      <div className="sh-search"><Icon name="search" size={18} /><span>Search your shelf</span></div>
    </div>
  )
}

function Companion({ ctx }) {
  return (
    <div className="sh">
      <Top left={<button className="sh-ic" onClick={() => ctx.go('library')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sh-top-t">Pride and Prejudice</span>} right={<button className="sh-ic" aria-label="More"><Icon name="more" /></button>} />
      <div className="sh-seg" role="tablist">
        {['Companion', 'People', 'Plot', 'Questions', 'Notes'].map((t, i) => <button key={t} role="tab" aria-selected={i === 0} className={i === 0 ? 'is-on' : ''}>{t}</button>)}
      </div>
      <p className="sh-guard"><Icon name="shield" size={14} /> Only what you’ve read: through chapter 1</p>

      <article className="sh-paper sh-paper--card">
        <p className="sh-paper-kicker">After chapter 1</p>
        <p className="sh-paper-quote">{REFLECTION}</p>
      </article>

      <div className="sh-thread">
        {CHAT.map((m, i) => (
          <div key={i} className={`sh-msg sh-msg--${m.who}`}>
            {m.who === 'companion' && <span className="sh-msg-who">✦ Lantern</span>}
            <p>{m.text}</p>
          </div>
        ))}
      </div>

      <p className="sh-eyebrow sh-gap">Your notes</p>
      <div className="sh-list">
        {NOTES.map((n, i) => <div key={i} className="sh-list-row"><span className="sh-tag">{n.tag}</span><p>{n.text}</p></div>)}
      </div>

      <form className="sh-dock" onSubmit={e => e.preventDefault()}>
        <input placeholder="Ask about what you’ve read…" aria-label="Message your companion" />
        <button aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
    </div>
  )
}

function PageStack({ read, children, className = '' }) {
  // Edges: thickness on the left = read, on the right = remaining.
  const left = Math.max(1, Math.round(read * 10))
  const right = Math.max(1, 10 - left + 1)
  return (
    <div className={`sh-stack ${className}`} style={{ '--l': left, '--r': right }}>
      <span className="sh-stack-edge sh-stack-edge--l" aria-hidden="true" />
      <span className="sh-stack-edge sh-stack-edge--r" aria-hidden="true" />
      <div className="sh-paper sh-page">{children}</div>
    </div>
  )
}

function Reader({ ctx }) {
  const line = lineFor(ctx.t)
  return (
    <div className="sh sh--reader">
      <Top left={<button className="sh-ic" onClick={() => ctx.go('companion')} aria-label="Back"><Icon name="back" /></button>}
        center={<span className="sh-top-t">Chapter 1</span>} right={<button className="sh-ic sh-aa" aria-label="Text settings">Aa</button>} />
      <PageStack read={0.25}>
        <p className="sh-page-run">Pride and Prejudice</p>
        <h1 className="sh-page-h">Chapter I</h1>
        {PASSAGE.map((p, i) => <p key={i} className={`sh-page-p${ctx.playing && i === line ? ' is-now' : ''}`}>{p}</p>)}
        <p className="sh-page-folio">3</p>
      </PageStack>
      <p className="sh-stack-cap">The edges show how much of the book is left.</p>
      <div className="sh-dock sh-dock--bar">
        <span className="sh-dock-t">Ch. 1 · {fmt(CHAPTER_SEC - ctx.t)} left</span>
        <button className="sh-dock-play" onClick={() => { ctx.setPlaying(true); ctx.go('listen') }} aria-label="Listen from here"><Icon name="headphones" size={18} /> Listen</button>
      </div>
    </div>
  )
}

function Listen({ ctx }) {
  const line = lineFor(ctx.t)
  const pct = (ctx.t / CHAPTER_SEC) * 100
  return (
    <div className="sh sh--listen">
      <div className="sh-behind" aria-hidden="true">
        <PageStack read={0.25}>
          <h1 className="sh-page-h">Chapter I</h1>
          {PASSAGE.slice(0, 4).map((p, i) => <p key={i} className="sh-page-p">{p}</p>)}
        </PageStack>
      </div>
      <section className="sh-sheet" aria-label="Player">
        <span className="sh-handle" aria-hidden="true" />
        <div className="sh-sheet-head">
          <div>
            <p className="sh-eyebrow">Pride and Prejudice</p>
            <h1 className="sh-h2">Chapter 1</h1>
          </div>
          <button className="sh-ic" onClick={() => ctx.go('reader')} aria-label="Close player"><Icon name="down" /></button>
        </div>

        <div className="sh-lines" aria-live="off">
          {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
            const idx = Math.max(0, line - 1) + i
            return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
          })}
        </div>

        <input className="sh-range" type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))}
          aria-label="Position" style={{ '--p': `${pct}%` }} />
        <div className="sh-times"><span>{fmt(ctx.t)}</span><span>−{fmt(CHAPTER_SEC - ctx.t)}</span></div>

        <div className="sh-transport">
          <button className="sh-ic" aria-label="Previous chapter"><Icon name="prev" /></button>
          <button className="sh-skip" aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}><Icon name="rew" size={26} /><span>15</span></button>
          <button className="sh-play" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}><Icon name={ctx.playing ? 'pause' : 'play'} size={28} /></button>
          <button className="sh-skip" aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}><Icon name="fwd" size={26} /><span>15</span></button>
          <button className="sh-ic" aria-label="Next chapter"><Icon name="next" /></button>
        </div>

        <div className="sh-tiles">
          {[['1.0×', 'Speed'], ['Aiden', 'Voice'], ['Off', 'Sleep'], ['61', 'Chapters']].map(([v, k]) => (
            <button key={k} className="sh-tile"><b>{v}</b><span>{k}</span></button>
          ))}
        </div>
        <p className="sh-eyebrow sh-gap">Sound</p>
        <div className="sh-pills">
          {AMBIENT.map((a, i) => <button key={a} className={i === 2 ? 'is-on' : ''}>{a}</button>)}
        </div>
        <p className="sh-fine"><Icon name="shield" size={12} /> Your companion stays at chapter 1 until you move it.</p>
      </section>
    </div>
  )
}

export const screens = { library: Library, companion: Companion, reader: Reader, listen: Listen }
export function Preview() {
  return (
    <div className="sh sh--preview">
      <div className="sh-shelf">
        {BOOKS.map((x, i) => <Spine key={x.id} book={x} active={i === 0} onClick={() => {}} />)}
      </div>
      <div className="sh-plank" />
    </div>
  )
}
