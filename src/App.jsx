import { useEffect, useState, useRef, Component } from 'react'
import { useLocation, BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import { BooksProvider, useBooks } from './context/BooksContext.jsx'
import { SettingsProvider, useSettings } from './context/SettingsContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import TopNav from './components/layout/TopNav.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import BookPage from './pages/BookPage.jsx'
import NewCompanionPage from './pages/NewCompanionPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import SignInPage from './pages/SignInPage.jsx'
import DebugPage from './pages/DebugPage.jsx'
import { logError } from './utils/logger.js'

// ── Atmospheric mouse-following ember glow ─────────────────────────────────────
function AtmosphericGlow() {
  const ref = useRef(null)
  const mouse = useRef({ x: 0.5, y: 0.5 })
  const current = useRef({ x: 0.5, y: 0.5 })
  const raf = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      mouse.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      }
    }
    const tick = () => {
      current.current.x += (mouse.current.x - current.current.x) * 0.012
      current.current.y += (mouse.current.y - current.current.y) * 0.012
      if (ref.current) {
        const x = (current.current.x * 100).toFixed(1)
        const y = (current.current.y * 100).toFixed(1)
        ref.current.style.background = `radial-gradient(circle 700px at ${x}% ${y}%, var(--color-glow), transparent 70%)`
      }
      raf.current = requestAnimationFrame(tick)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    raf.current = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.28,
        transition: 'opacity 1.5s ease',
      }}
    />
  )
}

// ── Ambient environment layer — slow-drifting ember blobs ─────────────────────
// Two radial gradient circles that drift on 48–55s cycles using CSS keyframes.
// Pure CSS animation — no JS loop. Very low opacity: atmospheric warmth only.
function AmbientLayer() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        top: '8%', left: '12%',
        width: 640, height: 640,
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--color-glow), transparent 72%)',
        opacity: 0.38,
        animation: 'ambientDrift1 55s ease-in-out infinite',
        willChange: 'transform',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%', right: '8%',
        width: 520, height: 520,
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--color-glow), transparent 72%)',
        opacity: 0.28,
        animation: 'ambientDrift2 48s ease-in-out infinite',
        willChange: 'transform',
      }} />
    </div>
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    logError('App', error, { componentStack: info?.componentStack })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center px-6">
          <div className="max-w-sm text-center">
            <p className="font-serif text-2xl text-ink-900 mb-3">Something went wrong.</p>
            <p className="text-sm text-ink-500 mb-6 leading-relaxed">
              Your reading data is safe. Reload the page to continue where you left off.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors"
            >
              Reload
            </button>
            {this.state.error?.message && (
              <p className="text-[10px] text-ink-300 mt-6 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Storage health banner ──────────────────────────────────────────────────────
// Appears at the top of every page when:
//   • storageWarning — a save returned QuotaExceededError (writes are silently failing)
//   • storageHealth === 'corrupted' — data was in localStorage but couldn't be parsed
// Both cases are recoverable via an export file; both should be surfaced calmly.
function StorageBanner() {
  const { storageWarning, clearStorageWarning, storageHealth } = useBooks()
  const [corruptionDismissed, setCorruptionDismissed] = useState(false)

  if (storageHealth === 'corrupted' && !corruptionDismissed) {
    return (
      <div
        role="alert"
        className="px-5 sm:px-10 py-2.5 flex items-start justify-between gap-4"
        style={{ background: 'var(--color-sienna-bg)', borderBottom: '1px solid var(--color-sienna-pale)' }}
      >
        <p className="text-[12px] leading-relaxed flex-1" style={{ color: 'var(--color-sienna)' }}>
          Your reading data could not be loaded — it may have been corrupted.
          {' '}If you have a recent export file, you can restore it in{' '}
          <Link
            to="/settings"
            onClick={() => setCorruptionDismissed(true)}
            className="underline decoration-dotted underline-offset-2 hover:opacity-75 transition-opacity"
          >
            Settings
          </Link>.
        </p>
        <button
          onClick={() => setCorruptionDismissed(true)}
          className="flex-shrink-0 text-[11px] opacity-60 hover:opacity-90 transition-opacity"
          style={{ color: 'var(--color-sienna)' }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    )
  }

  if (storageWarning) {
    return (
      <div
        role="alert"
        className="px-5 sm:px-10 py-2.5 flex items-start justify-between gap-4"
        style={{ background: 'var(--color-sienna-bg)', borderBottom: '1px solid var(--color-sienna-pale)' }}
      >
        <p className="text-[12px] leading-relaxed flex-1" style={{ color: 'var(--color-sienna)' }}>
          Storage is full — recent changes may not have been saved.{' '}
          <Link
            to="/settings"
            onClick={clearStorageWarning}
            className="underline decoration-dotted underline-offset-2 hover:opacity-75 transition-opacity"
          >
            Export your library
          </Link>
          {' '}to preserve what you've gathered.
        </p>
        <button
          onClick={clearStorageWarning}
          className="flex-shrink-0 text-[11px] opacity-60 hover:opacity-90 transition-opacity"
          style={{ color: 'var(--color-sienna)' }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    )
  }

  return null
}

// ── Scroll to top on every route change ───────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// ── Auth callback — handles Google OAuth + magic-link redirects ───────────────
// supabase's detectSessionInUrl picks up the tokens; we just need this route to
// exist so the browser doesn't 404. Redirect once status resolves.
function AuthCallback() {
  const navigate   = useNavigate()
  const { status } = useAuth()

  useEffect(() => {
    if (status === 'signed-in')  navigate('/library', { replace: true })
    if (status === 'signed-out') navigate('/signin',  { replace: true })
  }, [status, navigate])

  return (
    <div
      className="max-w-[1000px] mx-auto px-5 sm:px-10 py-16 text-center"
      style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <p className="italic" style={{ fontSize: 13, color: 'var(--color-ink-400)' }}>
        Signing you in…
      </p>
    </div>
  )
}

const PAGE_TITLES = {
  '/library':       'Lantern — Library',
  '/':              'Lantern — Library',
  '/new':           'Lantern — New Companion',
  '/settings':      'Lantern — Settings',
  '/about':         'Lantern — About',
  '/signin':        'Lantern — Sign in',
  '/auth/callback': 'Lantern',
}

function AppShell() {
  const location = useLocation()
  const { settings } = useSettings()

  useEffect(() => {
    const isDark = !!settings.darkMode
    document.documentElement.classList.toggle('dark', isDark)
    // Scholar's Study II: also wire data-mode for tokens.css compatibility
    document.documentElement.setAttribute('data-mode', isDark ? 'dark' : 'light')
  }, [settings.darkMode])

  // Dynamic page titles — book pages set their own title in BookPage.jsx
  useEffect(() => {
    const title = PAGE_TITLES[location.pathname]
    if (title) document.title = title
    else if (!location.pathname.startsWith('/book/')) document.title = 'Lantern'
    // /book/:id titles are set by BookPage itself
  }, [location.pathname])

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <ScrollToTop />
      <AmbientLayer />
      <AtmosphericGlow />
      <TopNav />
      <StorageBanner />
      {/* Gold rule — architectural divider below nav */}
      <div className="max-w-[1000px] mx-auto px-5 sm:px-10">
        <div className="gold-rule" />
      </div>
      <div key={location.pathname} className="view-enter">
        <Routes>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/new" element={<NewCompanionPage />} />
          <Route path="/book/:bookId" element={<BookPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {import.meta.env.DEV && <Route path="/debug" element={<DebugPage />} />}
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <BooksProvider>
            <ErrorBoundary>
              <AppShell />
            </ErrorBoundary>
          </BooksProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
