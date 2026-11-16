import { BOOKS, FILTERS, PASSAGE, CHAT, REFLECTION, NOTES, TABS, AMBIENT } from './sample.js'
import { FolioSky, Scribble } from './signatures.jsx'
import { skyLabel, SKY_PHASES } from './sky.js'

export const CHAPTER_SEC = 372

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// ── Icons ────────────────────────────────────────────────────────────────────
const I = {
  search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M15 5l-7 7 7 7" />,
  down: <path d="M6 9l6 6 6-6" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />,
  pause: <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none" />,
  prev: <path d="M6 6v12M18 6 9 12l9 6V6Z" />,
  next: <path d="M18 6v12M6 6l9 6-9 6V6Z" />,
  rew: <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />,
  fwd: <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" />,
  send: <path d="M5 12h13M13 6l6 6-6 6" />,
  shield: <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z M9 12l2 2 4-4" />,
  headphones: <path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3Zm16 0a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3Z" />,
  book: <path d="M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4Zm0 12a4 4 0 0 1 4-4h9" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  wave: <path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10" />,
  text: <path d="M4 7V5h16v2M12 5v14M9 19h6" />,
}
export function Icon({ name, size = 20, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{I[name]}</svg>
  )
}

// ── Brand ────────────────────────────────────────────────────────────────────
export function Logo({ size = 22 }) {
  return (
    <span className="dl-logo" style={{ fontSize: size }}>
      <span className="dl-logo-star">✦</span>
      <span className="dl-logo-word">Lantern</span>
    </span>
  )
}

export function Cover({ book, size = 'md' }) {
  const [a, b, c] = book.palette
  return (
    <div className={`dl-cover dl-cover--${size}`}
      style={{ background: `radial-gradient(120% 80% at 20% 10%, ${b} 0%, transparent 55%), linear-gradient(160deg, ${a} 0%, ${a} 55%, ${c} 140%)` }}>
      <span className="dl-cover-rule" style={{ background: c }} />
      <span className="dl-cover-title">{book.title}</span>
      <span className="dl-cover-author">{book.author}</span>
    </div>
  )
}

export function ListenArt({ book, className = '' }) {
  const [a, b, c] = book.palette
  return (
    <svg className={`dl-art ${className}`} viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${book.title} artwork`}>
      <defs>
        <linearGradient id={`sky-${book.id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={a} /><stop offset="0.7" stopColor={b} /><stop offset="1" stopColor="#FFF1DC" />
        </linearGradient>
      </defs>
      <rect width="300" height="300" fill={`url(#sky-${book.id})`} />
      <circle cx="210" cy="120" r="34" fill="#FFF4D6" opacity=".9" />
      <path d="M0 210 C 60 170, 120 190, 170 175 S 260 150, 300 170 V300 H0Z" fill={c} opacity=".55" />
      <path d="M0 240 C 70 215, 140 235, 200 220 S 280 205, 300 215 V300 H0Z" fill={c} opacity=".8" />
      <g fill={a} opacity=".85">
        <rect x="70" y="196" width="46" height="26" /><path d="M66 198 L93 182 L120 198Z" />
        <rect x="80" y="205" width="5" height="7" fill="#FFE7A8" /><rect x="100" y="205" width="5" height="7" fill="#FFE7A8" />
      </g>
      <path d="M0 268 C 80 250, 170 270, 300 255 V300 H0Z" fill="#1A1A1A" opacity=".35" />
    </svg>
  )
}

function Progress({ value, thin }) {
  return (
    <div className={`dl-progress${thin ? ' dl-progress--thin' : ''}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${value}%` }} />
    </div>
  )
}

function TopBar({ left, title, right }) {
  return (
    <header className="dl-top">
      <div className="dl-top-side">{left}</div>
      {title && <div className="dl-top-title">{title}</div>}
      <div className="dl-top-side dl-top-side--end">{right}</div>
    </header>
  )
}

function IconBtn({ name, label, onClick }) {
  return <button className="dl-iconbtn" aria-label={label} onClick={onClick}><Icon name={name} /></button>
}

function Eyebrow({ children }) { return <p className="dl-eyebrow">{children}</p> }

function Masthead({ ctx, className, children }) {
  if (ctx.dir !== 'folio') return <div className={className}>{children}</div>
  return <FolioSky phase={ctx.phase}><div className={className}>{children}</div></FolioSky>
}

