import { useEffect, useRef, useState } from 'react'
import { PaintRenderer } from './paintRenderer.js'
import { VISUAL_MOTION } from './motion.js'

// The painterly stage: one WebGL canvas. Falls back to two crossfading <img>
// layers when WebGL is unavailable or its context is lost.
//
// Props
//   image      { id, src, strokes?, focus? } | null   what the gate allows now
//   drift      slow drift and zoom
//   shimmer    living-paint shimmer
//   paused     narration paused: the painting holds still
//   reduced    Reduced Motion: no paint-in, drift or shimmer; 1 s fade
//   paintInMs  length of the paint-in
//   grain      paper grain strength
//   className, style
export default function VisualStage({ image, drift = true, shimmer = true, paused = false, reduced = false, paintInMs = VISUAL_MOTION.paintInMs, grain = VISUAL_MOTION.grain, className = '', style }) {
  const canvasRef = useRef(null)
  const rendererRef = useRef(null)
  const [fallback, setFallback] = useState(() => !webglAvailable())

  // Create the renderer once.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || fallback) return
    let r
    try { r = new PaintRenderer(canvas, { paper: readPaper() }) } catch (e) {
      console.warn('[visual] WebGL stage unavailable, using the simple fallback', e)
      queueMicrotask(() => setFallback(true))
      return
    }
    rendererRef.current = r
    const fit = () => { const b = canvas.getBoundingClientRect(); r.resize(b.width, b.height, window.devicePixelRatio || 1) }
    fit()
    const ro = new ResizeObserver(fit); ro.observe(canvas)
    const onLost = (e) => { e.preventDefault(); setFallback(true) }
    canvas.addEventListener('webglcontextlost', onLost)
    // Repaint the paper when the theme changes.
    const mo = new MutationObserver(() => r.setPaper(readPaper()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-mood'] })
    return () => { ro.disconnect(); mo.disconnect(); canvas.removeEventListener('webglcontextlost', onLost); r.dispose(); rendererRef.current = null }
  }, [fallback])

  useEffect(() => { rendererRef.current?.configure({ drift, shimmer, paused, reduced, paintInMs, grain }) }, [drift, shimmer, paused, reduced, paintInMs, grain, fallback])
  useEffect(() => { rendererRef.current?.show(image || null) }, [image?.id, fallback]) // eslint-disable-line react-hooks/exhaustive-deps

  if (fallback) return <FallbackStage image={image} drift={drift && !reduced && !paused} reduced={reduced} paintInMs={paintInMs} className={className} style={style} />
  return <canvas ref={canvasRef} className={`visual-stage ${className}`} style={style} aria-hidden="true" data-image={image?.id || ''} />
}

function FallbackStage({ image, drift, reduced, paintInMs, className, style }) {
  const [layers, setLayers] = useState([])   // [{ image, key }]
  const seq = useRef(0)
  useEffect(() => {
    setLayers(prev => (image ? [...prev.slice(-1), { image, key: `${image.id}:${++seq.current}` }] : prev.slice(-1).map(l => ({ ...l, out: true }))))
  }, [image?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const ms = reduced ? VISUAL_MOTION.reducedFadeMs : Math.min(paintInMs, 6_000)
  return (
    <div className={`visual-stage visual-stage-fallback ${className}`} style={style} aria-hidden="true" data-image={image?.id || ''}>
      {layers.map((l, i) => (
        <div key={l.key} className="visual-layer"
          style={{ opacity: l.out ? 0 : 1, animation: i === layers.length - 1 && !l.out ? `visualFadeIn ${ms}ms ease both` : undefined, transition: `opacity ${ms}ms ease` }}>
          <img src={l.image.src} alt="" className={drift ? 'visual-drift' : undefined}
            style={{ objectPosition: `${(l.image.focus?.x ?? 0.5) * 100}% ${(l.image.focus?.y ?? 0.5) * 100}%` }} />
        </div>
      ))}
    </div>
  )
}

// Checked once per page; the probe context is released at once, because
// browsers cap live WebGL contexts and every stage needs its own.
let webglOk = null
function webglAvailable() {
  if (webglOk !== null) return webglOk
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    webglOk = !!gl
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { webglOk = false }
  return webglOk
}

function readPaper() {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#eeeae6'
    const c = document.createElement('canvas').getContext('2d')
    c.fillStyle = v
    const hex = c.fillStyle
    const n = parseInt(hex.slice(1), 16)
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  } catch { return [0.93, 0.92, 0.9] }
}
