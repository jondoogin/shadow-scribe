/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useState } from 'react'
import { BOOKS, CHAT, NOTES } from '../../sample.js'
import { CHAPTER_SEC, fmt } from '../../shared.jsx'
import { transition, TAB_C, BAND, bandStyle, PlayGlyph, PauseGlyph } from './ui.jsx'
import { SpMark, SpLockup } from './mark.jsx'
import { Library } from './library.jsx'
import { Companion } from './companion.jsx'
import { Reader } from './reader.jsx'
import { Listen } from './listen.jsx'
import { Brand } from './brand.jsx'
import './spectrum.css'

// Spectrum, round six: the direction John picked, refined into a working
// prototype. The whole app is one component so state (playback, highlights,
// notes, the spoiler boundary) carries across screens, and screen changes run
// as View Transitions so bands can morph from one screen into the next.

export const meta = {
  id: 'spectrum', name: 'Spectrum', defaultMode: 'light', immersive: true,
  tagline: 'Lantern’s light, split into bands of colour',
  signature: 'Colour-block bands that morph between screens, giant numerals, a live spectrogram, and a working companion',
  research: 'Refined from round five into a clickable prototype. Daylight is solid colour fields on white paper; Night is black with the colour moved into type and edges. Every book owns one colour, and that band follows you from the library into the companion, reader and player. The flame mark keeps its four squares but folds up out of a row of spectrum bars and pulses while Lantern reads.',
}

const VIEWS = ['library', 'companion', 'reader', 'listen', 'brand']
const ORDER = { brand: -1, library: 0, companion: 1, reader: 2, listen: 3 }
const TABS = [
  { id: 'library', label: 'Library' },
  { id: 'companion', label: 'Companion' },
  { id: 'reader', label: 'Read' },
  { id: 'listen', label: 'Listen' },
]
const NOTE_C = ['#FF5B2E', '#3D5AFE', '#00B39A', '#FFB627']

export function App({ ctx, screen }) {
  const want = VIEWS.includes(screen) ? screen : 'library'
  const [view, setView] = useState(want)
  const [seenScreen, setSeenScreen] = useState(screen)
  if (screen !== seenScreen) { setSeenScreen(screen); if (want !== view) setView(want) }

  const [mode, setMode] = useState(ctx.mode)
  const [seenMode, setSeenMode] = useState(ctx.mode)
  if (ctx.mode !== seenMode) { setSeenMode(ctx.mode); setMode(ctx.mode) }

  const [reached, setReached] = useState(1)
  const [chat, setChat] = useState(CHAT.map((m, i) => ({ ...m, id: i })))
  const [notes, setNotes] = useState(NOTES.map((n, i) => ({ ...n, c: NOTE_C[i], id: i })))
  const [marks, setMarks] = useState({})
  const [prefs, setPrefs] = useState({ size: 20, leading: 1.7, page: 'match', face: 'serif' })
  const [listen, setListen] = useState({ rate: 1, voice: 'Aiden', sleep: null, amb: 'Fireplace' })
  const [cTab, setCTab] = useState('ask')
  const [pendingAsk, setPendingAsk] = useState(null)
  const [toast, setToast] = useState(null)
  const [heard, setHeard] = useState(false)
  const [endDone, setEndDone] = useState(false)

  const go = (next, opts = {}) => {
    if (next === view) return
    const dir = opts.dir || ((ORDER[next] ?? 0) >= (ORDER[view] ?? 0) ? 'fwd' : 'back')
    transition(() => { setView(next); window.scrollTo(0, 0) }, { dir })
    ctx.go(next)
  }
  const toggleMode = (e) => {
    const r = e?.currentTarget?.getBoundingClientRect()
    const next = mode === 'dark' ? 'light' : 'dark'
    transition(() => setMode(next), { kind: 'reveal', origin: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined })
    ctx.setMode(next)
  }
  const say = (text, c = '#FF5B2E') => setToast({ text, c, id: Date.now() })
  const pickBook = (b) => transition(() => ctx.setBook(b), { kind: 'morph' })
  const play = (on = !ctx.playing) => {
    if (on) { setHeard(true); setEndDone(false); if (ctx.t >= CHAPTER_SEC) ctx.setT(0) }
    ctx.setPlaying(on)
  }

  const app = {
    ...ctx, mode, view, go, toggleMode, say, pickBook, play, heard,
    reached, setReached, chat, setChat, notes, setNotes, marks, setMarks, prefs, setPrefs,
    listen, setListen, cTab, setCTab, pendingAsk, setPendingAsk, endDone, setEndDone,
    exit: () => ctx.exit(),
  }
  const Screen = { library: Library, companion: Companion, reader: Reader, listen: Listen, brand: Brand }[view]
  const pct = (ctx.t / CHAPTER_SEC) * 100

  return (
    <div className={`lx lx--spectrum lx--${mode} sp-root`} data-view={view}>
      <main className="sp-app" key={view}>
        <Screen app={app} />
      </main>

      {heard && view !== 'listen' && (
        <div className="sp-mini" style={bandStyle('pp')}>
          <span className="sp-mini-fill" style={{ width: `${pct}%` }} />
          <button className="sp-mini-open" onClick={() => go('listen')} aria-label="Open player">
            <SpMark size={26} live={ctx.playing} />
            <span className="sp-mini-t"><b>Chapter 1</b><span>{fmt(ctx.t)} · {BOOKS[0].title}</span></span>
          </button>
          <button className="sp-mini-btn" onClick={() => play()} aria-label={ctx.playing ? 'Pause' : 'Play'}>
            {ctx.playing ? <PauseGlyph /> : <PlayGlyph />}
          </button>
        </div>
      )}

      <nav className="sp-tabs-bar" aria-label="Lantern">
        {TABS.map(t => (
          <button key={t.id} className={view === t.id ? 'is-on' : ''} style={{ '--tc': TAB_C[t.id] }} onClick={() => go(t.id)} aria-current={view === t.id ? 'page' : undefined}>
            <i aria-hidden="true" /><span>{t.label}</span>
          </button>
        ))}
      </nav>

      {toast && <div className="sp-toast" key={toast.id} style={{ '--tc': toast.c }} role="status"><i aria-hidden="true" />{toast.text}</div>}
    </div>
  )
}


export const screens = {}
export function Preview() {
  return (
    <div className="sp-pv">
      <div className="sp-pv-hero" style={bandStyle('pp')}>
        <SpLockup size={20} />
        <span className="sp-pv-n">64<small>%</small></span>
      </div>
      {['je', 'md', 'gg', 'fr'].map(id => <div key={id} className="sp-pv-band" style={{ background: BAND[id].c, color: BAND[id].on }}>{BOOKS.find(b => b.id === id).title}</div>)}
    </div>
  )
}
