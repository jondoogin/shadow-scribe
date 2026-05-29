import { INITIAL_BOOKS } from '../data/books.js'

const KEY = 'shadowscribe_books'

// ── Schema versioning ─────────────────────────────────────────────────────────
// Increment SCHEMA_VERSION when the data model changes in a breaking way.
// Exports carry this version; imports warn when the file is from a newer schema.
export const SCHEMA_VERSION = 1
export const APP_VERSION    = '1.0'

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

// ── Book sanitization ─────────────────────────────────────────────────────────
// Applied on both load and import. Guards against:
//   - null/malformed book objects
//   - corrupted reflectionCache
//   - negative/NaN rereadCount
//   - malformed notes, mysteries, chapters, characters
// Returns null for books that are unrecoverable (missing id or title).

function sanitizeReflectionCache(cache) {
  if (!cache || typeof cache !== 'object') return null
  if (!Array.isArray(cache.reflections)) return null
  const reflections = cache.reflections.filter(r => r?.id && typeof r.text === 'string')
  if (!reflections.length) return null
  return { ...cache, reflections }
}

const VALID_STATUSES = new Set(['reading', 'paused', 'want', 'finished'])

export function sanitizeBook(book) {
  if (!book || typeof book !== 'object' || !book.id || !book.title) return null
  const chars    = book.characters
  const chapters = Array.isArray(book.chapters) ? book.chapters : []

  // Field recovery — fill in missing or malformed scalar fields with safe defaults
  const status         = VALID_STATUSES.has(book.status) ? book.status : 'reading'
  const totalChapters  = (Number.isFinite(book.totalChapters) && book.totalChapters > 0)
    ? book.totalChapters
    : Math.max(chapters.length, 1)
  const currentChapter = (Number.isFinite(book.currentChapter) && book.currentChapter >= 0)
    ? book.currentChapter
    : 1
  const lastUpdated    = book.lastUpdated || new Date().toISOString().split('T')[0]

  // Chapter sanitization — guard against corrupted num/title fields that break progress
  const cleanChapters = chapters
    .filter(c => c && Number.isFinite(c.num) && c.num > 0)
    .map(c => ({
      ...c,
      num:       Math.floor(c.num),
      title:     typeof c.title === 'string' ? c.title : `Chapter ${Math.floor(c.num)}`,
      completed: !!c.completed,
    }))

  return {
    ...book,
    status,
    totalChapters,
    currentChapter,
    lastUpdated,
    notes:    Array.isArray(book.notes)
      ? book.notes.filter(n => n?.id && typeof n.text === 'string' && n.text.trim().length > 0)
      : [],
    mysteries: Array.isArray(book.mysteries)
      ? book.mysteries.filter(m => m?.id && typeof m.text === 'string' && m.text.trim().length > 0)
      : [],
    chapters: cleanChapters,
    readingLog: normalizeReadingLog(book.readingLog),
    rereadCount: (Number.isFinite(book.rereadCount) && book.rereadCount >= 0)
      ? Math.floor(book.rereadCount)
      : 0,
    reflectionCache: sanitizeReflectionCache(book.reflectionCache),
    characters: (chars && typeof chars === 'object') ? {
      main:          Array.isArray(chars.main)          ? chars.main          : [],
      secondary:     Array.isArray(chars.secondary)     ? chars.secondary     : [],
      relationships: Array.isArray(chars.relationships) ? chars.relationships : [],
    } : { main: [], secondary: [], relationships: [] },
  }
}

// ── Export / Import ───────────────────────────────────────────────────────────

/**
 * Wraps books in a versioned export envelope for portability.
 * exportType: 'library' | 'single'
 */
export function createExportEnvelope(books, exportType = 'library') {
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion:    APP_VERSION,
    exportedAt:    new Date().toISOString(),
    exportType,
    bookCount:     books.length,
    books,
  }
}

/**
 * Trigger a browser download of the library as a JSON snapshot.
 * Shared between Settings (manual button) and Library (snapshot reminder).
 *
 * @param {Array} books
 * @returns {{ filename: string, noteCount: number }}
 */
export function downloadLibrarySnapshot(books) {
  const date     = new Date().toISOString().split('T')[0]
  const envelope = createExportEnvelope(books)
  const blob     = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  const filename = `lantern-library-${date}.json`
  a.href     = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
  const noteCount = books.reduce((sum, b) => sum + (b.notes?.length || 0), 0)
  return { filename, noteCount }
}

/**
 * Parses and validates an import file (text string).
 * Handles both legacy raw-array exports and new envelope format.
 *
 * Returns { books: Book[], meta: object|null, warnings: string[] }
 *   - books    — sanitized, importable companions
 *   - meta     — envelope fields if present, null for legacy format
 *   - warnings — non-fatal notices (legacy format, version mismatch, skipped books)
 *
 * An empty books[] with a warning means nothing could be imported.
 */
