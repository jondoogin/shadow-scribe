import { useState } from 'react'
import { PASSAGE, AMBIENT } from '../../sample.js'
import { Icon, CHAPTER_SEC, fmt, lineFor } from '../../shared.jsx'
import { bandStyle, Sheet, PlayGlyph, PauseGlyph } from './ui.jsx'
import { SpMark } from './mark.jsx'

const COLS = 30
const ROWS = 12
const RATES = [0.8, 1, 1.25, 1.5, 2]
const VOICES = [
  { id: 'Aiden', c: '#FF5B2E', kind: 'Built-in', note: 'Warm and even. The default.' },
  { id: 'Ryan', c: '#3D5AFE', kind: 'Built-in', note: 'Brighter, a little faster.' },
  { id: 'Lamplighter', c: '#00B39A', kind: 'Designed in Lantern', note: 'Low and unhurried, made for 19th-century prose.' },
]
const SLEEP = [{ id: null, label: 'Off' }, { id: 15, label: '15 min' }, { id: 30, label: '30 min' }, { id: 'end', label: 'End of chapter' }]

// A fixed pseudo-random level for each cell, so the spectrogram looks like
// speech without changing on every render.
function level(c, r) {
  const base = Math.sin(c * 1.73 + r * 0.91) * 0.5 + Math.sin(c * 0.41 - r * 0.37) * 0.5
  const low = 1 - r / ROWS
  return Math.max(0, Math.min(6, Math.round((base * 0.5 + 0.5) * low * 5.2 + low * 1.6)))
}

function Spectrogram({ t, playing, setT }) {
  const now = Math.min(COLS - 1, Math.floor((t / CHAPTER_SEC) * COLS))
  const cells = []
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const on = c <= now
      cells.push(<i key={`${c}-${r}`} className={`${on ? `h${level(c, r)}` : ''}${c === now ? ' is-now' : ''}`} style={{ gridColumn: c + 1, gridRow: ROWS - r, '--d': `${((c * 7 + r * 13) % 10) / 10}s` }} />)
    }
  }
  return (
    <div className={`sp-gram${playing ? ' is-playing' : ''}`}>
      <div className="sp-gram-grid" aria-hidden="true">{cells}</div>
      <input type="range" min={0} max={CHAPTER_SEC} value={t} onChange={e => setT(Number(e.target.value))} aria-label="Position in chapter" />
    </div>
  )
}

function Karaoke({ t }) {
  const line = lineFor(t)
  const per = CHAPTER_SEC / PASSAGE.length
  const frac = Math.min(1, (t - line * per) / per)
  const words = PASSAGE[line].split(' ')
  const lit = Math.floor(frac * words.length)
  return (
    <section className="sp-karaoke" aria-live="off">
      {line > 0 && <p className="sp-k-dim">{PASSAGE[line - 1]}</p>}
      <p className="sp-k-now" key={line}>{words.map((w, i) => <span key={i} className={i < lit ? 'is-lit' : ''}>{w} </span>)}</p>
      {line < PASSAGE.length - 1 && <p className="sp-k-dim">{PASSAGE[line + 1]}</p>}
    </section>
  )
}

