import { useEffect, useRef } from 'react'
import { SKY } from './sky.js'

// ── Aurora: slow, glowing colour fields drifting behind everything ───────────
export function AuroraField({ blobs, contained }) {
  return (
    <div className={`dl-layer${contained ? ' dl-layer--contained' : ''}`} aria-hidden="true">
      {blobs.map((c, i) => (
        <span key={i} className={`dl-aurora-blob dl-aurora-blob--${i}`} style={{ background: c }} />
      ))}
      <span className="dl-aurora-sheen" />
    </div>
  )
}

// ── Folio: a band of sky that follows the local time of day ─────────────────
const STARS = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 37.3) % 100, y: (i * 53.7) % 70, r: i % 3 === 0 ? 1.4 : 0.8, d: (i % 5) * 0.7,
}))

export function FolioSky({ phase, height, children }) {
  const s = SKY[phase]
  const masthead = children != null
  return (
    <div className={`dl-sky dl-sky--${phase}${masthead ? ' dl-sky--masthead' : ''}`} style={height ? { height } : undefined}>
      <div className="dl-sky-layers" aria-hidden="true">
        <div className="dl-sky-grad" style={{ background: s.grad }} />
        <span className="dl-sky-disc" style={{ background: s.disc, top: `${s.y}%`, boxShadow: `0 0 60px 20px ${s.disc}66` }} />
        {phase === 'night' && STARS.map((st, i) => (
          <span key={i} className="dl-star" style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.r * 2, height: st.r * 2, animationDelay: `${st.d}s` }} />
        ))}
        {(phase === 'day' || phase === 'dawn') && <>
          <span className="dl-cloud" style={{ top: '30%', animationDuration: '70s' }} />
          <span className="dl-cloud dl-cloud--sm" style={{ top: '52%', animationDuration: '95s', animationDelay: '-40s' }} />
        </>}
      </div>
      {masthead && <div className="dl-sky-content">{children}</div>}
    </div>
  )
}

// ── Glasshouse: a colour field made from the current book's cover ───────────
export function GlassField({ palette, contained }) {
  return (
    <div className={`dl-layer${contained ? ' dl-layer--contained' : ''}`} aria-hidden="true">
      {palette.map((c, i) => (
        <span key={i} className={`dl-glass-blob dl-glass-blob--${i}`} style={{ background: c }} />
      ))}
      <span className="dl-glass-grain" />
    </div>
  )
}

// ── Margin: hand-drawn marks that draw themselves ───────────────────────────
export function Scribble({ kind = 'underline', color = 'var(--ink)', delay = 0, className = '' }) {
  const paths = {
    underline: 'M2 9 C 30 3, 60 12, 98 5',
    double: 'M2 6 C 35 2, 65 9, 98 4 M6 11 C 40 7, 70 13, 96 9',
    circle: 'M50 3 C 20 2, 3 12, 6 22 C 10 34, 80 36, 94 22 C 102 10, 75 1, 42 5',
    arrow: 'M4 26 C 20 22, 34 14, 44 4 M34 4 L 45 3 L 44 15',
    star: 'M12 2 L15 9 L23 9 L17 14 L19 22 L12 17 L5 22 L7 14 L1 9 L9 9 Z',
  }
  const vb = { underline: '0 0 100 14', double: '0 0 100 16', circle: '0 0 100 38', arrow: '0 0 48 30', star: '0 0 24 24' }[kind]
  return (
    <svg className={`dl-scribble dl-scribble--${kind} ${className}`} viewBox={vb} preserveAspectRatio="none" aria-hidden="true">
      <path d={paths[kind]} pathLength="1" style={{ stroke: color, animationDelay: `${delay}s` }} />
    </svg>
  )
}

// ── Lumen: a soft lantern beam that follows touch and drifts when idle ──────
export function LumenBeam({ contained }) {
  const ref = useRef(null)
  useEffect(() => {
    if (contained) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const target = { x: 0.5, y: 0.35 }
    const cur = { x: 0.5, y: 0.35 }
    let last = 0
    let raf
    const onMove = (e) => {
      const p = e.touches ? e.touches[0] : e
      if (!p) return
      target.x = p.clientX / window.innerWidth
      target.y = p.clientY / window.innerHeight
      last = performance.now()
    }
    const tick = (t) => {
      if (t - last > 2500 && !reduce) {
        target.x = 0.5 + Math.sin(t / 5200) * 0.28
        target.y = 0.38 + Math.cos(t / 7100) * 0.2
      }
      const k = reduce ? 1 : 0.06
      cur.x += (target.x - cur.x) * k
      cur.y += (target.y - cur.y) * k
      if (ref.current) {
        ref.current.style.setProperty('--bx', `${(cur.x * 100).toFixed(2)}%`)
        ref.current.style.setProperty('--by', `${(cur.y * 100).toFixed(2)}%`)
      }
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('pointerdown', onMove)
    }
  }, [contained])
  return (
    <div ref={ref} className={`dl-layer dl-beam${contained ? ' dl-layer--contained' : ''}`} aria-hidden="true">
      <span className="dl-beam-light" />
      <span className="dl-beam-flicker" />
    </div>
  )
}
