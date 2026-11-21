import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import VisualStage from '../../atmosphere/visual/VisualStage.jsx'
import { usePrefersReducedMotion } from '../../atmosphere/visual/useVisualJourney.js'
import { Ico } from '../shared/icons.jsx'

/**
 * Full-screen listening: the painting fills the screen and the line being
 * read settles in beneath it, one sentence at a time. Only what the gate and
 * the narrator have already reached is ever shown.
 */
export default function Theatre({ plate, motion, playing, busy, line, title, chapter, onToggle, onClose }) {
  const reduced = usePrefersReducedMotion()
  const closeRef = useRef(null)
  // Keep the outgoing line for the cross-fade.
  const [lines, setLines] = useState(() => (line ? [{ text: line, key: 0 }] : []))
  const seq = useRef(0)
  useEffect(() => {
    if (!line) return
    setLines(prev => (prev[prev.length - 1]?.text === line ? prev : [...prev.slice(-1), { text: line, key: ++seq.current }]))
  }, [line])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' && e.target === document.body) { e.preventDefault(); onToggle() }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [onClose, onToggle])

  return createPortal(
    <div className="c3-theatre" role="dialog" aria-modal="true" aria-label={`${title}, full screen`}>
      <VisualStage image={plate.ready} drift={motion} shimmer={motion} paused={!playing} reduced={reduced} className="c3-theatre-stage" />
      {!plate.shown && <p className="c3-theatre-wait">The first painting appears once you’ve heard the passage it was painted from.</p>}
      <div className="c3-theatre-shade" aria-hidden="true" />
      <header className="c3-theatre-top">
        <span className="c3-theatre-meta">{title}{chapter ? ` · ${chapter}` : ''}</span>
        <button ref={closeRef} type="button" className="c3-theatre-ic" onClick={onClose} aria-label="Leave full screen"><Ico.X /></button>
      </header>
      <footer className="c3-theatre-foot">
        <div className="c3-theatre-lines" aria-live="polite">
          {lines.map((l, i) => (
            <p key={l.key} className={i === lines.length - 1 ? 'is-in' : 'is-out'}>{l.text}</p>
          ))}
        </div>
        <button type="button" className="c3-theatre-play" onClick={onToggle} disabled={busy} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Ico.Pause /> : <Ico.Play />}
        </button>
      </footer>
    </div>,
    document.body,
  )
}
