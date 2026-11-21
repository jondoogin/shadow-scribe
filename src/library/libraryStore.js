// ── Cloud library runtime (one per app) ──────────────────────────────────────
// Holds the unlocked keys, the decrypted listing and the upload/download jobs,
// and exposes them to React through useLibrary(). See docs/LIBRARY.md.

import { useSyncExternalStore } from 'react'
import { supabase, isCloudEnabled } from '../lib/supabase.js'
import { supabaseLibraryBackend } from './libraryBackend.js'
import {
  libraryState, createLibrary, unlockLibrary, listLibrary, uploadToLibrary, downloadFromLibrary,
  removeFromLibrary, readPresets, writePresets,
} from './cloudLibrary.js'
import { loadDeviceKeys, saveDeviceKeys, forgetDeviceKeys } from './deviceKeys.js'
import { mergePresets } from './presets.js'

const PREFS_KEY = 'lantern_library' // { autoSave, synced: { [userId]: presets } } — device-local

function loadPrefs() {
  try { return { autoSave: true, synced: {}, ...JSON.parse(globalThis.localStorage?.getItem(PREFS_KEY) || '{}') } } catch { return { autoSave: true, synced: {} } }
}
function savePrefs(p) {
  try { globalThis.localStorage?.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* best effort */ }
}

let prefs = loadPrefs()
let backend = null
let keys = null
let snapshot = {
  status: isCloudEnabled ? 'signed-out' : 'disabled', // disabled | signed-out | checking | none | locked | unlocked | error
  items: [],
  jobs: [],      // { id, kind: 'upload'|'download', label, done, total, error? }
  error: null,
  autoSave: prefs.autoSave,
}
const listeners = new Set()

function set(patch) {
  snapshot = { ...snapshot, ...patch }
  for (const l of listeners) l()
}

export function subscribeLibrary(fn) { listeners.add(fn); return () => listeners.delete(fn) }
export function getLibrarySnapshot() { return snapshot }
export function useLibrary() { return useSyncExternalStore(subscribeLibrary, getLibrarySnapshot, getLibrarySnapshot) }

/** Test hook: run against another backend (e.g. memoryLibraryBackend). */
export function _useBackend(b, k = null) { backend = b; keys = k; set({ status: k ? 'unlocked' : 'locked', items: [], jobs: [], error: null }) }
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  // Dev-only hook for browser tests (docs/LIBRARY.md, "Testing").
  window.__lanternLibrary = { useBackend: async () => {
    const { memoryLibraryBackend } = await import('./libraryBackend.js')
    const b = memoryLibraryBackend('dev-user')
    attachSeq++
    _useBackend(b, null)
    set({ status: (await libraryState(b)) })
    return b
  } }
}

let attachSeq = 0
/** Called by AuthContext whenever the signed-in user changes. */
export async function attachUser(user) {
  const seq = ++attachSeq
  keys = null
  if (!isCloudEnabled) return set({ status: 'disabled', items: [] })
  if (!user?.id) { backend = null; return set({ status: 'signed-out', items: [], error: null }) }
  backend = supabaseLibraryBackend(supabase, user.id)
  set({ status: 'checking', items: [], error: null })
  try {
    const st = await libraryState(backend)
    if (seq !== attachSeq) return
    if (st === 'locked') {
      const remembered = await loadDeviceKeys(user.id)
      if (seq !== attachSeq) return
      if (remembered) {
        keys = remembered
        set({ status: 'unlocked' })
        await refreshLibrary()
        return
      }
    }
    set({ status: st })
  } catch (err) {
    if (seq === attachSeq) set({ status: 'error', error: err.message })
  }
}

export async function createCloudLibrary(passphrase, remember = true) {
  keys = await createLibrary(backend, passphrase)
  if (remember) await saveDeviceKeys(backend.userId, keys)
  set({ status: 'unlocked', error: null })
  await refreshLibrary()
}

export async function unlockCloudLibrary(passphrase, remember = true) {
  keys = await unlockLibrary(backend, passphrase)
  if (remember) await saveDeviceKeys(backend.userId, keys)
  set({ status: 'unlocked', error: null })
  await refreshLibrary()
}

/** Lock on this device: forget the remembered key. The cloud copy is untouched. */
export async function lockCloudLibrary() {
  if (backend) await forgetDeviceKeys(backend.userId)
  keys = null
  set({ status: backend ? 'locked' : snapshot.status, items: [] })
}

