import { INITIAL_BOOKS } from '../data/books.js'

const KEY = 'shadowscribe_books'

// ─────────────────────────────────────────────────────────────────────────────
// Storage strategy notes (Session 43)
//
// localStorage (current):
//   - Limit: ~5MB per origin (enforced by browser; some allow up to 10MB)
//   - Current book size: ~5–15KB per book (metadata + chapters + characters + notes)
//   - With extraction artifacts: +~16KB per book (summaries + characters + mysteries)
//   - 20 books with extraction: ~400–600KB total — well within limits
//   - RAW chapter HTML is NEVER stored here (novels = 500KB–2MB per book)
//
// IndexedDB (groundwork below, not yet activated):
//   - No practical size limit (quota managed per-origin, typically GBs)
//   - Async API — correct for large payloads
//   - Intended future use: raw chapter text for AI re-extraction passes
//   - Migration trigger: if saveBooks() throws QuotaExceededError, fall back here
//
// Raw chapter text lifecycle:
//   epubParser → chapterContents (in memory, React state during wizard)
//   → narrativeExtractor consumes it, produces artifacts (characters, summaries, mysteries)
//   → artifacts stored in book object in localStorage
//   → chapterContents is never written to storage (garbage collected after import)
// ─────────────────────────────────────────────────────────────────────────────

const NARRATIVE_DB_NAME    = 'shadowscribe_narrative'
const NARRATIVE_DB_VERSION = 1
const CHAPTER_TEXT_STORE   = 'chapterTexts'

// Migrate old string[] readingLog entries to SessionEntry objects
function normalizeReadingLog(log) {
  if (!Array.isArray(log)) return []
  return log.map((entry, i) => {
    if (typeof entry === 'string') {
      return { id: `migrated_${entry}_${i}`, date: entry, startChapter: 0, endChapter: 0, rereadEra: 0 }
    }
    return entry
  })
}

function normalizeBook(book) {
  return { ...book, readingLog: normalizeReadingLog(book.readingLog) }
}

export function loadBooks() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return INITIAL_BOOKS.map(normalizeBook)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_BOOKS.map(normalizeBook)
    return parsed.map(normalizeBook)
  } catch {
    return INITIAL_BOOKS.map(normalizeBook)
  }
}

export function saveBooks(books) {
  try {
    localStorage.setItem(KEY, JSON.stringify(books))
  } catch (err) {
    // QuotaExceededError — storage full; books not saved this write
    // Future: trigger IndexedDB migration here
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      console.warn('[shadow-scribe] localStorage quota exceeded. Consider migrating to IndexedDB.')
    }
  }
}

// ── Storage diagnostics ────────────────────────────────────────────────────

/** Estimate current localStorage usage across all keys for this origin. */
export function estimateLocalStorageUsage() {
  try {
    let bytes = 0
    for (const key of Object.keys(localStorage)) {
      bytes += (key.length + (localStorage.getItem(key) || '').length) * 2  // UTF-16 chars = 2 bytes each
    }
    return {
      bytes,
      kb: Math.round(bytes / 1024),
      mb: (bytes / (1024 * 1024)).toFixed(2),
      pctOf5MB: Math.round(bytes / (5 * 1024 * 1024) * 100),
    }
  } catch {
    return { bytes: 0, kb: 0, mb: '0.00', pctOf5MB: 0 }
  }
}

/** Estimate the serialized size of a single book object. */
export function estimateBookSize(book) {
  try {
    const bytes = JSON.stringify(book).length * 2
    return { bytes, kb: Math.round(bytes / 1024) }
  } catch {
    return { bytes: 0, kb: 0 }
  }
}

// ── IndexedDB groundwork (not yet activated) ───────────────────────────────
// These functions are prepared for when raw chapter text storage is needed
// (e.g. AI re-extraction passes). They are not called anywhere in the current
// import flow — extraction happens in memory and only artifacts are persisted.

/** Open (or create) the narrative IndexedDB. Returns a Promise<IDBDatabase>. */
export function openNarrativeStore() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(NARRATIVE_DB_NAME, NARRATIVE_DB_VERSION)
      req.onupgradeneeded = e => {
        const db = e.target.result
        if (!db.objectStoreNames.contains(CHAPTER_TEXT_STORE)) {
          // key: `${bookId}_${chapterNum}`
          db.createObjectStore(CHAPTER_TEXT_STORE, { keyPath: 'key' })
        }
      }
      req.onsuccess  = e => resolve(e.target.result)
      req.onerror    = () => reject(req.error)
    } catch (err) {
      reject(err)
    }
  })
}

/** Persist raw chapter text to IndexedDB for a given book + chapter. */
export function saveChapterText(db, bookId, chapterNum, text) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(CHAPTER_TEXT_STORE, 'readwrite')
      tx.objectStore(CHAPTER_TEXT_STORE).put({
        key: `${bookId}_${chapterNum}`,
        bookId,
        chapterNum,
        text,
        savedAt: new Date().toISOString(),
      })
      tx.oncomplete = resolve
      tx.onerror    = () => reject(tx.error)
    } catch (err) {
      reject(err)
    }
  })
}

/** Load raw chapter text from IndexedDB. Returns Promise<string | null>. */
export function loadChapterText(db, bookId, chapterNum) {
  return new Promise((resolve, reject) => {
    try {
      const tx  = db.transaction(CHAPTER_TEXT_STORE, 'readonly')
      const req = tx.objectStore(CHAPTER_TEXT_STORE).get(`${bookId}_${chapterNum}`)
      req.onsuccess = () => resolve(req.result?.text ?? null)
      req.onerror   = () => reject(req.error)
    } catch (err) {
      reject(err)
    }
  })
}

export function resetBooks() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  return INITIAL_BOOKS
}
