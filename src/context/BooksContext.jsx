import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { loadBooks, saveBooks, resetBooks, sanitizeBook, checkStorageHealth } from '../utils/storage.js'
import { useAuth } from './AuthContext.jsx'
import { syncBooks, pullAndMerge } from '../utils/syncEngine.js'

const BooksContext = createContext(null)

export function BooksProvider({ children }) {
  const [books, setBooks] = useState(loadBooks)
  const { user, status } = useAuth()
  const userId = user?.id ?? null
  const lastSignedInUserId = useRef(null)

  // Check storage health once on mount — detects data that was present but unreadable
  // (caused by partial writes, storage truncation, or external corruption).
  // 'corrupted' means loadBooks() already fell back to demo data.
  const [storageHealth]   = useState(() => checkStorageHealth())
  const [storageWarning, setStorageWarning] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      const result = saveBooks(books)
      if (result?.quota) setStorageWarning(true)
    }, 300)
    return () => clearTimeout(t)
  }, [books])

  // ── Cloud sync ────────────────────────────────────────────────────────────
  // On sign-in: pull cloud books, merge with local using last-write-wins,
  // adopt the merged result, then push it back. On every books change while
  // signed in: schedule a debounced push.
  useEffect(() => {
    if (status !== 'signed-in' || !userId) return
    if (lastSignedInUserId.current === userId) return    // only pull on first transition
    lastSignedInUserId.current = userId

    let cancelled = false
    ;(async () => {
      const { books: merged } = await pullAndMerge(userId, books, null)
      if (cancelled) return
      if (merged && Array.isArray(merged) && merged.length) {
        setBooks(merged)
        syncBooks(userId, merged)
      } else {
        syncBooks(userId, books)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId])

  useEffect(() => {
    if (status === 'signed-out') lastSignedInUserId.current = null
  }, [status])

  // Push on every books change while signed in (debounced inside the engine)
  useEffect(() => {
    if (status === 'signed-in' && userId) syncBooks(userId, books)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, status, userId])

  const clearStorageWarning = useCallback(() => setStorageWarning(false), [])

  const updateBook = useCallback((id, changes) => {
    setBooks(bs => bs.map(b => b.id === id ? { ...b, ...changes } : b))
  }, [])

  const createBook = useCallback((newBook) => {
    setBooks(bs => [newBook, ...bs])
  }, [])

  const deleteBook = useCallback((id) => {
    setBooks(bs => bs.filter(b => b.id !== id))
  }, [])

  const startReread = useCallback((id) => {
    setBooks(bs => bs.map(b => {
      if (b.id !== id) return b
      return {
        ...b,
        rereadCount:     (b.rereadCount || 0) + 1,
        currentChapter:  0,
        reflectionCache: null,
      }
    }))
  }, [])

  const resetToDemo = useCallback(() => {
    setBooks(resetBooks())
  }, [])

  // Merge imported books into the library, skipping duplicates by ID.
  // Sanitizes incoming books as a last line of defense.
  const importLibrary = useCallback((incoming) => {
    setBooks(current => {
      const existingIds = new Set(current.map(b => b.id))
      const newBooks = incoming
        .map(b => sanitizeBook(b))
        .filter(b => b && !existingIds.has(b.id))
      return [...newBooks, ...current]
    })
  }, [])

  return (
    <BooksContext.Provider value={{
      books, updateBook, createBook, deleteBook, resetToDemo, importLibrary, startReread,
      storageWarning, clearStorageWarning, storageHealth,
    }}>
      {children}
    </BooksContext.Provider>
  )
}

export function useBooks() {
  const ctx = useContext(BooksContext)
  if (!ctx) throw new Error('useBooks must be used inside BooksProvider')
  return ctx
}
