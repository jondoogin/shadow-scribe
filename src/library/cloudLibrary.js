// ── Cloud library: encrypted EPUBs, narration and paintings ──────────────────
// Storage-agnostic core: give it a backend (libraryBackend.js) and the keys
// from libraryCrypto.js. Files go up and come down exactly as they were
// imported (the EPUB, the .lantern-audio, the .lantern-visuals), so restoring
// one runs the same importer as picking the file by hand.

import {
  CHUNK_SIZE, chunkCount, encryptChunk, decryptChunk, encryptJson, decryptJson, dedupeKeyFor,
  createLibraryKey, unlockLibraryKey,
} from './libraryCrypto.js'
import { chunkPath, chunkPaths } from './libraryBackend.js'

export const KINDS = ['epub', 'audio', 'visuals']
const META_PURPOSE = id => `lantern-library/meta/${id}`
const PRESETS_PURPOSE = 'lantern-library/presets/v1'

const newId = () => globalThis.crypto.randomUUID()

/** 'none' (no library yet) or 'locked' (exists; needs the passphrase). */
export async function libraryState(backend) {
  return (await backend.getKeyRecord()) ? 'locked' : 'none'
}

export async function createLibrary(backend, passphrase) {
  const { record, keys } = await createLibraryKey(passphrase)
  await backend.insertKeyRecord(record)
  return keys
}

export async function unlockLibrary(backend, passphrase) {
  const record = await backend.getKeyRecord()
  if (!record) throw new Error('There is no cloud library for this account yet.')
  return unlockLibraryKey(passphrase, record)
}

/** Decrypted listing: [{ id, kind, contentId, bytes, status, meta, createdAt, chunkCount }] */
export async function listLibrary(backend, keys) {
  const rows = await backend.listItems()
  const out = []
  for (const r of rows) {
    let meta
    try { meta = await decryptJson(keys.fileKey, r.meta_enc, META_PURPOSE(r.id)) } catch { meta = { title: 'Unreadable item' } }
    out.push({
      id: r.id, kind: r.kind, contentId: r.content_id, bytes: Number(r.bytes), status: r.status,
      chunkCount: r.chunk_count, chunkSize: r.chunk_size, dedupeKey: r.dedupe_key, meta, createdAt: r.created_at,
    })
  }
  return out
}

/**
 * Encrypt and upload one file. If the same file (same kind + natural id) is
 * already in the library and complete, nothing is uploaded.
 * @param {{ kind, naturalId, contentId, file: Blob, meta: { title?, author?, filename?, label? } }} entry
 * @returns {{ item, skipped: boolean }}
 */
export async function uploadToLibrary(backend, keys, entry, onProgress) {
  const { kind, naturalId, contentId, file, meta = {} } = entry
  if (!KINDS.includes(kind)) throw new Error(`Unknown library kind: ${kind}`)
  if (!contentId || !naturalId || !file) throw new Error('Nothing to upload.')
  const dedupe = await dedupeKeyFor(keys.dedupeKey, kind, naturalId)
  const existing = (await backend.listItems()).find(r => r.dedupe_key === dedupe)
  if (existing?.status === 'ready' && Number(existing.bytes) === file.size) return { item: existing, skipped: true }

  const id = existing?.id || newId()
  const count = chunkCount(file.size)
  // Replacing an earlier (interrupted or different-size) upload: clear its parts.
  if (existing) await backend.removeObjects(chunkPaths(existing.id, existing.chunk_count))
  const row = {
    id, kind, content_id: contentId, dedupe_key: dedupe, bytes: file.size, chunk_size: CHUNK_SIZE,
    chunk_count: count, meta_enc: await encryptJson(keys.fileKey, meta, META_PURPOSE(id)), status: 'uploading',
    updated_at: new Date().toISOString(),
  }
  await backend.upsertItem(row)
  let sent = 0
  for (let i = 0; i < count; i++) {
    const plain = new Uint8Array(await file.slice(i * CHUNK_SIZE, Math.min(file.size, (i + 1) * CHUNK_SIZE)).arrayBuffer())
    await backend.putObject(chunkPath(id, i), await encryptChunk(keys.fileKey, plain, id, i, count))
    sent += plain.length
    onProgress?.({ done: i + 1, total: count, bytes: sent, totalBytes: file.size })
  }
  await backend.updateItem(id, { status: 'ready', updated_at: new Date().toISOString() })
  return { item: { ...row, status: 'ready' }, skipped: false }
}

/** Download and decrypt one item into a File named as it was imported. */
export async function downloadFromLibrary(backend, keys, item, onProgress) {
  if (item.status !== 'ready') throw new Error('This file didn’t finish uploading. Import it again on the device that has it.')
  const parts = []
  let got = 0
  for (let i = 0; i < item.chunkCount; i++) {
    const data = await backend.getObject(chunkPath(item.id, i))
    const plain = await decryptChunk(keys.fileKey, data, item.id, i, item.chunkCount)
    parts.push(plain)
    got += plain.length
    onProgress?.({ done: i + 1, total: item.chunkCount, bytes: got, totalBytes: item.bytes })
  }
  if (got !== item.bytes) throw new Error('This file came back the wrong size. Nothing was imported.')
  const name = item.meta?.filename || `${item.kind}-${item.id}`
  const type = item.kind === 'epub' ? 'application/epub+zip' : 'application/zip'
  return typeof File === 'function' ? new File(parts, name, { type }) : new Blob(parts, { type })
}

export async function removeFromLibrary(backend, item) {
  await backend.removeObjects(chunkPaths(item.id, item.chunkCount ?? item.chunk_count))
  await backend.deleteItem(item.id)
}

// ── Presets ──────────────────────────────────────────────────────────────────

export async function readPresets(backend, keys) {
  const row = await backend.getPresets()
  if (!row) return null
  return decryptJson(keys.fileKey, row.data_enc, PRESETS_PURPOSE)
}

export async function writePresets(backend, keys, value) {
  await backend.putPresets(await encryptJson(keys.fileKey, value, PRESETS_PURPOSE))
}
