// ── Local book content + narration audio store (IndexedDB) ───────────────────
// Owns the bulky, device-local data: retained EPUB text and imported
// narration audio. Book companion metadata stays in BooksContext/localStorage
// (`shadowscribe_books`) and Supabase; a book links here only through the small
// `book.contentId` string. Nothing in this store is synced to the cloud.
//
// Ownership & deletion:
//   contents/sections  — keyed by contentId (SHA-256 of the EPUB). Shared by any
//                        companion that links the same EPUB; removed by
//                        deleteContent(contentId), which also removes its audio.
//   audiobooks/audio   — keyed by audiobookId; removed by deleteAudiobook().
//   Deleting a companion does NOT delete content automatically (another
//   companion may use it); Settings → storage offers explicit cleanup.

export const CONTENT_DB_NAME = 'lantern_content'
export const CONTENT_DB_VERSION = 1

const STORES = {
  contents: 'contents',     // { contentId, title, author, language, parserVersion, importedAt, sections: SectionMeta[] }
  sections: 'sections',     // { contentId, id, blocks }
  audiobooks: 'audiobooks', // { id, contentId, manifest, importedAt, totalBytes }
  audio: 'audio',           // { audiobookId, sectionId, blob, mime, bytes }
}

let factory = () => globalThis.indexedDB
let dbPromise = null

/** Test hook: inject fake-indexeddb. */
export function _setIndexedDBFactory(fn) {
  factory = fn
  dbPromise = null
}

function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'))
    tx.onerror = () => reject(tx.error)
  })
}

export function openContentDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const idb = factory()
    if (!idb) return reject(new Error('IndexedDB is not available in this browser.'))
    const open = idb.open(CONTENT_DB_NAME, CONTENT_DB_VERSION)
    open.onupgradeneeded = () => {
      const db = open.result
      // v1 schema. Future versions: add `if (oldVersion < N)` migrations here.
      if (!db.objectStoreNames.contains(STORES.contents)) db.createObjectStore(STORES.contents, { keyPath: 'contentId' })
      if (!db.objectStoreNames.contains(STORES.sections)) db.createObjectStore(STORES.sections, { keyPath: ['contentId', 'id'] })
      if (!db.objectStoreNames.contains(STORES.audiobooks)) {
        const s = db.createObjectStore(STORES.audiobooks, { keyPath: 'id' })
        s.createIndex('contentId', 'contentId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.audio)) db.createObjectStore(STORES.audio, { keyPath: ['audiobookId', 'sectionId'] })
    }
    open.onsuccess = () => {
      const db = open.result
      db.onversionchange = () => { db.close(); dbPromise = null }
      resolve(db)
    }
    open.onerror = () => { dbPromise = null; reject(open.error) }
    open.onblocked = () => reject(new Error('Lantern storage is busy in another tab. Close other Lantern tabs and retry.'))
  })
  return dbPromise
}

export function sectionMeta(section) {
  const { blocks, ...meta } = section
  return { ...meta, blockCount: blocks.length }
}

// ── Book content ─────────────────────────────────────────────────────────────

export async function saveContent(content) {
  if (!content?.contentId) throw new Error('Content has no contentId')
  const db = await openContentDb()
  const tx = db.transaction([STORES.contents, STORES.sections], 'readwrite')
  const contents = tx.objectStore(STORES.contents)
  const sections = tx.objectStore(STORES.sections)
  contents.put({
    contentId: content.contentId,
    title: content.title,
    author: content.author,
    language: content.language,
    parserVersion: content.parserVersion,
    importedAt: new Date().toISOString(),
    sections: content.sections.map(sectionMeta),
  })
  for (const s of content.sections) sections.put({ contentId: content.contentId, id: s.id, blocks: s.blocks })
  await done(tx)
  return content.contentId
}

export async function getContentMeta(contentId) {
  if (!contentId) return null
  const db = await openContentDb()
  return (await req(db.transaction(STORES.contents).objectStore(STORES.contents).get(contentId))) || null
}

export async function getSectionBlocks(contentId, sectionId) {
  const db = await openContentDb()
  const row = await req(db.transaction(STORES.sections).objectStore(STORES.sections).get([contentId, sectionId]))
  return row?.blocks || null
}

