// The Lantern mark: four rounded squares turned 45° in a diamond. Pane
// colours come from CSS (--mk-t/l/r/b in index.css), derived from the theme
// accent, so the mark follows any accent change. `live` flickers it while
// Lantern is reading or narrating.
const PANES = { t: [50, 21], l: [21, 50], r: [79, 50], b: [50, 79] }

export default function LanternMark({ size = 22, live = false, className = '' }) {
  return (
    <svg className={`lantern-mark${live ? ' is-live' : ''} ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ overflow: 'visible', flexShrink: 0 }}>
      {Object.entries(PANES).map(([k, [x, y]]) => (
        <rect key={k} className={`p-${k}`} x={x - 17} y={y - 17} width="34" height="34" rx="8.5" transform={`rotate(45 ${x} ${y})`} />
      ))}
    </svg>
  )
}
