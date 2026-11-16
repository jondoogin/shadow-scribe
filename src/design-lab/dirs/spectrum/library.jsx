import { useState } from 'react'
import { BOOKS } from '../../sample.js'
import { Icon, CHAPTER_SEC, fmt } from '../../shared.jsx'
import { bandStyle, useCount, Sheet, Seg } from './ui.jsx'
import { SpLockup, SpMark } from './mark.jsx'

const FILTERS = [
  { id: 'all', label: 'All' }, { id: 'listening', label: 'Listening' }, { id: 'reading', label: 'Reading' },
  { id: 'finished', label: 'Done' }, { id: 'next', label: 'Next' },
]
const STATUS = { listening: 'Listening', reading: 'Reading', finished: 'Finished', next: 'Up next' }
const WEEK = [['M', 22], ['T', 41], ['W', 12], ['T', 56], ['F', 30], ['S', 74], ['S', 18]]
const WEEK_C = ['#FF5B2E', '#FFB627', '#00B39A', '#3D5AFE', '#FF8FB1', '#FF5B2E', '#7CC4FF']
const IMPORT = ['Reading the EPUB', 'Finding 86 chapters', 'Sealing every chapter you haven’t reached', 'On your shelf']

export const Sun = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>

export function ModeButton({ app }) {
  return (
    <button className="sp-ic" onClick={app.toggleMode} aria-label={app.mode === 'dark' ? 'Switch to Daylight' : 'Switch to Night'}>
      {app.mode === 'dark' ? <Sun /> : <Icon name="moon" />}
    </button>
  )
}