/** Full content model (meta + every section's blocks). Used for script export. */
export async function getFullContent(contentId) {
  const meta = await getContentMeta(contentId)
  if (!meta) return null
  const db = await openContentDb()
  const store = db.transaction(STORES.sections).objectStore(STORES.sections)
  const sections = await Promise.all(meta.sections.map(async s => {
    const row = await req(store.get([contentId, s.id]))
    return { ...s, blocks: row?.blocks || [] }
  }))
  return { ...meta, sections }
}

export async function listContents() {
  const db = await openContentDb()
  return req(db.transaction(STORES.contents).objectStore(STORES.contents).getAll())
}

export async function deleteContent(contentId) {
  for (const ab of await listAudiobooks(contentId)) await deleteAudiobook(ab.id)
  const db = await openContentDb()
  const tx = db.transaction([STORES.contents, STORES.sections], 'readwrite')
  tx.objectStore(STORES.contents).delete(contentId)
  tx.objectStore(STORES.sections).delete(IDBKeyRange.bound([contentId, ''], [contentId, '\uffff']))
  await done(tx)
}

// ── Narration audio ──────────────────────────────────────────────────────────

/**
 * Store an imported audiobook. Files are written one per transaction so a
 * large book never needs to sit in memory at once, and the audiobook record is
 * written last: an interrupted import leaves no visible, half-complete book.
 * @param {object} manifest   validated package manifest
 * @param {(sectionId) => Promise<Blob>} getBlob
 */
export async function saveAudiobook(id, manifest, getBlob, onProgress) {
  const db = await openContentDb()
  let totalBytes = 0
  const written = []
  try {
    for (let i = 0; i < manifest.sections.length; i++) {
      const s = manifest.sections[i]
      const blob = await getBlob(s)
      const tx = db.transaction(STORES.audio, 'readwrite')
      tx.objectStore(STORES.audio).put({ audiobookId: id, sectionId: s.id, blob, mime: s.mime, bytes: blob.size })
      await done(tx)
      written.push(s.id)
      totalBytes += blob.size
      onProgress?.({ done: i + 1, total: manifest.sections.length, bytes: totalBytes })
    }
    const tx = db.transaction(STORES.audiobooks, 'readwrite')
    tx.objectStore(STORES.audiobooks).put({ id, contentId: manifest.book.contentId, manifest, importedAt: new Date().toISOString(), totalBytes })
    await done(tx)
  } catch (err) {
    // Roll back partial audio so nothing orphaned or half-imported remains.
    try {
      const tx = db.transaction(STORES.audio, 'readwrite')
      for (const sid of written) tx.objectStore(STORES.audio).delete([id, sid])
      await done(tx)
    } catch { /* best effort */ }
    if (err?.name === 'QuotaExceededError') {
      throw new Error('Not enough browser storage for this narration. Free space in Settings, or import fewer chapters.', { cause: err })
    }
    throw err
  }
  return { id, totalBytes }
}

export async function listAudiobooks(contentId) {
  const db = await openContentDb()
  const store = db.transaction(STORES.audiobooks).objectStore(STORES.audiobooks)
  return contentId ? req(store.index('contentId').getAll(contentId)) : req(store.getAll())
}

export async function getAudiobook(id) {
  const db = await openContentDb()
  return (await req(db.transaction(STORES.audiobooks).objectStore(STORES.audiobooks).get(id))) || null
}

export async function getAudioBlob(audiobookId, sectionId) {
  const db = await openContentDb()
  const row = await req(db.transaction(STORES.audio).objectStore(STORES.audio).get([audiobookId, sectionId]))
  return row?.blob || null
}

export async function deleteAudiobook(id) {
  const db = await openContentDb()
  const tx = db.transaction([STORES.audiobooks, STORES.audio], 'readwrite')
  tx.objectStore(STORES.audiobooks).delete(id)
  tx.objectStore(STORES.audio).delete(IDBKeyRange.bound([id, ''], [id, '\uffff']))
  await done(tx)
}

// ── Quota ────────────────────────────────────────────────────────────────────

export async function storageEstimate() {
  try {
    const est = await navigator.storage?.estimate?.()
    const persisted = await navigator.storage?.persisted?.()
    return est ? { usage: est.usage, quota: est.quota, persisted: !!persisted } : null
  } catch {
    return null
  }
}

/** Ask the browser not to evict Lantern's content (Safari evicts idle sites after ~7 days otherwise). */
export async function requestPersistentStorage() {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
