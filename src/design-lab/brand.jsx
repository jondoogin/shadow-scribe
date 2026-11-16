/* eslint-disable react-refresh/only-export-components -- design-lab helper module */

// The Lantern flame mark: a tall diamond cut into four panes that meet at a
// low centre point, like the glass of a lantern around a flame. Upper panes
// burn hotter (lighter), lower panes cooler (deeper).
//   T(20,0)  L(3,36)  R(37,36)  B(20,56)  C(20,38)
const PANES = {
  tl: 'M20 0 L3 36 L20 38 Z',
  tr: 'M20 0 L37 36 L20 38 Z',
  bl: 'M3 36 L20 56 L20 38 Z',
  br: 'M37 36 L20 56 L20 38 Z',
}

export const HEAT = { tl: '#FFD98A', tr: '#FFA238', bl: '#F0661E', br: '#B8380B' }

export function FlameMark({ size = 28, tone = 'heat', gap = 'var(--mark-gap, transparent)', live = false, className = '' }) {
  const fills = tone === 'heat' ? HEAT
    : tone === 'ink' ? { tl: 'currentColor', tr: 'currentColor', bl: 'currentColor', br: 'currentColor' }
    : tone
  return (
    <svg className={`lx-flame${live ? ' lx-flame--live' : ''} ${className}`} width={size * (40 / 56)} height={size} viewBox="-1 -1 42 58" aria-hidden="true">
      {Object.entries(PANES).map(([k, d]) => (
        <path key={k} className={`lx-pane lx-pane--${k}`} d={d} fill={fills[k]} stroke={gap} strokeWidth="1.8" strokeLinejoin="round"
          opacity={tone === 'ink' ? { tl: 1, tr: 0.78, bl: 0.6, br: 0.42 }[k] : 1} />
      ))}
    </svg>
  )
}

// Logotype lockups, one per iteration. All pair the flame mark with "Lantern".
export function Lockup({ kind, size = 20 }) {
  if (kind === 'fieldlab') {
    return (
      <span className="lk lk--fieldlab" style={{ fontSize: size }}>
        <span className="lk-reticle"><FlameMark size={size * 1.15} live /></span>
        <span className="lk-word">LANTERN</span>
      </span>
    )
  }
  if (kind === 'expedition') {
    return (
      <span className="lk lk--expedition" style={{ fontSize: size }}>
        <FlameMark size={size * 1.25} live />
        <span className="lk-stack"><span className="lk-word">Lantern</span><span className="lk-sub">Field companion</span></span>
      </span>
    )
  }
  if (kind === 'patent') {
    return (
      <span className="lk lk--patent" style={{ fontSize: size }}>
        <FlameMark size={size * 1.2} live />
        <span className="lk-stack"><span className="lk-word">Lantern</span><span className="lk-dimline" aria-hidden="true" /></span>
      </span>
    )
  }
  if (kind === 'beacon') {
    return (
      <span className="lk lk--beacon" style={{ fontSize: size }}>
        <FlameMark size={size * 1.15} live />
        <span className="lk-word">Lantern</span>
      </span>
    )
  }
  return (
    <span className="lk lk--kiln" style={{ fontSize: size }}>
      <FlameMark size={size * 1.2} live />
      <span className="lk-word">lantern</span>
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
