import { useEffect } from 'react'
import { useLocation, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { BooksProvider } from './context/BooksContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { useSettings } from './context/SettingsContext.jsx'
import TopNav from './components/layout/TopNav.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import BookPage from './pages/BookPage.jsx'
import NewCompanionPage from './pages/NewCompanionPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import DebugPage from './pages/DebugPage.jsx'

function AppShell() {
  const location = useLocation()
  const { settings } = useSettings()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !!settings.darkMode)
  }, [settings.darkMode])

  return (
    <div className="min-h-screen bg-cream">
      <TopNav />
      <div className="pt-14">
        <div key={location.pathname} className="view-enter">
          <Routes>
            <Route path="/" element={<Navigate to="/library" replace />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/new" element={<NewCompanionPage />} />
            <Route path="/book/:bookId" element={<BookPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/debug"    element={<DebugPage />} />
            <Route path="*" element={<Navigate to="/library" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <BooksProvider>
          <AppShell />
        </BooksProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}
