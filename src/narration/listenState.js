// ── Listening/reading positions + narration preferences ──────────────────────
// Small, device-local state in localStorage (`lantern_listen`). Deliberately
// separate from the companion's `book.currentChapter` (spoiler gating), which
// is only ever changed by an explicit reader action.
//
// Shared-location rule: Reader and Listen each save a locator
// { sectionId, blockId, updatedAt }. When either mode opens, it starts from
// whichever of the two was saved most recently.

const KEY = 'lantern_listen'
const VERSION = 1

export const DEFAULT_PREFS = {
  rate: 1,
  source: null,            // { type: 'audio', audiobookId } | { type: 'speech', voiceURI }
  ambientTrack: null,      // id from AMBIENT_CATALOG, null = off
  ambientVolume: 0.35,
  duck: true,
  narrationVolume: 1,
}

function empty() { return { version: VERSION, prefs: { ...DEFAULT_PREFS }, books: {} } }

export function loadListenState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return empty()
    return {
      version: VERSION,
      prefs: { ...DEFAULT_PREFS, ...(parsed.prefs || {}) },
      books: parsed.books && typeof parsed.books === 'object' ? parsed.books : {},
    }
  } catch {
    return empty()
  }
}

export function saveListenState(state, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(state)) } catch { /* quota: positions are best-effort */ }
}

/** Per-book record: { listen?: Locator & {time, source}, read?: Locator, prefs?: {source} } */
export function bookRecord(state, bookId) {
  return state.books[bookId] || {}
}

export function withBookRecord(state, bookId, patch) {
  const prev = state.books[bookId] || {}
  return { ...state, books: { ...state.books, [bookId]: { ...prev, ...patch } } }
}

/** The most recent deliberate location across Reader and Listen. */
export function latestLocator(record) {
  const { listen, read } = record || {}
  if (!listen) return read || null
  if (!read) return listen
  return (read.updatedAt || '') > (listen.updatedAt || '') ? read : listen
}

/** Index of the first segment in `segments` at or after `blockId` (b<N> ordering). */
export function findSegmentIndex(segments, blockId) {
  if (!segments?.length) return 0
  if (!blockId) return 0
  const exact = segments.findIndex(s => s.blockId === blockId)
  if (exact >= 0) return exact
  const n = Number(String(blockId).replace(/^b/, ''))
  const after = segments.findIndex(s => Number(String(s.blockId).replace(/^b/, '')) >= n)
  return after >= 0 ? after : segments.length - 1
}
