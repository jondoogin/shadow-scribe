import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import VisualStage from '../atmosphere/visual/VisualStage.jsx'
import ReaderBackdrop, { BACKDROP_DEFAULT_STRENGTH, BACKDROP_MAX_STRENGTH } from '../atmosphere/visual/ReaderBackdrop.jsx'
import { buildSampleJourney, SAMPLE_SECTION } from '../atmosphere/visual/sampleJourney.js'
import { useVisualJourney, usePrefersReducedMotion } from '../atmosphere/visual/useVisualJourney.js'
import { VISUAL_MOTION } from '../atmosphere/visual/motion.js'
import { Ico } from '../components/shared/icons.jsx'

// Visual Journey preview: the painterly stage and the Reader backdrop with
// sample paintings and a short sample story, so the motion can be judged on
// a real screen before any generated images exist. Nothing here touches a
// book, the companion or stored positions.

const SPEEDS = [
  { v: 1, label: 'Real time' },
  { v: 5, label: '5× story' },
]
const WPS = 2.6   // narration pace, words per second (~155 wpm)

export default function VisualPreviewPage() {
  const journey = useMemo(() => buildSampleJourney(`${import.meta.env.BASE_URL || '/'}visual-samples/`), [])
  const { segments, blocks, scenes, images, sectionOrder } = journey
  const [mode, setMode] = useState('listen')
  const [seg, setSeg] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [motion, setMotion] = useState(true)
  const [shimmer, setShimmer] = useState(true)
  const [simReduced, setSimReduced] = useState(false)
  const [strength, setStrength] = useState(BACKDROP_DEFAULT_STRENGTH)
  const [backdropMotion, setBackdropMotion] = useState(false)
  const [clearPage, setClearPage] = useState(false)
  const [scrollBlock, setScrollBlock] = useState(null)
  const prefersReduced = usePrefersReducedMotion()
  const reduced = prefersReduced || simReduced

  useEffect(() => { document.title = 'Visual journey preview — Lantern' }, [])

  // Simulated narration: one segment at a time at narration pace.
  useEffect(() => {
    if (!playing) return
    if (seg >= segments.length - 1) { setPlaying(false); return } // eslint-disable-line react-hooks/set-state-in-effect
    const s = segments[seg]
    const ms = ((s.text.split(/\s+/).length / WPS) * 1000 + s.pauseAfterMs) / speed
    const t = setTimeout(() => setSeg(i => Math.min(segments.length - 1, i + 1)), ms)
    return () => clearTimeout(t)
  }, [playing, seg, speed, segments])

  // Position: the spoken segment while playing (or in Listen); the top
  // visible paragraph when reading without narration.
  const position = useMemo(() => {
    if (mode === 'read' && !playing && scrollBlock) return { sectionId: SAMPLE_SECTION, blockId: scrollBlock }
    const s = segments[seg]
    return { sectionId: SAMPLE_SECTION, blockId: s.blockId, segmentId: s.id }
  }, [mode, playing, scrollBlock, seg, segments])

  const { image, waitingId } = useVisualJourney({ images, sectionOrder, position, minOnScreenMs: VISUAL_MOTION.minOnScreenMs / speed })

  const current = segments[seg]
  const sceneIndex = blocks.find(b => b.id === position.blockId)?.scene ?? 0
  const jump = (startBlock) => {
    const i = segments.findIndex(s => s.blockId === startBlock)
    setSeg(Math.max(0, i))
    setScrollBlock(startBlock)
    if (mode === 'read') document.getElementById(`vj-${startBlock}`)?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
  }

  const status = image
    ? `Painting: ${scenes[image.sceneIndex].title}`
    : 'No painting yet: the first appears once you have heard the passage it was made from.'

  return (
    <div className={`vj-preview vj-mode-${mode}`}>
      {mode === 'read' && <ReaderBackdrop image={image} strength={strength} motion={backdropMotion} paused={!playing} reduced={reduced} hidden={clearPage} />}

      <div className="vj-head">
        <Link to="/library" className="listen-link inline-flex items-center gap-1.5"><Ico.Left /> Library</Link>
        <h1 className="vj-title">Visual journey</h1>
        <p className="listen-dim vj-sub">A preview with sample paintings drawn by code, not by an image model, and a short story written for it.</p>
        <div className="vj-tabs" role="tablist" aria-label="Where to preview">
          <button role="tab" aria-selected={mode === 'listen'} className={mode === 'listen' ? 'active' : ''} onClick={() => setMode('listen')}>Listen</button>
          <button role="tab" aria-selected={mode === 'read'} className={mode === 'read' ? 'active' : ''} onClick={() => setMode('read')}>Reader backdrop</button>
        </div>
      </div>

      {mode === 'listen' && (
        <section className="vj-listen" aria-label="Listen preview">
          <VisualStage image={image} drift={motion} shimmer={motion && shimmer} paused={!playing} reduced={reduced} className="vj-stage" />
          <div className="vj-veil" />
          <div className="vj-caption">
            <p className="vj-scene">{scenes[sceneIndex].title}</p>
            <p className="vj-line" aria-live="polite">{current.text}</p>
          </div>
        </section>
      )}

      <div className="vj-controls">
        <button className="listen-btn vj-play" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Ico.Pause /> : <Ico.Play />} <span>{playing ? 'Pause' : seg ? 'Resume' : 'Play the story'}</span>
        </button>
        {mode === 'read' && (
          <button className="listen-link" aria-pressed={clearPage} onClick={() => setClearPage(c => !c)}>{clearPage ? 'Show backdrop' : 'Clear page'}</button>
        )}
        <div className="vj-scenes" aria-label="Jump to a scene">
          {scenes.map(s => (
            <button key={s.id} className={s.index === sceneIndex ? 'active' : ''} onClick={() => jump(s.startBlock)} title={s.title}>{s.index + 1}</button>
          ))}
        </div>
      </div>
      <p className="listen-dim vj-status" data-testid="vj-status">
        {status}{waitingId ? ' · the story has moved on; the next painting is waiting out its minimum time on screen' : ''}
      </p>

      <details className="vj-settings">
        <summary>Preview settings</summary>
        <div className="vj-settings-body">
          <label>Story speed
            <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
              {SPEEDS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </label>
          <p className="listen-dim">5× moves the story along faster so you can see several changes. Paint-ins, drift and shimmer always run at real speed.</p>
          {mode === 'listen' && <>
            <label className="vj-check"><input type="checkbox" checked={motion} onChange={e => setMotion(e.target.checked)} /> Drift</label>
            <label className="vj-check"><input type="checkbox" checked={shimmer} disabled={!motion} onChange={e => setShimmer(e.target.checked)} /> Living paint (shimmer)</label>
          </>}
          {mode === 'read' && <>
            <label>Backdrop strength {Math.round(strength * 100)}%
              <input type="range" min="0" max={BACKDROP_MAX_STRENGTH} step="0.01" value={strength} onChange={e => setStrength(Number(e.target.value))} />
            </label>
            <label className="vj-check"><input type="checkbox" checked={backdropMotion} onChange={e => setBackdropMotion(e.target.checked)} /> Motion behind text</label>
          </>}
          <label className="vj-check"><input type="checkbox" checked={simReduced || prefersReduced} disabled={prefersReduced} onChange={e => setSimReduced(e.target.checked)} /> Reduced Motion{prefersReduced ? ' (on in your system settings)' : ''}</label>
        </div>
      </details>

      {mode === 'read' && (
        <ReaderPreview blocks={blocks} activeBlock={playing ? current.blockId : null} onTopBlock={setScrollBlock} follow={playing} reduced={reduced} />
      )}
    </div>
  )
}

