import { createContext, useContext, useState, useCallback } from 'react'
import { INITIAL_BOOKS } from '../data/books.js'

const BooksContext = createContext(null)

export function BooksProvider({ children }) {
  const [books, setBooks] = useState(INITIAL_BOOKS)

  const updateBook = useCallback((id, changes) => {
    setBooks(bs => bs.map(b => b.id === id ? { ...b, ...changes } : b))
  }, [])

  const createBook = useCallback((newBook) => {
    setBooks(bs => [newBook, ...bs])
  }, [])

  return (
    <BooksContext.Provider value={{ books, updateBook, createBook }}>
      {children}
    </BooksContext.Provider>
  )
}

export function useBooks() {
  const ctx = useContext(BooksContext)
  if (!ctx) throw new Error('useBooks must be used inside BooksProvider')
  return ctx
}
