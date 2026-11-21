// ── "Remember on this device" for the cloud library key ──────────────────────
// Stores the derived, non-extractable CryptoKeys in their own IndexedDB
// database (`lantern_library_device`), so the passphrase isn't asked again on
// this device. The browser can use the keys but no script can read their bytes.
// Separate from `lantern_content` so it needs no schema bump there.

const DB = 'lantern_library_device'
const STORE = 'keys'

function open() {
  return new Promise((resolve, reject) => {
    const idb = globalThis.indexedDB
    if (!idb) return reject(new Error('IndexedDB unavailable'))
    const r = idb.open(DB, 1)
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'userId' }) }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

async function run(mode, fn) {
  const db = await open()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const r = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(r?.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function loadDeviceKeys(userId) {
  try {
    const row = await run('readonly', s => s.get(userId))
    return row?.fileKey && row?.dedupeKey ? { fileKey: row.fileKey, dedupeKey: row.dedupeKey } : null
  } catch {
    return null
  }
}

export async function saveDeviceKeys(userId, keys) {
  try { await run('readwrite', s => s.put({ userId, fileKey: keys.fileKey, dedupeKey: keys.dedupeKey })) } catch { /* best effort */ }
}

export async function forgetDeviceKeys(userId) {
  try { await run('readwrite', s => s.delete(userId)) } catch { /* best effort */ }
}
