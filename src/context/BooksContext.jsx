import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { loadBooks, saveBooks, resetBooks } from '../utils/storage.js'

const BooksContext = createContext(null)

export function BooksProvider({ children }) {
  const [books, setBooks] = useState(loadBooks)

  useEffect(() => { saveBooks(books) }, [books])

  const updateBook = useCallback((id, changes) => {
    setBooks(bs => bs.map(b => b.id === id ? { ...b, ...changes } : b))
  }, [])

  const createBook = useCallback((newBook) => {
    setBooks(bs => [newBook, ...bs])
  }, [])

  const deleteBook = useCallback((id) => {
    setBooks(bs => bs.filter(b => b.id !== id))
  }, [])

  const resetToDemo = useCallback(() => {
    setBooks(resetBooks())
  }, [])

  return (
    <BooksContext.Provider value={{ books, updateBook, createBook, deleteBook, resetToDemo }}>
      {children}
    </BooksContext.Provider>
  )
}

export function useBooks() {
  const ctx = useContext(BooksContext)
  if (!ctx) throw new Error('useBooks must be used inside BooksProvider')
  return ctx
}
