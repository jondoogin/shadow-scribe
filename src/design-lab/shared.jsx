/* eslint-disable react-refresh/only-export-components -- design-lab modules export their meta, helpers and screens together; fast refresh is irrelevant here */
import { useLayoutEffect, useRef } from 'react'
import { PASSAGE } from './sample.js'

// Chapter 1 runtime used by every direction's player.
export const CHAPTER_SEC = 372

export const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
export const pad2 = (n) => String(n).padStart(2, '0')

// Index into PASSAGE of the sentence being narrated at time t.
export function lineFor(t) {
  return Math.min(PASSAGE.length - 1, Math.floor((t / CHAPTER_SEC) * PASSAGE.length))
}

const PATHS = {
  search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M15 5l-7 7 7 7" />,
  down: <path d="M6 9l6 6 6-6" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />,
  pause: <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none" />,
  prev: <path d="M6 6v12M18 6 9 12l9 6V6Z" />,
  next: <path d="M18 6v12M6 6l9 6-9 6V6Z" />,
  rew: <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />,
  fwd: <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" />,
  send: <path d="M5 12h13M13 6l6 6-6 6" />,
  shield: <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z M9 12l2 2 4-4" />,
  headphones: <path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3Zm16 0a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3Z" />,
  book: <path d="M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4Zm0 12a4 4 0 0 1 4-4h9" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
}

export function Icon({ name, size = 20, stroke = 1.8, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{PATHS[name]}</svg>
  )
}

// The existing Lantern logo: ✦ + wordmark in Libre Baskerville. Kept as is.
export function Logo({ size = 20, className = '' }) {
  return (
    <span className={`lx-logo ${className}`} style={{ fontSize: size }}>
      <span className="lx-logo-star">✦</span><span className="lx-logo-word">Lantern</span>
    </span>
  )
}

// Sets a line of text to exactly the container width by scaling font-size.
export function FitText({ children, className = '', max = 400, min = 18 }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const parent = el.parentElement
      if (!parent) return
      el.style.fontSize = '100px'
      const cs = getComputedStyle(parent)
      const inner = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const ratio = inner / el.scrollWidth
      el.style.fontSize = `${Math.max(min, Math.min(max, 100 * ratio * 0.995))}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el.parentElement)
    document.fonts?.ready?.then(fit)
    return () => ro.disconnect()
  }, [children, max, min])
  return <span ref={ref} className={`lx-fit ${className}`}>{children}</span>
}

// A moon whose lit fraction is `phase` (0 new → 1 full), waxing from the right.
export function Moon({ phase, size = 120, lit = 'var(--moon-lit)', dark = 'var(--moon-dark)', className = '' }) {
  const r = 50
  const p = Math.max(0, Math.min(1, phase))
  // Terminator ellipse x-radius: +r at new, 0 at half, -r at full.
  const k = r * (1 - 2 * p)
  const sweepOuter = 1
  const d = `M50 0 A ${r} ${r} 0 0 ${sweepOuter} 50 100 A ${Math.abs(k)} ${r} 0 0 ${k > 0 ? 0 : 1} 50 0 Z`
  return (
    <svg className={`lx-moon ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill={dark} />
      {p > 0.005 && <path d={d} fill={lit} />}
    </svg>
  )
}
