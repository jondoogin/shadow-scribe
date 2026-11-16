import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DIRECTIONS, SCREENS, FONT_HREF, tokensFor } from './directions.js'
import { BOOKS } from './sample.js'
import { AuroraField, GlassField, LumenBeam, FolioSky, Scribble } from './signatures.jsx'
import { useSkyPhase, SKY_PHASES } from './sky.js'
import { Logo, Cover, MiniPlayer, LibraryScreen, CompanionScreen, ReaderScreen, ListenScreen, CHAPTER_SEC } from './screens.jsx'
import './lab.css'

// Design lab: five candidate visual directions for Lantern, shown on real
// Lantern screens with sample, spoiler-safe content. Self-contained: it reads
// and writes no app data and is not linked from the app.

function useLabFonts() {
  useEffect(() => {
    if (document.getElementById('dl-fonts')) return
    const l = document.createElement('link')
    l.id = 'dl-fonts'; l.rel = 'stylesheet'; l.href = FONT_HREF
    document.head.appendChild(l)
  }, [])
}

function Signature({ dir, mode, palette, contained, phase }) {
  const t = dir[mode]
  if (dir.id === 'aurora') return <AuroraField blobs={t.blobs} contained={contained} />
  if (dir.id === 'glass') return <GlassField palette={palette} contained={contained} />
  if (dir.id === 'lumen') return <LumenBeam contained={contained} />
  if (dir.id === 'folio' && contained) return <div className="dl-layer dl-layer--contained"><FolioSky phase={phase} height="100%" /></div>
  return null
}

export default function DesignLab() {
  useLabFonts()
  const [params, setParams] = useSearchParams()
  const dirId = params.get('d')
  const dir = DIRECTIONS.find(d => d.id === dirId)
  const screen = SCREENS.find(s => s.id === params.get('s'))?.id || 'library'
  const mode = params.get('m') === 'dark' || params.get('m') === 'light' ? params.get('m') : dir?.defaultMode || 'light'

  const [book, setBook] = useState(BOOKS[0])
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(Math.round(CHAPTER_SEC * 0.64))
  const [phaseOverride, setPhaseOverride] = useState(null)
  const phase = useSkyPhase(phaseOverride)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setT(v => (v >= CHAPTER_SEC ? 0 : v + 1)), 1000)
    return () => clearInterval(id)
  }, [playing])

  useEffect(() => { window.scrollTo(0, 0) }, [dirId, screen])
  useEffect(() => { document.title = dir ? `Lantern · ${dir.name}` : 'Lantern · Design lab' }, [dir])

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v == null ? next.delete(k) : next.set(k, v)))
    setParams(next)
  }

  const style = useMemo(() => (dir ? tokensFor(dir, mode) : {}), [dir, mode])

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta && dir) meta.setAttribute('content', dir[mode].bg)
  }, [dir, mode])

  if (!dir) return <Overview onPick={(id) => set({ d: id, s: 'library', m: null })} phase={phase} />

  const contentPalette = screen === 'library' ? book.palette : BOOKS[0].palette
  const ctx = {
    dir: dir.id, mode, book, setBook, playing, setPlaying, t, setT,
    phase, phaseOverride, setPhase: setPhaseOverride,
    blocks: dir[mode].blocks || [],
    go: (s) => set({ s }),
  }
  const Screen = { library: LibraryScreen, companion: CompanionScreen, reader: ReaderScreen, listen: ListenScreen }[screen]

  return (
    <div className={`dl dl--${dir.id} dl--${mode}`} style={style} data-screen={screen}>
      <Signature dir={dir} mode={mode} palette={contentPalette} />
      <main className="dl-app" key={screen}>
        <Screen ctx={ctx} />
      </main>
      {(screen === 'library' || screen === 'companion') && <MiniPlayer ctx={ctx} />}
      <LabBar dir={dir} mode={mode} screen={screen} set={set} />
    </div>
  )
}

// ── Lab controls (neutral, not part of any design) ──────────────────────────
function LabBar({ dir, mode, screen, set }) {
  return (
    <nav className="lab-bar" aria-label="Design lab">
      <div className="lab-row">
        <button className="lab-home" onClick={() => set({ d: null, s: null, m: null })} aria-label="All directions">
          <span aria-hidden="true">✦</span>
        </button>
        <div className="lab-seg lab-seg--scroll">
          {DIRECTIONS.map((d, i) => (
            <button key={d.id} className={d.id === dir.id ? 'is-on' : ''} onClick={() => set({ d: d.id, m: null })}>
              <span className="lab-num">{i + 1}</span>{d.name}
            </button>
          ))}
        </div>
      </div>
      <div className="lab-row">
        <div className="lab-seg lab-seg--fill">
          {SCREENS.map(s => (
            <button key={s.id} className={s.id === screen ? 'is-on' : ''} onClick={() => set({ s: s.id })}>{s.label}</button>
          ))}
        </div>
        <button className="lab-mode" onClick={() => set({ m: mode === 'dark' ? 'light' : 'dark' })}
          aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
          {mode === 'dark' ? '☾' : '☀'}
        </button>
      </div>
    </nav>
  )
}

// ── Overview: pick a direction ──────────────────────────────────────────────
function Overview({ onPick, phase }) {
  return (
    <div className="lab-overview">
      <header className="lab-ov-head">
        <span className="lab-ov-logo">✦ Lantern</span>
        <h1>Five new directions</h1>
        <p>Each one keeps the logo and rethinks everything else: colour, type, surfaces and one signature effect. Open one, then flip between Library, Companion, Reader and Listen, and try light and dark.</p>
      </header>
      <div className="lab-ov-list">
        {DIRECTIONS.map((d, i) => {
          const mode = d.defaultMode
          return (
            <button key={d.id} className="lab-ov-card" onClick={() => onPick(d.id)}>
              <div className={`dl dl--${d.id} dl--${mode} lab-ov-preview`} style={tokensFor(d, mode)}>
                <Signature dir={d} mode={mode} palette={BOOKS[0].palette} contained phase={phase || SKY_PHASES[1]} />
                <div className="lab-ov-mini">
                  <Logo size={18} />
                  <div className="lab-ov-row">
                    <Cover book={BOOKS[i % BOOKS.length]} size="sm" />
                    <div className="lab-ov-text">
                      <span className="dl-h3">
                        <span className="dl-rel">{BOOKS[i % BOOKS.length].title}{d.id === 'margin' && <Scribble kind="underline" className="dl-under" />}</span>
                      </span>
                      <span className="dl-sub">Chapter {BOOKS[i % BOOKS.length].chapter || 1}</span>
                      <span className="dl-progress"><span style={{ width: '58%' }} /></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lab-ov-info">
                <span className="lab-ov-num">0{i + 1}</span>
                <h2>{d.name}</h2>
                <p className="lab-ov-tag">{d.tagline}</p>
                <p className="lab-ov-sig">Signature: {d.signature}</p>
                <p className="lab-ov-blurb">{d.blurb}</p>
              </div>
            </button>
          )
        })}
      </div>
      <p className="lab-ov-foot">Demo content uses public-domain books. The companion only talks about chapters you’ve reached, same as the real app.</p>
    </div>
  )
}
