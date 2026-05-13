import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Ico } from '../shared/icons.jsx'
import { useBooks } from '../../context/BooksContext.jsx'

const IS_DEV = import.meta.env.DEV

export default function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { resetToDemo } = useBooks()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  const isLibrary = location.pathname === '/library' || location.pathname === '/'

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

  // Close menu on navigation
  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <header className="fixed top-0 inset-x-0 z-30 h-14 bg-cream-50/95 backdrop-blur-sm border-b border-ink-200">
      <div className="h-full max-w-4xl mx-auto px-5 sm:px-8 flex items-center justify-between">

        <button onClick={() => navigate('/library')} className="flex items-center gap-2 group outline-none">
          <span className="text-gold font-bold text-[15px] group-hover:scale-110 transition-transform origin-center">✦</span>
          <span className="font-serif text-[17px] font-semibold text-ink-900 tracking-tight leading-none">
            Shadow Scribe
          </span>
        </button>

        <div className="flex items-center gap-2" ref={ref}>
          <button
            onClick={() => navigate('/new')}
            className="flex items-center gap-1.5 bg-gold text-white rounded-lg text-[13px] font-semibold
                       px-3 py-[7px] hover:bg-gold-light active:scale-95 transition-all"
            style={{ boxShadow:'0 2px 8px rgba(184,134,11,.28)' }}
          >
            <Ico.Plus />
            <span className="hidden sm:inline">New Companion</span>
            <span className="sm:hidden">New</span>
          </button>

          <button
            onClick={() => setOpen(o => !o)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all ${
              open
                ? 'bg-ink-100 border-ink-300 text-ink-800'
                : 'border-ink-200 text-ink-500 hover:bg-cream-200 hover:border-ink-300 hover:text-ink-700'
            }`}
          >
            {open ? <Ico.X /> : <Ico.Menu />}
          </button>

          {open && (
            <div
              className="absolute top-[57px] right-4 sm:right-6 w-56 bg-cream-50 border border-ink-200 rounded-2xl overflow-hidden animate-menu-drop"
              style={{ boxShadow:'var(--shadow-menu)', zIndex:40 }}
            >
              <nav className="p-1.5">
                <button
                  onClick={() => navigate('/library')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isLibrary ? 'bg-gold-bg text-gold' : 'text-ink-700 hover:bg-cream-200'
                  }`}
                >
                  <Ico.Library /> Library
                </button>
                <button
                  onClick={() => navigate('/new')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink-700 hover:bg-cream-200 transition-colors"
                >
                  <Ico.Plus /> New Companion
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === '/settings' ? 'bg-gold-bg text-gold' : 'text-ink-700 hover:bg-cream-200'
                  }`}
                >
                  <Ico.Settings /> Settings
                </button>
              </nav>
              <div className="border-t border-ink-100 mx-3" />
              <div className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 mb-1.5">Shadow Scribe</p>
                <p className="text-[12px] text-ink-500 leading-relaxed">
                  Keep your reading rich, your memory long, and your theories safe.
                </p>
              </div>
              {IS_DEV && (
                <>
                  <div className="border-t border-ink-100 mx-3" />
                  <div className="p-2">
                    <button
                      onClick={() => { resetToDemo(); navigate('/library') }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-colors"
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
