import SectionHeading from '../shared/SectionHeading.jsx'
import { getCharacterView, getEffectiveMode } from '../../utils/spoiler.js'
import { useSettings } from '../../context/SettingsContext.jsx'

const REL_COLORS = {
  love:      'var(--ca, #B8860B)',
  ally:      '#3A6647',
  tension:   '#9B2335',
  hierarchy: '#78716C',
  neutral:   '#A8A29E',
}

export default function RelationshipMap({ book }) {
  const { settings } = useSettings()
  const mode = getEffectiveMode(book, settings)
  const { main = [], secondary = [], relationships = [] } = book.characters || {}

  // Gate characters through spoiler system — null = filtered in strict mode
  const mainViews      = main.map(c => getCharacterView(book, c, mode)).filter(Boolean)
  const secondaryViews = secondary.map(c => getCharacterView(book, c, mode)).filter(Boolean)
  const all            = [...mainViews, ...secondaryViews]

  if (!relationships.length || all.length < 2) return null

  const protagonist = mainViews[0]
  if (!protagonist) return null
  const others = [...mainViews.slice(1), ...secondaryViews].slice(0, 5)

  const CX = 150, CY = 120, R = 88
  const positions = { [protagonist.id]: { x: CX, y: CY } }
  others.forEach((c, i) => {
    const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2
    positions[c.id] = { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) }
  })

  const nodeById = Object.fromEntries(all.map(c => [c.id, c]))
  const visible  = relationships.filter(r => positions[r.from] && positions[r.to])

  const anyVeiled = all.some(c => c._veiled)

  return (
    <div>
      <SectionHeading>Relationship Dynamics</SectionHeading>
      <div className="bg-cream-50 border border-ink-200 rounded-2xl p-4 mb-4 overflow-hidden">
        <svg width="300" height="240" viewBox="0 0 300 240" className="w-full max-w-[300px] mx-auto block">
          {visible.map((rel, i) => {
            const f    = positions[rel.from], t = positions[rel.to]
            const fromChar = nodeById[rel.from], toChar = nodeById[rel.to]
            const isVeiled = fromChar?._veiled || toChar?._veiled
            const color = isVeiled ? '#A8A29E' : (REL_COLORS[rel.type] || REL_COLORS.neutral)
            const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2
            const angle = Math.atan2(t.y - f.y, t.x - f.x)
            const ox = Math.sin(angle) * 7, oy = -Math.cos(angle) * 7
            return (
              <g key={i}>
                <line x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                  stroke={color} strokeWidth="1.5"
                  strokeOpacity={isVeiled ? 0.15 : 0.25}
                  strokeDasharray="3 3" />
                {!isVeiled && (
                  <text x={mx + ox} y={my + oy} textAnchor="middle"
                    fontSize="8.5" fill={color} opacity="0.75"
                    fontFamily="var(--font-sans)" fontStyle="italic">
                    {rel.label}
                  </text>
                )}
              </g>
            )
          })}

          {Object.entries(positions).map(([id, pos]) => {
            const char = nodeById[id]; if (!char) return null
            const isProto  = id === protagonist.id
            const isVeiled = char._veiled
            const init = char.name.replace(/\s*\(.*\)/, '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <g key={id} transform={`translate(${pos.x},${pos.y})`} className="rel-map-node" style={{ cursor:'default' }}>
                <circle r={isProto ? 22 : 17}
                  fill={
                    isVeiled  ? 'var(--color-cream-200, #F2EBE0)'
                    : isProto ? 'var(--ca-bg, #FDF8EC)'
                    : 'var(--color-cream-50, #FFFDF9)'
                  }
                  stroke={
                    isVeiled  ? 'var(--color-ink-200, #E7E5E0)'
                    : isProto ? 'var(--ca, #B8860B)'
                    : 'var(--color-ink-300, #D6D3D1)'
                  }
                  strokeWidth={isProto ? 2 : 1.5}
                  opacity={isVeiled ? 0.6 : 1}
                />
                <text textAnchor="middle" dominantBaseline="central"
                  fontSize={isProto ? 10 : 9} fontWeight="600"
                  fill={
                    isVeiled  ? 'var(--color-ink-300, #D6D3D1)'
                    : isProto ? 'var(--ca, #B8860B)'
                    : 'var(--color-ink-600, #57534E)'
                  }
                  fontFamily="var(--font-sans)"
                  fontStyle={isVeiled ? 'italic' : 'normal'}
                >{isVeiled ? '?' : init}</text>
                <text y={isProto ? 31 : 25} textAnchor="middle"
                  fontSize="8.5"
                  fill={isVeiled ? 'var(--color-ink-300, #D6D3D1)' : 'var(--color-ink-500, #78716C)'}
                  fontFamily="var(--font-sans)"
                  fontStyle={isVeiled ? 'italic' : 'normal'}
                >
                  {isVeiled ? '···' : char.name.replace(/\s*\(.*\)/, '').split(' ')[0]}
                </text>
              </g>
            )
          })}
        </svg>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
          {Object.entries(REL_COLORS)
            .filter(([k]) => visible.some(r => r.type === k && !nodeById[r.from]?._veiled && !nodeById[r.to]?._veiled))
            .map(([k, c]) => (
              <span key={k} className="flex items-center gap-1 text-[10px] text-ink-400">
                <span className="inline-block w-3 h-px" style={{ background: c, opacity:.7 }} />
                {k}
              </span>
            ))
          }
        </div>
      </div>
      {anyVeiled && mode !== 'full' && (
        <p className="text-[11px] text-ink-400 text-center italic -mt-1 mb-4">
          Some connections are still unfolding.
        </p>
      )}
    </div>
  )
}
