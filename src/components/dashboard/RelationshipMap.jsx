import SectionHeading from '../shared/SectionHeading.jsx'

const REL_COLORS = {
  love:      '#B8860B',
  ally:      '#3A6647',
  tension:   '#9B2335',
  hierarchy: '#78716C',
  neutral:   '#A8A29E',
}

export default function RelationshipMap({ book }) {
  const { main = [], secondary = [], relationships = [] } = book.characters || {}
  const all = [...main, ...secondary]
  if (!relationships.length || all.length < 2) return null

  const protagonist = main[0]
  const others      = [...main.slice(1), ...secondary].slice(0, 5)
  const nodeById    = Object.fromEntries(all.map(c => [c.id, c]))

  const CX = 150, CY = 120, R = 88
  const positions = { [protagonist.id]: { x: CX, y: CY } }
  others.forEach((c, i) => {
    const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2
    positions[c.id] = { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) }
  })

  const visible = relationships.filter(r => positions[r.from] && positions[r.to])

  return (
    <div>
      <SectionHeading>Relationship Dynamics</SectionHeading>
      <div className="bg-cream-50 border border-ink-200 rounded-2xl p-4 mb-4 overflow-hidden">
        <svg width="300" height="240" viewBox="0 0 300 240" className="w-full max-w-[300px] mx-auto block">
          {visible.map((rel, i) => {
            const f = positions[rel.from], t = positions[rel.to]
            const color = REL_COLORS[rel.type] || REL_COLORS.neutral
            const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2
            const angle = Math.atan2(t.y - f.y, t.x - f.x)
            const ox = Math.sin(angle) * 7, oy = -Math.cos(angle) * 7
            return (
              <g key={i}>
                <line x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                  stroke={color} strokeWidth="1.5" strokeOpacity="0.25" strokeDasharray="3 3" />
                <text x={mx + ox} y={my + oy} textAnchor="middle"
                  fontSize="8.5" fill={color} opacity="0.75"
                  fontFamily="var(--font-sans)" fontStyle="italic">
                  {rel.label}
                </text>
              </g>
            )
          })}

          {Object.entries(positions).map(([id, pos]) => {
            const char = nodeById[id]; if (!char) return null
            const isProto = id === protagonist.id
            const init = char.name.replace(/\s*\(.*\)/, '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <g key={id} transform={`translate(${pos.x},${pos.y})`} className="rel-map-node" style={{ cursor:'default' }}>
                <circle r={isProto ? 22 : 17}
                  fill={isProto ? 'var(--ca-bg, #FDF8EC)' : 'var(--color-cream-50, #FFFDF9)'}
                  stroke={isProto ? 'var(--ca, #B8860B)' : 'var(--color-ink-300, #D6D3D1)'}
                  strokeWidth={isProto ? 2 : 1.5} />
                <text textAnchor="middle" dominantBaseline="central"
                  fontSize={isProto ? 10 : 9} fontWeight="600"
                  fill={isProto ? 'var(--ca, #B8860B)' : 'var(--color-ink-600, #57534E)'}
                  fontFamily="var(--font-sans)">{init}</text>
                <text y={isProto ? 31 : 25} textAnchor="middle"
                  fontSize="8.5" fill="var(--color-ink-500, #78716C)"
                  fontFamily="var(--font-sans)">
                  {char.name.replace(/\s*\(.*\)/, '').split(' ')[0]}
                </text>
              </g>
            )
          })}
        </svg>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
          {Object.entries(REL_COLORS)
            .filter(([k]) => visible.some(r => r.type === k))
            .map(([k, c]) => (
              <span key={k} className="flex items-center gap-1 text-[10px] text-ink-400">
                <span className="inline-block w-3 h-px" style={{ background: c, opacity:.7 }} />
                {k}
              </span>
            ))
          }
        </div>
      </div>
    </div>
  )
}
