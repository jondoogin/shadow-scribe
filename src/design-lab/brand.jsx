/* eslint-disable react-refresh/only-export-components -- design-lab helper module */

// The Lantern mark, as used on readwithlantern.com: four rounded squares
// turned 45° and set in a diamond, coloured like a flame from pale top to
// ember bottom.
const PANES = { t: [50, 21], l: [21, 50], r: [79, 50], b: [50, 79] }
export const HEAT = { t: '#D3C2A6', l: '#A47044', r: '#D69058', b: '#AA5634' }
const INK_OPACITY = { t: 0.5, l: 0.8, r: 0.65, b: 1 }

export function FlameMark({ size = 28, tone = 'heat', live = false, className = '' }) {
  const fills = tone === 'heat' ? HEAT : tone === 'ink' ? null : tone
  return (
    <svg className={`lx-flame${live ? ' lx-flame--live' : ''} ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {Object.entries(PANES).map(([k, [x, y]]) => (
        <rect key={k} className={`lx-pane lx-pane--${k}`} x={x - 17} y={y - 17} width="34" height="34" rx="8.5"
          transform={`rotate(45 ${x} ${y})`} fill={fills ? fills[k] : 'currentColor'} opacity={fills ? 1 : INK_OPACITY[k]} />
      ))}
    </svg>
  )
}

// Logotype lockups for the Field Lab family. All pair the mark with "Lantern".
export function Lockup({ kind = 'fieldlab', size = 20 }) {
  if (kind === 'fieldlab') {
    return (
      <span className="lk lk--fieldlab" style={{ fontSize: size }}>
        <span className="lk-reticle"><FlameMark size={size * 1.05} live /></span>
        <span className="lk-word">LANTERN</span>
      </span>
    )
  }
  return (
    <span className={`lk lk--${kind}`} style={{ fontSize: size }}>
      <FlameMark size={size * 1.15} live />
      <span className="lk-word">Lantern</span>
    </span>
  )
}

// A book as a physical object, coloured from its palette. Each direction
// styles .lx-cover through its own CSS.
export function Cover({ book, size = 'md', children }) {
  const [a, b] = book.palette
  return (
    <span className={`lx-cover lx-cover--${size}`} style={{ '--c1': a, '--c2': b }}>
      <span className="lx-cover-title">{book.title}</span>
      <span className="lx-cover-author">{book.author.split(' ').slice(-1)[0]}</span>
      {children}
    </span>
  )
}
