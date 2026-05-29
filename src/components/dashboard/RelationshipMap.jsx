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

  // Sort: non-veiled first, then by type (love → ally → tension → hierarchy → neutral)
  const TYPE_ORDER = { love: 0, ally: 1, tension: 2, hierarchy: 3, neutral: 4 }
  const sorted = [...visible].sort((a, b) => {
    const aVeiled = charById[a.from]._veiled || charById[a.to]._veiled
    const bVeiled = charById[b.from]._veiled || charById[b.to]._veiled
    if (aVeiled !== bVeiled) return aVeiled ? 1 : -1
    return (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9)
  })

  const anyVeiled = sorted.some(r => charById[r.from]._veiled || charById[r.to]._veiled)

  return (
    <div className="mt-2">
      <SectionHeading>Relationships</SectionHeading>

      <div className="space-y-1 mb-4">
        {sorted.map((rel, i) => {
          const fromChar = charById[rel.from]
          const toChar   = charById[rel.to]
          const isVeiled = fromChar._veiled || toChar._veiled
          const color    = isVeiled ? TYPE_COLOR.neutral : (TYPE_COLOR[rel.type] || TYPE_COLOR.neutral)
          const typeLbl  = TYPE_LABEL[rel.type] || 'connection'

          const fromName = isVeiled && fromChar._veiled ? '···' : firstName(fromChar.name)
          const toName   = isVeiled && toChar._veiled   ? '···' : firstName(toChar.name)

          return (
            <div
              key={i}
              className="py-2.5 transition-opacity"
              style={{
                borderBottom: i < sorted.length - 1 ? '1px solid var(--color-hairline)' : 'none',
                opacity:      isVeiled ? 0.55 : 1,
              }}
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  {/* Type color stripe — small, never dominant */}
                  <span
                    aria-hidden
                    style={{
                      display:      'inline-block',
                      width:        2,
                      height:       12,
                      background:   color,
                      borderRadius: 1,
                      flexShrink:   0,
                      opacity:      0.75,
                      transform:    'translateY(1px)',
                    }}
                  />
                  <span
                    className="font-medium"
                    style={{
                      fontSize:   13,
                      color:      'var(--color-ink-700)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {fromName}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-ink-300)', margin: '0 2px' }}>↔</span>
                  <span
                    className="font-medium"
                    style={{
                      fontSize:   13,
                      color:      'var(--color-ink-700)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {toName}
                  </span>
                  <span
                    className="italic"
                    style={{
                      fontSize: 13,
                      color:    'var(--color-ink-500)',
                      marginLeft: 6,
                    }}
                  >
                    — {isVeiled ? 'something still unfolding' : rel.label}
                  </span>
                </div>
                {!isVeiled && (
                  <span
                    className="italic flex-shrink-0"
                    style={{
                      fontSize: 10,
                      color:    color,
                      opacity:  0.75,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {typeLbl}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {anyVeiled && mode !== 'full' && (
        <p
          className="italic"
          style={{ fontSize: 11, color: 'var(--color-ink-300)', marginTop: 4, marginBottom: 16 }}
        >
          Some connections are still unfolding.
        </p>
      )}
    </div>
  )
}
