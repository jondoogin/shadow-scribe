import { useState, useCallback } from 'react'
import { BooksProvider, useBooks } from './context/BooksContext.jsx'
import TopNav from './components/layout/TopNav.jsx'
import Library from './components/library/Library.jsx'
import CreateCompanion from './components/library/CreateCompanion.jsx'
import BookDashboard from './components/dashboard/BookDashboard.jsx'
import './App.css'

function AppShell() {
  const { createBook } = useBooks()
  const [view,       setView]       = useState('library')
  const [selectedId, setSelectedId] = useState(null)

  const goLibrary = useCallback(() => setView('library'), [])
  const goCreate  = useCallback(() => setView('create'),  [])

  const handleCreate = useCallback(newBook => {
    createBook(newBook)
    setSelectedId(newBook.id)
    setView('dashboard')
  }, [createBook])

  const handleSelectBook = useCallback(id => {
    setSelectedId(id)
    setView('dashboard')
  }, [])

  return (
    <div className="min-h-screen bg-cream">
      <TopNav view={view} onLibrary={goLibrary} onCreateNew={goCreate} />

      <div className="pt-14">
        <div key={view + (selectedId || '')} className="view-enter">
          {view === 'library' && (
            <Library onSelectBook={handleSelectBook} />
          )}
          {view === 'create' && (
            <CreateCompanion onCreate={handleCreate} onCancel={goLibrary} />
          )}
          {view === 'dashboard' && selectedId && (
            <BookDashboard bookId={selectedId} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BooksProvider>
      <AppShell />
    </BooksProvider>
  )
}