function SkyChip({ ctx }) {
  if (ctx.dir !== 'folio') return null
  const next = SKY_PHASES[(SKY_PHASES.indexOf(ctx.phase) + 1) % SKY_PHASES.length]
  return (
    <button className="dl-skychip" onClick={() => ctx.setPhase(next)} aria-label={`Sky: ${skyLabel(ctx.phase)}. Tap to preview ${skyLabel(next)}`}>
      <span className="dl-skychip-dot" /> {skyLabel(ctx.phase)}{ctx.phaseOverride ? '' : ' · now'}
    </button>
  )
}

// ── Mini player ─────────────────────────────────────────────────────────────
export function MiniPlayer({ ctx }) {
  const pp = BOOKS[0]
  return (
    <div className="dl-mini" role="region" aria-label="Now playing">
      <button className="dl-mini-main" onClick={() => ctx.go('listen')}>
        <ListenArt book={pp} className="dl-mini-art" />
        <span className="dl-mini-text">
          <span className="dl-mini-title">Chapter 1</span>
          <span className="dl-mini-sub">Pride and Prejudice · {fmt(CHAPTER_SEC - ctx.t)} left</span>
        </span>
      </button>
      <button className="dl-mini-play" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}>
        <Icon name={ctx.playing ? 'pause' : 'play'} size={22} />
      </button>
      <span className="dl-mini-bar" style={{ width: `${(ctx.t / CHAPTER_SEC) * 100}%` }} />
    </div>
  )
}

// ── Library ─────────────────────────────────────────────────────────────────
export function LibraryScreen({ ctx }) {
  const book = ctx.book
  const greeting = (() => {
    const h = new Date().getHours()
    return h < 5 ? 'Up late?' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  })()
  const margin = ctx.dir === 'margin'
  return (
    <div className="dl-screen">
      <TopBar left={<Logo />} right={<><IconBtn name="search" label="Search" /><IconBtn name="plus" label="New companion" /></>} />

      <Masthead ctx={ctx} className="dl-hero-head">
        <SkyChip ctx={ctx} />
        <p className="dl-kicker">{greeting}</p>
        <h1 className="dl-h1">
          <span className="dl-rel">Your library{margin && <Scribble kind="underline" className="dl-under" />}</span>
        </h1>
      </Masthead>

      <button className="dl-card dl-continue" onClick={() => ctx.go(book.id === 'pp' ? 'listen' : 'companion')}>
        <Cover book={book} size="sm" />
        <span className="dl-continue-body">
          <span className="dl-pill dl-pill--accent">
            <Icon name={book.status === 'listening' ? 'headphones' : 'book'} size={13} />
            {book.status === 'listening' ? 'Listening' : book.status === 'finished' ? 'Finished' : book.status === 'next' ? 'Up next' : 'Reading'}
          </span>
          <span className="dl-continue-title">{book.title}</span>
          <span className="dl-continue-sub">
            {book.chapter ? `Chapter ${book.chapter} of ${book.chapters}` : 'Not started'}{book.minutesLeft ? ` · ${book.minutesLeft} min left` : ''}
          </span>
          <Progress value={book.id === 'pp' ? (ctx.t / CHAPTER_SEC) * 100 : book.bookPct} />
        </span>
        <span className="dl-continue-play" aria-hidden="true"><Icon name="play" size={20} /></span>
        {margin && <span className="dl-hand dl-hand--continue">pick up where you left off <Scribble kind="arrow" className="dl-hand-arrow" delay={0.6} /></span>}
      </button>

      <div className="dl-chips" role="tablist" aria-label="Filter">
        {FILTERS.map((f, i) => (
          <button key={f} role="tab" aria-selected={i === 0} className={`dl-chip${i === 0 ? ' is-on' : ''}`}>{f}</button>
        ))}
      </div>

      <div className="dl-grid">
        {BOOKS.map((b, i) => (
          <button key={b.id} className={`dl-book${b.id === book.id ? ' is-active' : ''}`} onClick={() => ctx.setBook(b)}
            style={margin ? { '--block': ctx.blocks[i % ctx.blocks.length] } : undefined}>
            <span className="dl-book-cover"><Cover book={b} /></span>
            <span className="dl-book-title">{b.title}</span>
            <span className="dl-book-meta">
              {b.status === 'finished' ? 'Finished' : b.status === 'next' ? 'Up next' : `Ch. ${b.chapter} of ${b.chapters}`}
            </span>
            {b.bookPct > 0 && b.bookPct < 100 && <Progress value={b.bookPct} thin />}
          </button>
        ))}
      </div>
      {ctx.dir === 'glass' && <p className="dl-footnote">Tap a book: the colour field re-tints to its cover.</p>}
    </div>
  )
}

