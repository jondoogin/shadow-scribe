import SectionHeading from '../shared/SectionHeading.jsx'
import { getCharacterView, getEffectiveMode } from '../../utils/spoiler.js'
import { useSettings } from '../../context/SettingsContext.jsx'

// ── Type colors — quiet accent, never dominant ──────────────────────────────
const TYPE_COLOR = {
  love:      'var(--ca, #B8860B)',
  ally:      '#3A6647',
  tension:   '#9B2335',
  hierarchy: '#78716C',
  neutral:   '#A8A29E',
}

const TYPE_LABEL = {
  love:      'love',
  ally:      'ally',
  tension:   'tension',
  hierarchy: 'hierarchy',
  neutral:   'connection',
}

// First-name helper — relationships read more naturally without honorifics or
// parenthetical descriptors. Falls back to whole name when there's no space.
function firstName(name) {
  if (!name) return ''
  const stripped = name.replace(/\s*\(.*\)/, '').trim()
  return stripped.split(' ')[0]
}

export default function RelationshipMap({ book }) {
  const { settings } = useSettings()
  const mode = getEffectiveMode(book, settings)
  const { main = [], secondary = [], relationships = [] } = book.characters || {}

  // Gate characters through spoiler system
  const mainViews      = main.map(c => getCharacterView(book, c, mode)).filter(Boolean)
  const secondaryViews = secondary.map(c => getCharacterView(book, c, mode)).filter(Boolean)
  const allChars       = [...mainViews, ...secondaryViews]
  const charById       = Object.fromEntries(allChars.map(c => [c.id, c]))

  // Filter to relationships where both endpoints survive the spoiler gate
  const visible = relationships.filter(r => charById[r.from] && charById[r.to])
  if (!visible.length) return null

  // Group by type — veiled relationships go into a separate '__veiled' bucket
  const TYPE_ORDER = { love: 0, ally: 1, tension: 2, hierarchy: 3, neutral: 4 }
  const groups = {}
  visible.forEach(rel => {
    const isVeiled = charById[rel.from]._veiled || charById[rel.to]._veiled
    const key = isVeiled ? '__veiled' : (rel.type || 'neutral')
    if (!groups[key]) groups[key] = []
    groups[key].push(rel)
  })

  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (a === '__veiled') return 1
    if (b === '__veiled') return -1
    return (TYPE_ORDER[a] ?? 9) - (TYPE_ORDER[b] ?? 9)
  })

  const anyVeiled = '__veiled' in groups

  return (
    <div className="mt-2">
      <SectionHeading>Relationships</SectionHeading>

      <div className="space-y-5 mb-4">
        {groupKeys.map(groupKey => {
          const group = groups[groupKey]
          const isVeiledGroup = groupKey === '__veiled'
          const color = isVeiledGroup ? TYPE_COLOR.neutral : (TYPE_COLOR[groupKey] || TYPE_COLOR.neutral)
          const label = isVeiledGroup ? 'unfolding' : (TYPE_LABEL[groupKey] || 'connection')

          return (
            <div key={groupKey}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-2.5">
                <span aria-hidden style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: color, flexShrink: 0, opacity: isVeiledGroup ? 0.4 : 0.8,
                }} />
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.13em', textTransform: 'uppercase',
                  color, opacity: isVeiledGroup ? 0.55 : 0.75,
                }}>
                  {label}
                </span>
              </div>

              {/* Relationships in this group */}
              <div
                className="space-y-3 pl-3"
                style={{ borderLeft: `2px solid ${color}22` }}
              >
                {group.map((rel, i) => {
                  const fromChar = charById[rel.from]
                  const toChar   = charById[rel.to]
                  const fromName = fromChar._veiled ? '···' : firstName(fromChar.name)
                  const toName   = toChar._veiled   ? '···' : firstName(toChar.name)

                  return (
                    <div key={i} style={{ opacity: isVeiledGroup ? 0.55 : 1 }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{
                          fontSize: 13, fontWeight: 500,
                          color: 'var(--color-ink-700)',
                          fontFamily: 'var(--font-sans)',
                        }}>
                          {fromName}
                        </span>
                        <span aria-hidden style={{ fontSize: 10, color: 'var(--color-ink-300)' }}>—</span>
                        <span style={{
                          fontSize: 13, fontWeight: 500,
                          color: 'var(--color-ink-700)',
                          fontFamily: 'var(--font-sans)',
                        }}>
                          {toName}
                        </span>
                      </div>
                      <p className="italic" style={{
                        fontSize: 11, lineHeight: 1.45, marginTop: 2,
                        fontFamily: 'var(--font-serif)',
                        color: isVeiledGroup ? 'var(--color-ink-300)' : 'var(--color-ink-400)',
                      }}>
                        {isVeiledGroup ? 'something still unfolding' : rel.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {anyVeiled && mode !== 'full' && (
        <p
          className="italic"
          style={{ fontSize: 11, color: 'var(--color-ink-300)', marginTop: -8, marginBottom: 16 }}
        >
          Some connections are still unfolding.
        </p>
      )}
    </div>
  )
}
