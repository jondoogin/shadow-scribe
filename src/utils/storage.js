import { INITIAL_BOOKS } from '../data/books.js'

const KEY = 'shadowscribe_books'

export function loadBooks() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return INITIAL_BOOKS
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_BOOKS
    return parsed
  } catch {
    return INITIAL_BOOKS
  }
}

export function saveBooks(books) {
  try {
    localStorage.setItem(KEY, JSON.stringify(books))
  } catch {
    // Storage quota exceeded or private mode — fail silently
  }
}

export function resetBooks() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  return INITIAL_BOOKS
}