export function Library({ app }) {
  const b = app.book
  const isPP = b.id === 'pp'
  const pct = isPP ? (app.t / CHAPTER_SEC) * 100 : b.bookPct
  const n = useCount(Math.round(pct))
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState(false)
  const [q, setQ] = useState('')
  const [add, setAdd] = useState(false)
  const [imp, setImp] = useState(-1)
  const list = BOOKS.filter(x => x.id !== b.id && (filter === 'all' || x.status === filter))
  const found = BOOKS.filter(x => !q || `${x.title} ${x.author}`.toLowerCase().includes(q.toLowerCase()))

  const resume = () => {
    if (!isPP) { app.say('Only Pride and Prejudice has sample pages in this demo.', b.palette[0]); return }
    app.play(true); app.go('listen')
  }
  const runImport = () => {
    setImp(0)
    IMPORT.forEach((_, i) => setTimeout(() => {
      setImp(i)
      if (i === IMPORT.length - 1) setTimeout(() => { setAdd(false); setImp(-1); app.say('Middlemarch is ready. All 86 chapters are sealed until you reach them.', '#00B39A') }, 900)
    }, 700 * i + 300))
  }

  return (
    <div className="sp-lib">
      <section className="sp-hero" style={{ ...bandStyle(b.id), viewTransitionName: `band-${b.id}` }}>
        <header className="sp-top">
          <button className="sp-logo" onClick={() => app.go('brand')} aria-label="About the Lantern brand"><SpLockup size={22} intro /></button>
          <div className="sp-top-r">
            <button className="sp-ic" onClick={() => setSearch(true)} aria-label="Search"><Icon name="search" /></button>
            <button className="sp-ic" onClick={() => setAdd(true)} aria-label="Add a book"><Icon name="plus" /></button>
            <ModeButton app={app} />
          </div>
        </header>
        <p className="sp-kicker"><i className="sp-pulse" aria-hidden="true" />{STATUS[b.status]} · Chapter {b.chapter || '—'} of {b.chapters}</p>
        <p className="sp-giant" aria-label={`${Math.round(pct)} percent`}><span className="sp-giant-n">{Math.round(n)}</span><span className="sp-giant-u">%</span></p>
        <p className="sp-giant-cap">{isPP ? `through chapter 1 · ${fmt(CHAPTER_SEC - app.t)} left` : 'through the book'}</p>
        <h1 className="sp-title">{b.title}</h1>
        <p className="sp-by">{b.author}</p>
        <div className="sp-meter" aria-hidden="true">
          {Array.from({ length: 32 }, (_, i) => <i key={i} className={i < (pct / 100) * 32 ? 'is-on' : ''} style={{ '--i': i }} />)}
        </div>
        <div className="sp-actions">
          <button className="sp-btn sp-btn--solid" onClick={resume}>{isPP ? <><Icon name="play" size={16} /> Resume listening</> : 'Continue'}</button>
          <button className="sp-btn" onClick={() => (isPP ? app.go('companion') : app.say('Only Pride and Prejudice has a companion in this demo.', b.palette[0]))}>Companion</button>
        </div>
      </section>

      <div className="sp-pad sp-shelf-head">
        <h2 className="sp-h2">Shelf <span>{BOOKS.length} books</span></h2>
        <Seg items={FILTERS} value={filter} onChange={setFilter} color="var(--ink)" on="var(--bg)" className="sp-seg--filters" />
      </div>
      <ul className="sp-bands" key={filter}>
        {list.map((x, i) => (
          <li key={x.id} style={{ '--i': i }}>
            <button className="sp-band" style={{ ...bandStyle(x.id), viewTransitionName: `band-${x.id}` }} onClick={() => app.pickBook(x)}>
              <span className="sp-band-n">{x.status === 'finished' ? '✓' : x.bookPct}<small>{x.status === 'finished' ? '' : '%'}</small></span>
              <span className="sp-band-t"><b>{x.title}</b><span>{x.author}</span></span>
              <span className="sp-band-s">{STATUS[x.status]}</span>
            </button>
          </li>
        ))}
        {!list.length && <li className="sp-empty">Nothing here yet.</li>}
      </ul>

      <section className="sp-pad sp-week">
        <h2 className="sp-h2">This week <span>4h 13m</span></h2>
        <div className="sp-week-bars">
          {WEEK.map(([d, m], i) => (
            <div key={i} className={`sp-wk${i === 6 ? ' is-today' : ''}`} style={{ '--h': `${(m / 74) * 100}%`, '--c': WEEK_C[i], '--i': i }}>
              <span className="sp-wk-bar"><i /></span><span className="sp-wk-d">{d}</span>
            </div>
          ))}
        </div>
        <p className="sp-fine">Saturday was your longest listen: 74 minutes of Moby-Dick.</p>
      </section>

      <Sheet open={search} onClose={() => setSearch(false)} title="Find a book" accent="#3D5AFE">
        <input className="sp-input" placeholder="Title or author" value={q} onChange={e => setQ(e.target.value)} aria-label="Search books" />
        <ul className="sp-results">
          {found.map(x => (
            <li key={x.id}><button style={bandStyle(x.id)} onClick={() => { setSearch(false); app.pickBook(x) }}><i /><b>{x.title}</b><span>{x.author}</span></button></li>
          ))}
          {!found.length && <li className="sp-empty">No match for “{q}”.</li>}
        </ul>
      </Sheet>

      <Sheet open={add} onClose={() => { if (imp < 0) setAdd(false) }} title="Add a book" accent="#00B39A">
        {imp < 0 ? (
          <>
            <div className="sp-drop"><SpMark size={44} /><b>Drop an EPUB here</b><span>DRM-free books only. The text stays on this device.</span></div>
            <button className="sp-btn sp-btn--wide" style={{ '--c': '#00B39A', '--on': '#062019' }} onClick={runImport}>Try it with Middlemarch</button>
          </>
        ) : (
          <ol className="sp-steps">
            {IMPORT.map((s, i) => <li key={s} className={i < imp ? 'is-done' : i === imp ? 'is-now' : ''}><i />{s}</li>)}
          </ol>
        )}
      </Sheet>
    </div>
  )
}
