import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Ico } from '../shared/icons.jsx'
import { useBooks } from '../../context/BooksContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const IS_DEV = import.meta.env.DEV

export default function TopNav() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { resetToDemo } = useBooks()
  const { settings, updateSetting } = useSettings()
  const { user, status, isCloudEnabled } = useAuth()
  const isDark = !!settings.darkMode
  const [open, setOpen] = useState(false)
  const ref = useRef()

  const isLibrary  = location.pathname === '/library' || location.pathname === '/'
  const isSettings = location.pathname === '/settings'
  const isAbout    = location.pathname === '/about'

  useEffect(() => {
    if (!open) return
    const fn = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [])

  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <header
      className="sticky top-0 z-50 h-14"
      style={{ background: 'var(--color-cream)', backdropFilter: 'blur(8px)' }}
    >
      <div className="h-full max-w-[1000px] mx-auto px-5 sm:px-10 flex items-center justify-between">

        {/* Logo */}
        <button onClick={() => navigate('/library')} className="flex items-center gap-1 group">
          <span
            className="font-bold text-[14px] group-hover:scale-110 transition-transform origin-center ember-drift"
            style={{
              marginTop: 3,
              background: 'var(--lantern-gradient, #b07010)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >✦</span>
          <span
            className="font-serif text-[22px] font-semibold tracking-tight leading-none"
            style={{ color: 'var(--color-ink-900, #1C1917)' }}
          >
            Lantern
          </span>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-2" ref={ref}>
          <button
            onClick={() => navigate('/new')}
            className="flex items-center gap-1.5 rounded-lg text-[13px] font-medium active:scale-95 transition-all"
            style={{
              background: 'transparent',
              color: 'var(--color-ink-600)',
              border: '1px solid var(--color-ink-200)',
              padding: '7px 10px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-accent) 45%, transparent)'
              e.currentTarget.style.color = 'var(--color-accent)'
              e.currentTarget.style.background = 'var(--color-gold-bg)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-ink-200)'
              e.currentTarget.style.color = 'var(--color-ink-600)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Ico.Plus />
            <span className="hidden sm:inline">Add a book</span>
          </button>

          <button
            onClick={() => updateSetting('darkMode', !isDark)}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
            style={{
              border: '1px solid var(--color-ink-200)',
              background: 'transparent',
              color: 'var(--color-ink-500)',
              fontSize: 15,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-ink-100)'; e.currentTarget.style.color = 'var(--color-ink-800)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-ink-500)' }}
          >
            {isDark ? '☀︎' : '◗'}
          </button>

          {/* ── Auth chip ── small, quiet; only renders when cloud is configured ── */}
          {isCloudEnabled && status === 'signed-in' && (
            <button
              onClick={() => navigate('/settings')}
              title={user?.email || 'Signed in'}
              aria-label={`Signed in as ${user?.email || ''}`}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
              style={{
                border:     '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
                background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                color:      'var(--color-accent)',
                fontSize:   12,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-accent) 14%, transparent)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-accent) 8%, transparent)' }}
            >
              {(user?.email || '?').trim()[0].toUpperCase()}
            </button>
          )}
          {isCloudEnabled && status === 'signed-out' && (
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-1 rounded-lg transition-all px-2.5 h-9"
              style={{
                border:     '1px solid var(--color-ink-200)',
                background: 'transparent',
                color:      'var(--color-ink-500)',
                fontSize:   12,
                fontStyle:  'italic',
                fontFamily: 'var(--font-serif)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-ink-700)'; e.currentTarget.style.borderColor = 'var(--color-ink-300)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-ink-500)'; e.currentTarget.style.borderColor = 'var(--color-ink-200)' }}
            >
              <span style={{ fontSize: 10, opacity: 0.7 }}>✦</span>
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}

          <button
            onClick={() => setOpen(o => !o)}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
            style={{
              border: `1px solid ${open ? 'var(--color-ink-300)' : 'var(--color-ink-200)'}`,
              background: open ? 'var(--color-ink-100)' : 'transparent',
              color: open ? 'var(--color-ink-800)' : 'var(--color-ink-500)',
            }}
          >
            {open ? <Ico.X /> : <Ico.Menu />}
          </button>

          {open && (
            <div
              className="absolute top-[57px] right-4 sm:right-6 w-64 rounded-2xl overflow-hidden animate-menu-drop"
              style={{
                background: 'var(--color-cream)',
                border: '1px solid var(--color-ink-200)',
                boxShadow: 'var(--shadow-menu)',
                zIndex: 40,
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
            >
              <nav className="p-1.5">
                {[
                  { label: 'Library',       icon: <Ico.Library />,  path: '/library',  active: isLibrary  },
                  { label: 'Add a book', icon: <Ico.Plus />,     path: '/new',      active: false      },
                  { label: 'About Lantern', icon: <span style={{ fontSize: 12, opacity: 0.7 }}>✦</span>, path: '/about', active: isAbout },
                  { label: 'Settings',      icon: <Ico.Settings />, path: '/settings', active: isSettings },
                ].map(({ label, icon, path, active }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: active ? 'var(--color-gold-bg)' : 'transparent',
                      color: active ? 'var(--color-gold, #B8860B)' : 'var(--color-ink-700)',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-cream-200)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    {icon} {label}
                  </button>
                ))}
              </nav>

              <div style={{ borderTop: '1px solid var(--color-ink-100)', margin: '0 12px' }} />
              <div className="px-3 py-2">
                <button
                  onClick={() => updateSetting('darkMode', !isDark)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ color: 'var(--color-ink-700)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-cream-200)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span className="flex items-center gap-3">
                    <span style={{ fontSize: 15 }}>{isDark ? '☀︎' : '◗'}</span>
                    {isDark ? 'Light mode' : 'Dark mode'}
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-ink-300)' }}
                  >
                    {isDark ? 'on' : 'off'}
                  </span>
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--color-ink-100)', margin: '0 12px' }} />
              <div className="p-4">
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: 'var(--color-ink-400)' }}
                >
                  Lantern
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-ink-500)' }}>
                  Keep your reading rich, your memory long, and your theories safe.
                </p>
              </div>

              {IS_DEV && (
                <>
                  <div style={{ borderTop: '1px solid var(--color-ink-100)', margin: '0 12px' }} />
                  <div className="p-2">
                    <button
                      onClick={() => { resetToDemo(); navigate('/library') }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] transition-colors"
                      style={{ color: 'var(--color-ink-400)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-ink-100)'; e.currentTarget.style.color = 'var(--color-ink-600)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-ink-400)' }}
                    >
                      <Ico.Refresh /> Reset demo data
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