export function setAutoSave(on) {
  prefs = { ...prefs, autoSave: !!on }
  savePrefs(prefs)
  set({ autoSave: prefs.autoSave })
}

export async function refreshLibrary() {
  if (!backend || !keys) return []
  try {
    const items = await listLibrary(backend, keys)
    set({ items, error: null })
    return items
  } catch (err) {
    set({ error: err.message })
    return snapshot.items
  }
}

export const isUnlocked = () => !!(backend && keys)

let jobSeq = 0
function startJob(kind, label) {
  const job = { id: ++jobSeq, kind, label, done: 0, total: 1 }
  set({ jobs: [...snapshot.jobs, job] })
  return {
    progress: p => set({ jobs: snapshot.jobs.map(j => j.id === job.id ? { ...j, done: p.done, total: p.total } : j) }),
    finish: (error) => {
      if (error) set({ jobs: snapshot.jobs.map(j => j.id === job.id ? { ...j, error } : j) })
      else set({ jobs: snapshot.jobs.filter(j => j.id !== job.id) })
    },
  }
}

export function dismissJob(id) { set({ jobs: snapshot.jobs.filter(j => j.id !== id) }) }

// Uploads run one at a time so a phone never holds two books' chunks at once.
let queue = Promise.resolve()

/**
 * Save an imported file to the cloud library, in the background, when the
 * library is unlocked and "save imports" is on. Never throws: a failed backup
 * shows on the Library card and never blocks the import itself.
 */
export function backupToLibrary(entry, { force = false } = {}) {
  if (!entry?.file || !isUnlocked() || (!prefs.autoSave && !force)) return Promise.resolve(null)
  const label = [entry.meta?.title, entry.meta?.label].filter(Boolean).join(' · ') || entry.meta?.filename || entry.kind
  const run = async () => {
    const job = startJob('upload', label)
    try {
      const res = await uploadToLibrary(backend, keys, entry, job.progress)
      job.finish()
      if (!res.skipped) await refreshLibrary()
      return res
    } catch (err) {
      job.finish(err.message)
      return null
    }
  }
  queue = queue.then(run, run)
  return queue
}

/** Download one item and decrypt it into a File. */
export async function fetchFromLibrary(item) {
  if (!isUnlocked()) throw new Error('Unlock your library first.')
  const job = startJob('download', [item.meta?.title, item.meta?.label].filter(Boolean).join(' · ') || item.kind)
  try {
    const file = await downloadFromLibrary(backend, keys, item, job.progress)
    job.finish()
    return file
  } catch (err) {
    job.finish(err.message)
    throw err
  }
}

export async function deleteFromLibrary(item) {
  await removeFromLibrary(backend, item)
  await refreshLibrary()
}

/**
 * Sync presets: read the cloud copy, merge with this device's presets against
 * the last synced snapshot, write back whichever side changed.
 * @param {() => object} getLocal  current presets (presets.js shape)
 * @param {(merged) => void} applyLocal
 */
let syncing = null
export function syncLibraryPresets(getLocal, applyLocal) {
  if (!isUnlocked()) return Promise.resolve(false)
  if (syncing) return syncing
  const userId = backend.userId
  syncing = (async () => {
    try {
      const remote = (await readPresets(backend, keys))?.books || {}
      const base = prefs.synced?.[userId] || {}
      const { merged, localChanged, remoteChanged } = mergePresets(getLocal(), base, remote)
      if (localChanged) applyLocal(merged)
      if (remoteChanged) await writePresets(backend, keys, { books: merged })
      prefs = { ...prefs, synced: { ...prefs.synced, [userId]: merged } }
      savePrefs(prefs)
      return true
    } catch (err) {
      console.warn('[library] preset sync failed:', err?.message)
      return false
    } finally {
      syncing = null
    }
  })()
  return syncing
}

/** Settings → delete cloud data: remove the whole library for this account. */
export async function deleteWholeLibrary() {
  if (!backend) return
  await backend.removeAll()
  await forgetDeviceKeys(backend.userId)
  keys = null
  prefs = { ...prefs, synced: { ...prefs.synced, [backend.userId]: undefined } }
  savePrefs(prefs)
  set({ status: 'none', items: [] })
}
