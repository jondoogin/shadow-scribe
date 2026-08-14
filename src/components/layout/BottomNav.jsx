import { useNavigate, useLocation } from 'react-router-dom'
import { useBooks } from '../../context/BooksContext.jsx'
import { Ico } from '../shared/icons.jsx'

/* Every icon sits in the same fixed box regardless of what it is — an SVG, a
   glyph, anything. Without this the ✦ text node inherits the body line-height
   and grows ~10px taller than its SVG neighbours, dropping its label out of
   line with the others. */
const ICON_BOX = 18

/* Drop the subtitle before truncating — "Project Hail Mary: A Novel" should
   read as the book, not as a severed clause. Articles are kept: this is a label
   naming what you're reading, not a shelf-sort key. */
function shortTitle(t = '') {
  const main = t.split(/\s*[:—]\s*/)[0].trim() || t.trim()
  return main.length > 18 ? main.slice(0, 17).trimEnd() + '…' : main
}

export default function BottomNav() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { books } = useBooks()

  // Book pages have their own tab bar — bottom nav would be redundant and confusing
  if (location.pathname.startsWith('/book/') || location.pathname.startsWith('/new')) return null

  const isLibrary  = location.pathname === '/library' || location.pathname === '/'
  const isSettings = location.pathname === '/settings'

  // Most recently updated reading book — the obvious companion destination
  const activeBook = [...books]
    .filter(b => !b.archived && b.status === 'reading')
    .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))[0]

  /* The centre slot names the reading in progress rather than the generic act.
     With nothing open it used to navigate to /library — a no-op from the very
     page it was most often tapped on. It now offers the one move that actually
     opens a reading. */
  const centre = activeBook
    ? {
        icon:  <span style={{ fontSize: 15, lineHeight: 1 }}>✦</span>,
        label: shortTitle(activeBook.title),
        serif: true,
        lit:   true,
        aria:  `Continue reading ${activeBook.title}`,
        go:    () => navigate(`/book/${activeBook.id}`),
      }
    : {
        icon:  <Ico.Plus className="w-4 h-4" />,
        label: 'add a book',
        serif: false,
        lit:   false,
        aria:  'Add a book',
        go:    () => navigate('/new'),
      }

  const Item = ({ icon, label, onClick, active, lit, serif, aria }) => (
    <button
      onClick={onClick}
      aria-label={aria}
      aria-current={active ? 'page' : undefined}
      className="relative flex-1 flex flex-col items-center justify-center gap-1.5 pt-2.5 pb-2 transition-colors"
      style={{ color: active || lit ? 'var(--color-accent)' : 'var(--color-ink-400)' }}
    >
      {/* Amber rule at the top edge — the tab bar's active underline, inverted
          for a surface anchored to the bottom of the screen. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 26, height: 1.5, borderRadius: 1,
          background: 'var(--color-accent)',
          opacity: active ? 0.9 : 0,
          transition: 'opacity 0.35s ease',
        }}
      />
      <span
        style={{
          height: ICON_BOX, width: ICON_BOX,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: active || lit ? 1 : 0.6,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 10,
          lineHeight: 1,
          maxWidth: '92%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: serif ? 'var(--font-serif)' : 'var(--font-sans)',
          fontStyle:  serif ? 'italic' : 'normal',
          letterSpacing: serif ? 0 : '0.04em',
          fontWeight: active ? 500 : 400,
        }}
      >
        {label}
      </span>
    </button>
  )

  return (
    <nav
      aria-label="Primary"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        background: 'color-mix(in srgb, var(--color-bg) 92%, transparent)',
        backdropFilter: 'blur(10px) saturate(1.04)',
        WebkitBackdropFilter: 'blur(10px) saturate(1.04)',
        borderTop: '1px solid var(--color-separator-soft)',
        boxShadow: '0 -6px 16px -8px rgba(0,0,0,0.10)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        minHeight: 56,
      }}
    >
      <Item
        icon={<Ico.Library />}
        label="library"
        aria="Library"
        onClick={() => navigate('/library')}
        active={isLibrary}
      />
      <Item {...centre} onClick={centre.go} active={false} />
      <Item
        icon={<Ico.Settings />}
        label="settings"
        aria="Settings"
        onClick={() => navigate('/settings')}
        active={isSettings}
      />
    </nav>
  )
}
