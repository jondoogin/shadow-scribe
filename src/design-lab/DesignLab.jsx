import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BOOKS } from './sample.js'
import { CHAPTER_SEC } from './shared.jsx'
import { FlameMark } from './brand.jsx'
import * as catalogue from './dirs/catalogue.jsx'
import * as herbarium from './dirs/herbarium.jsx'
import * as rack from './dirs/rack.jsx'
import * as guide from './dirs/guide.jsx'
import * as survey from './dirs/survey.jsx'
import './lab.css'

// Design lab, round eight: Catalogue pushed further, plus four directions
// that cross Catalogue (archive, index cards) with Field Lab (lab notebook,
// instruments, explorer), on real Lantern screens with sample, spoiler-safe
// content.
// Self-contained: it reads and writes no app data and is not linked from the app.

const DIRS = [catalogue, herbarium, rack, guide, survey]
const SCREENS = [
  { id: 'library', label: 'Library' },
  { id: 'companion', label: 'Companion' },
  { id: 'reader', label: 'Reader' },
  { id: 'listen', label: 'Listen' },
]

const FONT_HREF = 'https://fonts.googleapis.com/css2?' + [
  'family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400', 'family=Libre+Caslon+Display',
  'family=IBM+Plex+Mono:wght@400;500;600', 'family=IBM+Plex+Sans:wght@400;500;600',
  'family=Young+Serif', 'family=Courier+Prime:ital,wght@0,400;0,700;1,400',
  'family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800', 'family=Literata:ital,opsz,wght@0,7..72,400..600;1,7..72,400',
  'family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500', 'family=Spline+Sans+Mono:wght@400;500',
  'family=Libre+Baskerville:ital,wght@0,400;0,700;1,400', 'family=DM+Mono:wght@400;500', 'family=DM+Sans:opsz,wght@9..40,400..700',
  'family=Archivo:wdth,wght@62..125,100..900', 'family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400',
  'family=Caveat:wght@400..700', 'family=Source+Serif+4:ital,opsz,wght@0,8..60,400..600;1,8..60,400',
].join('&') + '&display=swap'

function useLabFonts() {
  useEffect(() => {
    if (document.getElementById('lx-fonts')) return
    const l = document.createElement('link')
    l.id = 'lx-fonts'; l.rel = 'stylesheet'; l.href = FONT_HREF
    document.head.appendChild(l)
  }, [])
}

export default function DesignLab() {
  useLabFonts()
  const [params, setParams] = useSearchParams()
  const dir = DIRS.find(d => d.meta.id === params.get('d'))
  const screen = SCREENS.find(s => s.id === params.get('s'))?.id || 'library'
  const m = params.get('m')
  const mode = m === 'dark' || m === 'light' ? m : dir?.meta.defaultMode || 'light'

  const [book, setBook] = useState(BOOKS[0])
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(Math.round(CHAPTER_SEC * 0.64))

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setT(v => Math.min(CHAPTER_SEC, v + 1)), 1000)
    return () => clearInterval(id)
  }, [playing])
  if (playing && t >= CHAPTER_SEC) setPlaying(false)
  useEffect(() => { window.scrollTo(0, 0) }, [dir, screen])
  useEffect(() => { document.title = dir ? `Lantern · ${dir.meta.name}` : 'Lantern · Design lab' }, [dir])

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v == null ? next.delete(k) : next.set(k, v)))
    setParams(next)
  }

  if (!dir) return <Overview onPick={(id) => set({ d: id, s: 'library', m: null })} />

  const ctx = {
    lockup: dir.meta.lockup, mode, book, setBook, playing, setPlaying, t, setT, go: (s) => set({ s }),
    setMode: (m) => set({ m }), exit: () => set({ d: null, s: null, m: null }),
  }
  // Immersive directions are full prototypes: they own navigation, keep their
  // state across screens and replace the lab bar with their own tab bar.
  if (dir.meta.immersive) return <dir.App ctx={ctx} screen={params.get('s') || 'library'} />
  const Screen = dir.screens[screen]
  return (
    <div className={`lx lx--${dir.meta.family || dir.meta.id} lx--${dir.meta.id} lx--${mode}`} data-screen={screen}>
      <main className="lx-app" key={`${dir.meta.id}-${screen}`}>
        <Screen ctx={ctx} />
      </main>
      <LabBar dir={dir} mode={mode} screen={screen} set={set} />
    </div>
  )
}

function LabBar({ dir, mode, screen, set }) {
  return (
    <nav className="lab-bar" aria-label="Design lab">
      <div className="lab-row">
        <button className="lab-home" onClick={() => set({ d: null, s: null, m: null })} aria-label="All directions"><FlameMark size={20} /></button>
        <div className="lab-seg lab-seg--scroll">
          {DIRS.map((d, i) => (
            <button key={d.meta.id} className={d === dir ? 'is-on' : ''} onClick={() => set({ d: d.meta.id, m: null })}>
              <span className="lab-num">{i + 1}</span>{d.meta.name}
            </button>
          ))}
        </div>
      </div>
      <div className="lab-row">
        <div className="lab-seg">
          {SCREENS.map(s => <button key={s.id} className={s.id === screen ? 'is-on' : ''} onClick={() => set({ s: s.id })}>{s.label}</button>)}
        </div>
        <button className="lab-mode" onClick={() => set({ m: mode === 'dark' ? 'light' : 'dark' })} aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
          {mode === 'dark' ? '☾' : '☀'}
        </button>
      </div>
    </nav>
  )
}

function Overview({ onPick }) {
  return (
    <div className="lab-overview">
      <header className="lab-ov-head">
        <span className="lab-ov-logo"><FlameMark size={18} /> Lantern</span>
        <h1>Catalogue and Field Lab</h1>
        <p>Catalogue, pushed further: a drawer you can see into, cards that pull up when you pick a book, a seal that stamps itself on and a loan record on Listen. Then four new directions from the Catalogue and Field Lab worlds: Herbarium, Sample Rack, Field Guide and Survey Book. Same readability rules as last round, and the tabs, filters, player and scrubber all work.</p>
        <p className="lab-ov-avoid">Still avoided: purple gradients, frosted glass, glowing blobs, Inter, and identical card grids.</p>
      </header>
      <div className="lab-ov-list">
        {DIRS.map((d, i) => {
          const P = d.Preview
          return (
            <button key={d.meta.id} className="lab-ov-card" onClick={() => onPick(d.meta.id)}>
              <div className={`lx lx--${d.meta.family || d.meta.id} lx--${d.meta.id} lx--${d.meta.defaultMode} lab-ov-preview`}><P /></div>
              <div className="lab-ov-info">
                <span className="lab-ov-num">0{i + 1}</span>
                <h2>{d.meta.name}</h2>
                <p className="lab-ov-tag">{d.meta.tagline}</p>
                <p className="lab-ov-sig">Signature: {d.meta.signature}</p>
                <p className="lab-ov-blurb">{d.meta.research}</p>
              </div>
            </button>
          )
        })}
      </div>
      <p className="lab-ov-foot">Demo content uses public-domain books. The companion only talks about chapters you’ve reached, same as the real app.</p>
    </div>
  )
}
