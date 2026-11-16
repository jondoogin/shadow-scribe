import { useEffect, useState } from 'react'
import { PASSAGE } from '../../sample.js'
import { Icon, CHAPTER_SEC, lineFor } from '../../shared.jsx'
import { Sheet, Seg } from './ui.jsx'

const HL = ['#FFB627', '#FF8FB1', '#7CC4FF', '#00B39A']

export function Reader({ app }) {
  const [sel, setSel] = useState(null)
  const [aa, setAa] = useState(false)
  const [scroll, setScroll] = useState(0)
  const now = app.heard ? lineFor(app.t) : -1
  const p = app.prefs
  const setP = (patch) => app.setPrefs(v => ({ ...v, ...patch }))

  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScroll(max > 0 ? Math.min(1, window.scrollY / max) : 1)
    }
    const raf = requestAnimationFrame(on)
    window.addEventListener('scroll', on, { passive: true })
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on) }
  }, [])

  const mark = (c) => {
    app.setMarks(m => { const n = { ...m }; if (n[sel] === c) delete n[sel]; else n[sel] = c; return n })
  }
  const excerpt = sel == null ? '' : PASSAGE[sel].split(' ').slice(0, 9).join(' ') + '…'
  const note = () => {
    app.setNotes(ns => [{ tag: `Highlight · ¶${sel + 1}`, quote: excerpt, text: 'Saved from chapter 1.', c: app.marks[sel] || HL[0], id: Date.now() }, ...ns])
    if (!app.marks[sel]) app.setMarks(m => ({ ...m, [sel]: HL[0] }))
    app.say('Saved to your notes in the companion.', '#FFB627'); setSel(null)
  }
  const ask = () => { app.setPendingAsk(`Tell me about this line: “${excerpt}”`); app.go('companion', { dir: 'back' }) }
  const listenHere = () => { app.setT(Math.ceil((sel / PASSAGE.length) * CHAPTER_SEC) + 1); app.play(true); app.go('listen') }
  const pct = Math.round(scroll * 100)

  return (
    <div className={`sp-reader sp-page--${p.page} sp-face--${p.face}`} style={{ '--fs': `${p.size}px`, '--lh': p.leading }}>
      <header className="sp-top sp-pad sp-reader-top">
        <button className="sp-ic" onClick={() => app.go('companion', { dir: 'back' })} aria-label="Back to companion"><Icon name="back" /></button>
        <span className="sp-top-c">Chapter 1 · <b>{pct}%</b></span>
        <div className="sp-top-r">
          <button className="sp-ic sp-aa" onClick={() => setAa(true)} aria-label="Text settings">Aa</button>
          <button className="sp-ic" onClick={() => app.go('listen')} aria-label="Listen"><Icon name="headphones" /></button>
        </div>
        <span className="sp-rprog" aria-hidden="true"><i style={{ transform: `scaleX(${scroll})` }} /></span>
      </header>

      <div className="sp-pad">
        <header className="sp-chap">
          <span className="sp-chap-n">01</span>
          <span className="sp-chap-w"><b>Chapter one</b><span>6 min read · 9 paragraphs</span></span>
        </header>
        <article className="sp-prose">
          {PASSAGE.map((t, i) => (
            <p key={i} style={{ '--i': i, '--hl': app.marks[i] }}
              className={`${i === now ? 'is-now' : ''}${sel === i ? ' is-sel' : ''}${app.marks[i] ? ' is-marked' : ''}`}
              onClick={() => setSel(sel === i ? null : i)}>
              {t}
            </p>
          ))}
        </article>
        <p className="sp-fine sp-endnote">End of the sample. Tap any paragraph to highlight it, save it, ask about it or listen from there.</p>
      </div>

      <div className={`sp-selbar${sel != null ? ' is-open' : ''}`} inert={sel == null}>
        <div className="sp-selbar-hl" role="group" aria-label="Highlight colour">
          {HL.map(c => <button key={c} style={{ '--c': c }} className={app.marks[sel] === c ? 'is-on' : ''} onClick={() => mark(c)} aria-label={`Highlight ${c}`} />)}
        </div>
        <button onClick={note}>Note</button>
        <button onClick={ask}>Ask</button>
        <button onClick={listenHere}>Listen here</button>
        <button className="sp-x" onClick={() => setSel(null)} aria-label="Clear selection">✕</button>
      </div>

      <Sheet open={aa} onClose={() => setAa(false)} title="Text" accent="#FFB627">
        <label className="sp-range">
          <span>Size</span>
          <span className="sp-range-a" style={{ fontSize: 14 }}>A</span>
          <input type="range" min={16} max={28} value={p.size} onChange={e => setP({ size: Number(e.target.value) })} aria-label="Text size" />
          <span className="sp-range-a" style={{ fontSize: 24 }}>A</span>
        </label>
        <div className="sp-field"><span>Spacing</span><Seg items={[{ id: 1.5, label: 'Tight' }, { id: 1.7, label: 'Comfy' }, { id: 1.95, label: 'Airy' }]} value={p.leading} onChange={v => setP({ leading: v })} color="#FFB627" on="#17100C" /></div>
        <div className="sp-field"><span>Page</span><Seg items={[{ id: 'match', label: 'Match app' }, { id: 'paper', label: 'Paper' }, { id: 'ember', label: 'Ember' }, { id: 'night', label: 'Night' }]} value={p.page} onChange={v => setP({ page: v })} color="#FFB627" on="#17100C" /></div>
        <div className="sp-field"><span>Type</span><Seg items={[{ id: 'serif', label: 'Serif' }, { id: 'sans', label: 'Sans' }]} value={p.face} onChange={v => setP({ face: v })} color="#FFB627" on="#17100C" /></div>
      </Sheet>
    </div>
  )
}
