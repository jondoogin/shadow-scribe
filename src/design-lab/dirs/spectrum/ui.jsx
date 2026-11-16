/* eslint-disable react-refresh/only-export-components -- design-lab helper module */
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

// Spectrum's colour system. Every book owns one vivid band colour. In
// Daylight the band is a solid field; in Night it drops to a deep tint and the
// vivid colour moves into the type and edges.
export const BAND = {
  pp: { c: '#FF5B2E', deep: '#2A100A', on: '#17100C' },
  je: { c: '#3D5AFE', deep: '#0D1331', on: '#FFFFFF' },
  md: { c: '#00B39A', deep: '#052420', on: '#062019' },
  gg: { c: '#FFB627', deep: '#2A1D05', on: '#17100C' },
  fr: { c: '#FF8FB1', deep: '#2C111A', on: '#17100C' },
  mm: { c: '#7CC4FF', deep: '#0A1D2E', on: '#0A1622' },
}
export const bandStyle = (id) => ({ '--c': BAND[id].c, '--deep': BAND[id].deep, '--on': BAND[id].on })

// Tab colours: each part of the app has its own colour.
export const TAB_C = { library: '#FF5B2E', companion: '#3D5AFE', reader: '#FFB627', listen: '#00B39A' }

export const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Runs a state change inside a View Transition when the browser has them.
// `dir` picks the slide direction; `origin` sets the centre of a circular
// reveal (used by the theme switch).
export function transition(update, { dir = 'fwd', kind = 'slide', origin } = {}) {
  const root = document.documentElement
  if (!document.startViewTransition || reduced()) { update(); return }
  root.dataset.spVt = kind
  root.dataset.spDir = dir
  if (origin) { root.style.setProperty('--sp-x', `${origin.x}px`); root.style.setProperty('--sp-y', `${origin.y}px`) }
  const vt = document.startViewTransition(() => flushSync(update))
  vt.finished.finally(() => { delete root.dataset.spVt; delete root.dataset.spDir })
}

// Counts a number up from zero when it first appears, then follows changes.
export function useCount(target, ms = 900) {
  const [v, setV] = useState(reduced() ? target : 0)
  const from = useRef(reduced() ? target : 0)
  useEffect(() => {
    let raf
    const start = performance.now()
    const a = from.current
    const step = (now) => {
      const k = Math.min(1, (now - start) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      const val = a + (target - a) * e
      from.current = val
      setV(val)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

// A bottom sheet. It stays mounted so it can animate out.
export function Sheet({ open, onClose, title, children, accent }) {
  return (
    <div className={`sp-sheet-wrap${open ? ' is-open' : ''}`} inert={!open} aria-hidden={!open}>
      <button className="sp-scrim" aria-label="Close" onClick={onClose} tabIndex={-1} />
      <section className="sp-sheet" role="dialog" aria-label={title} style={accent ? { '--accent': accent } : undefined}>
        <span className="sp-grab" aria-hidden="true" />
        <header className="sp-sheet-head"><h2>{title}</h2><button className="sp-x" onClick={onClose} aria-label="Close">✕</button></header>
        {children}
      </section>
    </div>
  )
}

// Segmented control with a sliding colour block behind the active item.
export function Seg({ items, value, onChange, color, on = '#fff', className = '' }) {
  const i = Math.max(0, items.findIndex(x => (x.id ?? x) === value))
  return (
    <div className={`sp-seg ${className}`} style={{ '--n': items.length, '--i': i, '--seg-c': color, '--seg-on': on }} role="tablist">
      <span className="sp-seg-pill" aria-hidden="true" />
      {items.map(x => {
        const id = x.id ?? x
        return <button key={id} role="tab" aria-selected={id === value} className={id === value ? 'is-on' : ''} onClick={() => onChange(id)}>{x.label ?? x}</button>
      })}
    </div>
  )
}

export const PlayGlyph = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></svg>
export const PauseGlyph = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h4.5v15H6zM13.5 4.5H18v15h-4.5z" fill="currentColor" /></svg>
