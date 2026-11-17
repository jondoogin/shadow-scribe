/* eslint-disable react-refresh/only-export-components -- small shared pieces and helpers live together */
// Shared Catalogue III pieces for the real app screens (Session 167).
// Markup and class names follow the design-lab prototype
// (src/design-lab/dirs/catalogue.jsx); styles live in ./catalogue.css.
import LanternMark from '../components/shared/LanternMark.jsx'

// Call number: the first three letters of the author's surname.
export function callNumber(book) {
  const last = (book?.author || '').split(' ').filter(Boolean).slice(-1)[0] || ''
  return last.slice(0, 3).toUpperCase() || '—'
}

export const STATUS_LABEL = {
  reading: 'On loan · reading',
  paused: 'Set aside',
  want: 'On the shelf',
  finished: 'Returned',
}

export function statusLabel(book) {
  if (book?.archived) return 'Archived'
  return STATUS_LABEL[book?.status] || 'On the shelf'
}

export const unitWord = (book) => (book?.format === 'audiobook' ? 'Part' : 'Chapter')

// Progress bar (John's settled "Bar" setting). Kept as a component so the
// pierced-hole variant can come back without touching the screens.
export function Holes({ pct = 0, label }) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0))
  return <div className="c2-holes" role="img" aria-label={label || `${Math.round(v)} percent`} style={{ '--pct': `${v}%` }} />
}

export const Field = ({ k, v }) => <div className="c2-field"><dt>{k}</dt><dd>{v}</dd></div>

// Tabs set into the top of their card (a .c3-box).
export function Tabs({ items, value, onChange, label, counts }) {
  return (
    <nav className="c3-tabs" aria-label={label}>
      {items.map(([id, text]) => (
        <button key={id} type="button" className={value === id ? 'is-on' : ''} aria-pressed={value === id} onClick={() => onChange(id)}>
          {text}
          {counts?.[id] > 0 && <span className="c3-tab-n">{counts[id]}</span>}
        </button>
      ))}
    </nav>
  )
}

export function LitLabel({ lit, children, label = 'Lit' }) {
  return (
    <span className={`c2-label${lit ? ' c3-lit' : ''}`}>
      {lit ? <><LanternMark size={14} live /> {label}</> : children}
    </span>
  )
}

export { LanternMark as Mark }
