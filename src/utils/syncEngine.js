/**
 * syncEngine.js — Auto-sync localStorage <-> Supabase.
 *
 * Behavior:
 *   - When signed in, every change to books/settings is debounced and pushed
 *     to Supabase as a JSON blob keyed on (user_id, book.id).
 *   - On sign-in, pulls all cloud books and merges them with local using a
 *     last-write-wins strategy based on book.lastUpdated.
 *   - When signed out, this engine is silent — localStorage remains the truth.
 *   - If Supabase is not configured at all, every function no-ops.
 *
 * Conflict model:
 *   - Each book carries `lastUpdated` (already in the schema).
 *   - Local newer than cloud → push local.
 *   - Cloud newer than local → adopt cloud.
 *   - First sign-in (cloud empty) → push entire local library, then settings.
 *
 * The engine is deliberately a set of plain async functions. The wiring into
 * BooksContext + SettingsContext lives in those files via subscribe-on-mount.
 */

import { supabase, isCloudEnabled } from '../lib/supabase.js'

const PUSH_DEBOUNCE_MS = 1500

// ── Push: debounced per-key writers ─────────────────────────────────────────
// Two channels (books and settings) each get an independent debounce so
// frequent note edits don't starve a settings change.
const pushTimers = { books: null, settings: null }
const pushQueues = { books: null, settings: null }

function scheduleBookPush(userId, books) {
  if (!isCloudEnabled || !userId) return
  pushQueues.books = books
  if (pushTimers.books) clearTimeout(pushTimers.books)
  pushTimers.books = setTimeout(() => pushBooksNow(userId, pushQueues.books), PUSH_DEBOUNCE_MS)
}

function scheduleSettingsPush(userId, settings) {
  if (!isCloudEnabled || !userId) return
  pushQueues.settings = settings
  if (pushTimers.settings) clearTimeout(pushTimers.settings)
  pushTimers.settings = setTimeout(() => pushSettingsNow(userId, pushQueues.settings), PUSH_DEBOUNCE_MS)
}

async function pushBooksNow(userId, books) {
  if (!isCloudEnabled || !userId || !Array.isArray(books)) return
  // Upsert one row per book, scoped to this user
  const rows = books.map(b => ({
    id:         b.id,
    user_id:    userId,
    data:       b,
    updated_at: new Date().toISOString(),
  }))
  if (!rows.length) return
  const { error } = await supabase.from('lantern_books').upsert(rows, { onConflict: 'id,user_id' })
  if (error) console.warn('[sync] book push failed:', error.message)
}

async function pushSettingsNow(userId, settings) {
  if (!isCloudEnabled || !userId || !settings) return
  const { error } = await supabase
    .from('lantern_settings')
    .upsert({
      user_id:    userId,
      data:       settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  if (error) console.warn('[sync] settings push failed:', error.message)
}

// ── Pull: read everything for this user ──────────────────────────────────────

async function pullBooks(userId) {
  if (!isCloudEnabled || !userId) return []
  const { data, error } = await supabase
    .from('lantern_books')
    .select('id, data, updated_at')
    .eq('user_id', userId)
  if (error) { console.warn('[sync] book pull failed:', error.message); return [] }
  return (data || []).map(r => r.data).filter(Boolean)
}

async function pullSettings(userId) {
  if (!isCloudEnabled || !userId) return null
  const { data, error } = await supabase
    .from('lantern_settings')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) { console.warn('[sync] settings pull failed:', error.message); return null }
  return data?.data || null
}

// ── Merge: last-write-wins per book ──────────────────────────────────────────
// `lastUpdated` is a date string (YYYY-MM-DD or ISO). Compare as Date.

function timeOf(book) {
  const t = book?.lastUpdated
  if (!t) return 0
  const d = new Date(t)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

export function mergeBooks(localBooks, cloudBooks) {
  const byId = new Map()
  for (const b of localBooks || []) byId.set(b.id, { local: b, cloud: null })
  for (const b of cloudBooks || []) {
    const slot = byId.get(b.id) || { local: null, cloud: null }
    slot.cloud = b
    byId.set(b.id, slot)
  }
  const merged = []
  for (const { local, cloud } of byId.values()) {
    if (local && cloud) merged.push(timeOf(local) >= timeOf(cloud) ? local : cloud)
    else merged.push(local || cloud)
  }
  return merged
}

// ── Public API: called from contexts ────────────────────────────────────────

/**
 * Triggered on every books-state change in BooksContext.
 */
export function syncBooks(userId, books) {
  scheduleBookPush(userId, books)
}

/**
 * Triggered on every settings change in SettingsContext.
 */
export function syncSettings(userId, settings) {
  scheduleSettingsPush(userId, settings)
}

/**
 * On sign-in: pull cloud, merge with local, return merged books + settings.
 *
 * Returns { books, settings }. Either may be null if cloud was empty.
 * The caller writes the merged values back to local state and triggers a push.
 */
export async function pullAndMerge(userId, localBooks, localSettings) {
  if (!isCloudEnabled || !userId) return { books: null, settings: null }
  const [cloudBooks, cloudSettings] = await Promise.all([
    pullBooks(userId),
    pullSettings(userId),
  ])
  // Books: last-write-wins merge
  const mergedBooks = mergeBooks(localBooks, cloudBooks)
  // Settings: cloud wins if present, else local (local is pushed below either way)
  const mergedSettings = cloudSettings || localSettings
  return { books: mergedBooks, settings: mergedSettings }
}

/**
 * Force-flush any pending pushes — call before sign-out to ensure last changes
 * land in the cloud.
 */
export async function flushPending(userId, books, settings) {
  if (!isCloudEnabled || !userId) return
  if (pushTimers.books)    { clearTimeout(pushTimers.books);    pushTimers.books = null    }
  if (pushTimers.settings) { clearTimeout(pushTimers.settings); pushTimers.settings = null }
  await Promise.all([
    books    ? pushBooksNow(userId, books)        : Promise.resolve(),
    settings ? pushSettingsNow(userId, settings)  : Promise.resolve(),
  ])
}