export function Listen({ app }) {
  const [sheet, setSheet] = useState(null)
  const L = app.listen
  const setL = (patch) => app.setListen(v => ({ ...v, ...patch }))
  const left = (CHAPTER_SEC - app.t) / L.rate
  const ended = app.t >= CHAPTER_SEC && !app.endDone
  const voice = VOICES.find(v => v.id === L.voice)

  const nextRate = () => { const r = RATES[(RATES.indexOf(L.rate) + 1) % RATES.length]; setL({ rate: r }) }
  const seek = (v) => { app.setT(Math.max(0, Math.min(CHAPTER_SEC, v))); app.setEndDone(false) }

  return (
    <div className="sp-listen">
      <section className="sp-player-head" style={{ ...bandStyle('pp'), viewTransitionName: 'band-pp' }}>
        <header className="sp-top">
          <button className="sp-ic" onClick={() => app.go('companion', { dir: 'back' })} aria-label="Close player"><Icon name="down" /></button>
          <span className="sp-top-c"><SpMark size={18} live={app.playing} /> Now playing</span>
          <button className="sp-ic" onClick={() => setSheet('chapters')} aria-label="Chapters"><Icon name="list" /></button>
        </header>
        <p className="sp-clock" aria-label={`${fmt(app.t)} of ${fmt(CHAPTER_SEC)}`}>{fmt(app.t)}</p>
        <p className="sp-clock-sub"><b>Chapter 1</b> · Pride and Prejudice · {fmt(left)} left{L.rate !== 1 ? ` at ${L.rate}×` : ''}</p>
      </section>

      <Spectrogram t={app.t} playing={app.playing} setT={seek} />

      <div className="sp-keys">
        <button onClick={() => seek(app.t - 15)} aria-label="Back 15 seconds"><span>−15</span></button>
        <button className={`sp-key-go${app.playing ? ' is-playing' : ''}`} onClick={() => app.play()} aria-label={app.playing ? 'Pause' : 'Play'}>
          {app.playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>
        <button onClick={() => seek(app.t + 15)} aria-label="Forward 15 seconds"><span>+15</span></button>
      </div>

      <div className="sp-pad">
        <div className="sp-tools">
          <button onClick={nextRate} style={{ '--c': '#FFB627' }}><b>{L.rate}×</b><span>Speed</span></button>
          <button onClick={() => setSheet('voice')} style={{ '--c': voice.c }}><b>{L.voice}</b><span>Voice</span></button>
          <button onClick={() => setSheet('sleep')} style={{ '--c': '#7CC4FF' }}><b>{L.sleep == null ? 'Off' : L.sleep === 'end' ? 'Ch. end' : `${L.sleep}m`}</b><span>Sleep</span></button>
        </div>

        <Karaoke t={Math.min(app.t, CHAPTER_SEC - 1)} />

        <h2 className="sp-h2">Ambience <span>{L.amb === 'Off' ? 'off' : 'dips while Aiden speaks'}</span></h2>
        <div className="sp-amb">
          {AMBIENT.map((a, i) => (
            <button key={a} className={L.amb === a ? 'is-on' : ''} onClick={() => setL({ amb: a })} style={{ '--c': ['#17100C', '#7CC4FF', '#FF5B2E', '#00B39A', '#3D5AFE', '#FF8FB1'][i], '--on': i === 0 || i === 4 ? '#FFFFFF' : '#17100C' }}>
              {L.amb === a && a !== 'Off' && <span className={`sp-eq${app.playing ? ' is-ducked' : ''}`} aria-hidden="true"><i /><i /><i /></span>}
              {a}
            </button>
          ))}
        </div>
        <p className="sp-fine">Your companion stays at chapter {app.reached} until you move it. Finishing a chapter only asks.</p>
        <button className="sp-chip sp-chip--ghost" onClick={() => { app.setT(CHAPTER_SEC - 4); app.play(true) }}>Demo: skip to the last few seconds</button>
      </div>

      <Sheet open={sheet === 'voice'} onClose={() => setSheet(null)} title="Narrator" accent="#FF5B2E">
        <ul className="sp-voices">
          {VOICES.map(v => (
            <li key={v.id}>
              <button className={L.voice === v.id ? 'is-on' : ''} style={{ '--c': v.c }} onClick={() => { setL({ voice: v.id }); setSheet(null); app.say(`${v.id} will read this book. Your Mac makes the new audio next time it runs.`, v.c) }}>
                <i /><span><b>{v.id}</b><span>{v.kind} · {v.note}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={sheet === 'sleep'} onClose={() => setSheet(null)} title="Sleep timer" accent="#7CC4FF">
        <div className="sp-sleep">
          {SLEEP.map(s => <button key={String(s.id)} className={L.sleep === s.id ? 'is-on' : ''} onClick={() => { setL({ sleep: s.id }); setSheet(null) }}>{s.label}</button>)}
        </div>
      </Sheet>

      <Sheet open={sheet === 'chapters'} onClose={() => setSheet(null)} title="Chapters" accent="#00B39A">
        <ol className="sp-chapters">
          {Array.from({ length: 12 }, (_, i) => {
            const open = i < app.reached
            return (
              <li key={i} className={`${open ? '' : 'is-sealed'}${i === 0 ? ' is-now' : ''}`}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <b>Chapter {i + 1}</b>
                <em>{i === 0 ? `${fmt(app.t)} / 6:12` : open ? 'Ready' : 'Sealed'}</em>
              </li>
            )
          })}
          <li className="is-sealed sp-chapters-more"><span>…</span><b>49 more</b><em>Sealed</em></li>
        </ol>
      </Sheet>

      <Sheet open={ended} onClose={() => app.setEndDone(true)} title="Chapter 1 finished" accent="#3D5AFE">
        <p className="sp-sheet-p">Move your companion to chapter 2? It will start discussing chapter 2, and everything after it stays sealed.</p>
        <button className="sp-btn sp-btn--wide" style={{ '--c': '#3D5AFE', '--on': '#fff' }} onClick={() => { app.setReached(Math.max(app.reached, 2)); app.setEndDone(true); app.say('Companion moved to chapter 2.', '#3D5AFE') }}>Yes, I’m on chapter 2</button>
        <button className="sp-btn sp-btn--wide sp-btn--plain" onClick={() => app.setEndDone(true)}>Not yet</button>
      </Sheet>
    </div>
  )
}