function ReaderPreview({ blocks, activeBlock, onTopBlock, follow, reduced }) {
  const ref = useRef(null)
  // Paused: the top paragraph on screen is the position (as in the Reader).
  useEffect(() => {
    // Track every paragraph inside the reading band, not just the ones that
    // changed in this callback, so the position is never further on than the
    // topmost paragraph actually being read.
    const inBand = new Set()
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => (e.isIntersecting ? inBand.add(e.target) : inBand.delete(e.target)))
      const top = [...inBand].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0]
      if (top) onTopBlock(top.dataset.block)
    }, { rootMargin: '-20% 0px -60% 0px' })
    ref.current?.querySelectorAll('[data-block]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [onTopBlock])
  // Playing: follow the narrated paragraph.
  useEffect(() => {
    if (follow && activeBlock) document.getElementById(`vj-${activeBlock}`)?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }, [follow, activeBlock, reduced])
  return (
    <article ref={ref} className="reader-text vj-reader" lang="en">
      {blocks.map(b => b.type === 'break'
        ? <hr key={b.id} id={`vj-${b.id}`} data-block={b.id} className="reader-break" />
        : <p key={b.id} id={`vj-${b.id}`} data-block={b.id} className={activeBlock === b.id ? 'reader-narrating' : undefined}>{b.text}</p>)}
    </article>
  )
}
