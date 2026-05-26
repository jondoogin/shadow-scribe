import { useEffect, useState, Component } from 'react'
import { useLocation, BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { BooksProvider, useBooks } from './context/BooksContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { useSettings } from './context/SettingsContext.jsx'
import TopNav from './components/layout/TopNav.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import BookPage from './pages/BookPage.jsx'
import NewCompanionPage from './pages/NewCompanionPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import DebugPage from './pages/DebugPage.jsx'
import { logError } from './utils/logger.js'

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

const PAGE_TITLES = {
  '/library':  'Lantern — Library',
  '/':         'Lantern — Library',
  '/new':      'Lantern — New Companion',
  '/settings': 'Lantern — Settings',
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
    <div className="min-h-screen bg-cream">
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
      <SettingsProvider>
        <BooksProvider>
          <ErrorBoundary>
            <AppShell />
          </ErrorBoundary>
        </BooksProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}