// ── Companion (book page) ───────────────────────────────────────────────────
export function CompanionScreen({ ctx }) {
  const pp = BOOKS[0]
  const margin = ctx.dir === 'margin'
  return (
    <div className="dl-screen">
      <TopBar left={<IconBtn name="back" label="Library" onClick={() => ctx.go('library')} />} title={<Logo size={17} />}
        right={<IconBtn name="more" label="More" />} />

      <Masthead ctx={ctx} className="dl-bookhero">
        <Cover book={pp} size="lg" />
        <div className="dl-bookhero-body">
          <h1 className="dl-h2">{pp.title}</h1>
          <p className="dl-sub">{pp.author}</p>
          <p className="dl-meta">Chapter 1 of 61</p>
          <span className="dl-shield"><Icon name="shield" size={14} /> Spoiler shield · through Chapter 1</span>
        </div>
      </Masthead>

      <div className="dl-actions">
        <button className="dl-btn dl-btn--primary" onClick={() => ctx.go('listen')}><Icon name="headphones" size={18} /> Listen</button>
        <button className="dl-btn" onClick={() => ctx.go('reader')}><Icon name="book" size={18} /> Read</button>
      </div>

      <nav className="dl-tabs" aria-label="Book sections">
        {TABS.map((t, i) => <button key={t} className={`dl-tab${i === 0 ? ' is-on' : ''}`} aria-current={i === 0 ? 'page' : undefined}>{t}</button>)}
      </nav>

      <div className="dl-card dl-reflection">
        <Eyebrow><span className="dl-logo-star">✦</span> Your companion noticed</Eyebrow>
        <p className="dl-reflection-text">
          {margin ? <><span className="dl-rel">The first line<Scribble kind="circle" className="dl-circle" delay={0.4} /></span>{REFLECTION.slice('The first line'.length)}</> : REFLECTION}
        </p>
      </div>

      <div className="dl-chat" aria-label="Conversation">
        {CHAT.map((m, i) => (
          <div key={i} className={`dl-msg dl-msg--${m.who}`}>
            {m.who === 'companion' && <span className="dl-avatar" aria-hidden="true">✦</span>}
            <p className="dl-bubble">{m.text}</p>
          </div>
        ))}
        <p className="dl-chat-note"><Icon name="shield" size={12} /> Answers stay inside what you’ve read.</p>
        {margin && <span className="dl-hand dl-hand--chat">no peeking ahead, promise <Scribble kind="star" className="dl-hand-star" delay={0.9} /></span>}
      </div>

      <form className="dl-compose" onSubmit={e => e.preventDefault()}>
        <input className="dl-input" placeholder="A thought, a question, a reaction…" aria-label="Message your companion" />
        <button className="dl-send" aria-label="Send"><Icon name="send" size={18} /></button>
      </form>

      <Eyebrow>Your notes</Eyebrow>
      <div className="dl-notes">
        {NOTES.map((n, i) => (
          <div key={i} className="dl-card dl-note">
            <span className="dl-tag">{n.tag}</span>
            <p>{n.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Reader ──────────────────────────────────────────────────────────────────
export function ReaderScreen({ ctx }) {
  const margin = ctx.dir === 'margin'
  const pct = Math.round((ctx.t / CHAPTER_SEC) * 100)
  const line = lineFor(ctx.t)
  return (
    <div className="dl-screen dl-screen--reader">
      <TopBar left={<IconBtn name="back" label="Book" onClick={() => ctx.go('companion')} />}
        title={<span className="dl-top-label">Pride and Prejudice</span>}
        right={<><button className="dl-iconbtn dl-aa" aria-label="Text settings">Aa</button><IconBtn name="headphones" label="Listen" onClick={() => ctx.go('listen')} /></>} />

      <Masthead ctx={ctx} className="dl-chapter-head">
        <SkyChip ctx={ctx} />
        <span className="dl-chapter-num" aria-hidden="true">1</span>
        <Eyebrow>Chapter one</Eyebrow>
        <h1 className="dl-h2 dl-chapter-title">
          <span className="dl-rel">Netherfield Park is let at last{margin && <Scribble kind="double" className="dl-under" />}</span>
        </h1>
      </Masthead>

      <article className="dl-prose">
        {PASSAGE.map((p, i) => {
          const now = ctx.playing && i === line
          if (margin && i === 0) {
            return (
              <p key={i} className="dl-rel">
                It is a <span className="dl-rel dl-mark">truth universally acknowledged<Scribble kind="underline" className="dl-under dl-under--text" delay={0.3} /></span>, that a single man in possession of a good fortune, must be in want of a wife.
                <span className="dl-hand dl-hand--margin">irony! who’s doing the wanting?</span>
              </p>
            )
          }
          return <p key={i} className={now ? 'is-now' : undefined}>{p}</p>
        })}
      </article>

      <footer className="dl-reader-foot">
        <div className="dl-reader-foot-row"><span>Chapter 1 · {fmt(CHAPTER_SEC - ctx.t)} left</span><span>{pct}%</span></div>
        <Progress value={pct} thin />
      </footer>
    </div>
  )
}

function lineFor(t) {
  return Math.min(PASSAGE.length - 1, Math.floor((t / CHAPTER_SEC) * PASSAGE.length))
}

// ── Listen ──────────────────────────────────────────────────────────────────
export function ListenScreen({ ctx }) {
  const pp = BOOKS[0]
  const line = lineFor(ctx.t)
  const margin = ctx.dir === 'margin'
  return (
    <div className="dl-screen dl-screen--listen">
      <TopBar left={<IconBtn name="down" label="Close player" onClick={() => ctx.go('companion')} />}
        title={<span className="dl-top-label">Now playing</span>} right={<IconBtn name="more" label="More" />} />

      <div className={`dl-art-wrap${ctx.playing ? ' is-playing' : ''}`}>
        <ListenArt book={pp} className="dl-art-main" />
        <ListenArt book={pp} className="dl-art-reflect" />
      </div>

      <div className="dl-np">
        <h1 className="dl-h2">Chapter 1</h1>
        <p className="dl-sub">Pride and Prejudice · Jane Austen</p>
      </div>

      <div className="dl-scrub">
        <input type="range" min={0} max={CHAPTER_SEC} value={ctx.t} onChange={e => ctx.setT(Number(e.target.value))}
          aria-label="Position in chapter" style={{ '--p': `${(ctx.t / CHAPTER_SEC) * 100}%` }} />
        <div className="dl-scrub-times"><span>{fmt(ctx.t)}</span><span>−{fmt(CHAPTER_SEC - ctx.t)}</span></div>
      </div>

      <div className="dl-transport">
        <IconBtn name="prev" label="Previous chapter" />
        <button className="dl-iconbtn dl-skip" aria-label="Back 15 seconds" onClick={() => ctx.setT(Math.max(0, ctx.t - 15))}><Icon name="rew" size={26} /><span>15</span></button>
        <button className="dl-play" aria-label={ctx.playing ? 'Pause' : 'Play'} onClick={() => ctx.setPlaying(!ctx.playing)}>
          <Icon name={ctx.playing ? 'pause' : 'play'} size={30} />
        </button>
        <button className="dl-iconbtn dl-skip" aria-label="Forward 15 seconds" onClick={() => ctx.setT(Math.min(CHAPTER_SEC, ctx.t + 15))}><Icon name="fwd" size={26} /><span>15</span></button>
        <IconBtn name="next" label="Next chapter" />
      </div>

      <div className="dl-optrow">
        <button className="dl-opt"><b>1.0×</b><span>Speed</span></button>
        <button className="dl-opt"><b>Aiden</b><span>Voice</span></button>
        <button className="dl-opt"><Icon name="moon" size={16} /><span>Sleep</span></button>
        <button className="dl-opt"><Icon name="list" size={16} /><span>Chapters</span></button>
      </div>

      <section className="dl-card dl-transcript" aria-label="Transcript">
        <div className="dl-transcript-head">
          <Eyebrow><Icon name="text" size={12} /> Text</Eyebrow>
          <button className="dl-linkbtn" onClick={() => ctx.go('reader')}>Open in Reader</button>
        </div>
        {PASSAGE.slice(Math.max(0, line - 1), line + 2).map((p, i) => {
          const idx = Math.max(0, line - 1) + i
          return <p key={idx} className={idx === line ? 'is-now' : ''}>{p}</p>
        })}
        {margin && <span className="dl-hand dl-hand--transcript">follows the voice <Scribble kind="arrow" className="dl-hand-arrow" delay={0.5} /></span>}
      </section>

      <section className="dl-card dl-atmos" aria-label="Atmosphere">
        <Eyebrow><Icon name="wave" size={12} /> Atmosphere</Eyebrow>
        <div className="dl-chips dl-chips--wrap">
          {AMBIENT.map((a, i) => <button key={a} className={`dl-chip${i === 2 ? ' is-on' : ''}`}>{a}</button>)}
        </div>
        <label className="dl-slider-label">
          <span>Ambience</span>
          <input type="range" defaultValue={40} aria-label="Ambience volume" style={{ '--p': '40%' }}
            onInput={e => e.currentTarget.style.setProperty('--p', `${e.currentTarget.value}%`)} />
        </label>
      </section>

      <p className="dl-footnote"><Icon name="shield" size={12} /> Your companion is at Chapter 1. Listening further won’t move it unless you say so.</p>
    </div>
  )
}