export function parseImport(text) {
  const warnings = []
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { books: [], meta: null, warnings: ['Not valid JSON — make sure this is a Lantern export file.'] }
  }

  let rawBooks = []
  let meta = null

  if (Array.isArray(parsed)) {
    rawBooks = parsed
    warnings.push('Older export format — no schema version. Importing as-is.')
  } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.books)) {
    rawBooks = parsed.books
    meta = {
      schemaVersion: parsed.schemaVersion ?? null,
      appVersion:    parsed.appVersion    ?? null,
      exportedAt:    parsed.exportedAt    ?? null,
      exportType:    parsed.exportType    ?? null,
      bookCount:     parsed.bookCount     ?? null,
    }
    if (meta.schemaVersion !== null && meta.schemaVersion > SCHEMA_VERSION) {
      warnings.push(
        `This export uses schema v${meta.schemaVersion} — newer than this app (v${SCHEMA_VERSION}). ` +
        `Some data may not import correctly.`
      )
    }
  } else {
    return { books: [], meta: null, warnings: ['Unrecognized file format. Expected a Lantern export file.'] }
  }

  const sanitized = rawBooks.map(sanitizeBook).filter(Boolean)
  const skipped   = rawBooks.length - sanitized.length
  if (skipped > 0) {
    warnings.push(`${skipped} companion${skipped !== 1 ? 's' : ''} skipped — missing required fields.`)
  }
  if (sanitized.length === 0 && rawBooks.length > 0) {
    warnings.push('No companions could be imported from this file.')
  }

  return { books: sanitized, meta, warnings }
}

/**
 * Estimates the serialized size of an export envelope without writing it.
 * Returns { bytes, kb, mb }
 */
export function estimateExportSize(books) {
  try {
    const envelope = createExportEnvelope(books)
    const bytes = JSON.stringify(envelope).length * 2
    return { bytes, kb: Math.round(bytes / 1024), mb: (bytes / (1024 * 1024)).toFixed(2) }
  } catch {
    return { bytes: 0, kb: 0, mb: '0.00' }
  }
}

function normalizeReadingLog(log) {
  if (!Array.isArray(log)) return []
  return log.map((entry, i) => {
    if (typeof entry === 'string') {
      return { id: `migrated_${entry}_${i}`, date: entry, startChapter: 0, endChapter: 0, rereadEra: 0 }
    }
    return entry
  })
}

export function loadBooks() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return INITIAL_BOOKS.map(b => sanitizeBook(b) ?? b)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_BOOKS.map(b => sanitizeBook(b) ?? b)
    const sanitized = parsed.map(sanitizeBook).filter(Boolean)
    return sanitized.length ? sanitized : INITIAL_BOOKS.map(b => sanitizeBook(b) ?? b)
  } catch {
    return INITIAL_BOOKS.map(b => sanitizeBook(b) ?? b)
  }
}

// Storage pressure threshold: warn at 70% of 5 MB (aligned with the SettingsPage indicator).
const STORAGE_WARN_BYTES = 5 * 1024 * 1024 * 0.7

/**
 * Persist books to localStorage.
 * Returns { ok: true } on success, or { ok: false, quota: true } when storage is full.
 * Callers should surface the quota case to the user — data is not saved when this returns false.
 */
export function saveBooks(books) {
  try {
    // Strip any books that can't be serialized (e.g. circular refs from bugs)
    const safe = books.filter(b => {
      try { JSON.stringify(b); return true } catch { return false }
    })
    const serialized = JSON.stringify(safe)
    if (serialized.length * 2 > STORAGE_WARN_BYTES) {
      console.warn(`[lantern] Storage pressure: ~${Math.round(serialized.length * 2 / 1024)}KB used. Consider exporting and trimming.`)
    }
    localStorage.setItem(KEY, serialized)
    return { ok: true }
  } catch (err) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      console.warn('[lantern] localStorage quota exceeded. Export your library to avoid data loss.')
      return { ok: false, quota: true }
    }
    return { ok: false, quota: false }
  }
}

/**
 * Check the health of the stored book data without loading it.
 * Returns:
 *   'empty'     — no data ever written (first use)
 *   'ok'        — data exists and parses correctly
 *   'corrupted' — data exists but cannot be parsed (partial write, storage truncation, etc.)
 *
 * A 'corrupted' result means loadBooks() fell back to demo data and the user's
 * annotations may be recoverable only from an export file.
 */
export function checkStorageHealth() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return 'empty'
    JSON.parse(raw)
    return 'ok'
  } catch {
    return 'corrupted'
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

/** Estimate the serialized size of a single book object, with a breakdown by section. */
export function estimateBookSize(book) {
  try {
    const total      = JSON.stringify(book).length * 2
    const cacheBytes = book.reflectionCache ? JSON.stringify(book.reflectionCache).length * 2 : 0
    const notesBytes = book.notes?.length   ? JSON.stringify(book.notes).length * 2           : 0
    const sessBytes  = book.readingLog?.length ? JSON.stringify(book.readingLog).length * 2   : 0
    // coverData is a base64 string; each ASCII char costs 2 bytes in localStorage (UTF-16)
    const coverBytes = book.coverData ? book.coverData.length * 2 : 0
    return {
      bytes:      total,
      kb:         Math.round(total / 1024),
      cacheKb:    Math.round(cacheBytes / 1024),
      notesKb:    Math.round(notesBytes / 1024),
      sessionsKb: Math.round(sessBytes / 1024),
      coverKb:    Math.round(coverBytes / 1024),
    }
  } catch {
    return { bytes: 0, kb: 0, cacheKb: 0, notesKb: 0, sessionsKb: 0, coverKb: 0 }
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
  return INITIAL_BOOKS.map(b => sanitizeBook(b) ?? b)
}
