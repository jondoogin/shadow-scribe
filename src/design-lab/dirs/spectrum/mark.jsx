/* eslint-disable react-refresh/only-export-components -- design-lab helper module */

// The Lantern mark, retrofitted for Spectrum. Same four squares in a diamond
// as readwithlantern.com, but crisper corners, even gaps and a vivid heat ramp
// (yellow top, orange left, ember right, red bottom). In motion the four
// squares start as a row of spectrum bars and fold up into the flame; while
// Lantern reads aloud they pulse like a level meter.
export const MARK = { t: '#FFD23F', l: '#FF9F1C', r: '#FF5B2E', b: '#E4321F' }
const PANES = [
  // key, centre x, centre y, start offset as a bar in a row (dx, dy)
  ['l', 21, 50, -7, 0],
  ['t', 50, 21, -12, 29],
  ['r', 79, 50, -17, 0],
  ['b', 50, 79, 36, -29],
]

export function SpMark({ size = 28, intro = false, live = false, mono, className = '' }) {
  return (
    <svg className={`spm${intro ? ' spm--intro' : ''}${live ? ' spm--live' : ''} ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {PANES.map(([k, x, y, dx, dy], i) => (
        <rect key={k} className="spm-pane" x={x - 16} y={y - 16} width="32" height="32" rx="4"
          fill={mono || MARK[k]} style={{ '--i': i, '--dx': `${dx}px`, '--dy': `${dy}px` }} />
      ))}
    </svg>
  )
}

export function SpLockup({ size = 24, intro = false, live = false, stacked = false, mono }) {
  return (
    <span className={`sp-lockup${stacked ? ' sp-lockup--stacked' : ''}`} style={{ fontSize: size }}>
      <SpMark size={size * (stacked ? 2.4 : 1.05)} intro={intro} live={live} mono={mono} />
      <span className="sp-word">lantern</span>
    </span>
  )
}

export function AppIcon({ night = false, size = 76 }) {
  return (
    <span className={`sp-appicon${night ? ' sp-appicon--night' : ''}`} style={{ width: size, height: size }}>
      <SpMark size={size * 0.62} />
    </span>
  )
}
