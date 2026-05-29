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

// ── Merge: field-level for id-keyed arrays, last-write-wins for scalars ──────

function timeOf(book) {
  const t = book?.lastUpdated
  if (!t) return 0
  const d = new Date(t)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

/**
 * Effective timestamp for a single item in an id-keyed array.
 * Falls back through updatedAt → revisedAt → date so existing items without
 * an explicit updatedAt still merge correctly using their original creation
 * or revision date.
 */
function itemTime(item) {
  if (!item) return 0
  const t = item.updatedAt || item.revisedAt || item.date
  if (!t) return 0
  const d = new Date(t)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

/**
 * Union two arrays of items keyed by `id`. Items present in both: pick
 * whichever has the later itemTime(). Items in only one side: kept.
 *
 * NOTE: this preserves any item that exists in EITHER side. A user who
 * deletes an item on one device and then syncs from a device that still
 * has it will see the item return. Tombstone-based deletion is a planned
 * follow-up; for now keep this in mind when reasoning about removal.
 */
function unionById(a, b) {
  const aa = Array.isArray(a) ? a : []
  const bb = Array.isArray(b) ? b : []
  if (!aa.length) return bb
  if (!bb.length) return aa
  const byId = new Map()
  for (const item of aa) if (item?.id != null) byId.set(item.id, item)
  for (const item of bb) {
    if (item?.id == null) continue
    const existing = byId.get(item.id)
    if (!existing || itemTime(item) > itemTime(existing)) {
      byId.set(item.id, item)
    }
  }
  return Array.from(byId.values())
}

// Array fields on a book where items carry stable `id` values and should
// be merged field-by-field rather than replaced wholesale.
const ID_KEYED_ARRAYS = [
  'notes',
  'mysteries',
  'readingLog',
  'discussionQuestions',
  'userDiscussionQuestions',
]

/**
 * Merge two versions of the same book:
 *   - Scalar fields: whichever side's book.lastUpdated is later wins.
 *   - Id-keyed arrays (see ID_KEYED_ARRAYS): union by id, item-time wins per row.
 *   - book.lastUpdated on the merged result is the max of both sides.
 *
 * The result is structurally identical to a normal book — callers can write
 * it back to state and to the cloud without special handling.
 */
export function mergeBook(local, cloud) {
  if (!local) return cloud
  if (!cloud) return local
  const localNewer = timeOf(local) >= timeOf(cloud)
  const base       = { ...(localNewer ? local : cloud) }
  // Always adopt the later top-level lastUpdated
  const localT = timeOf(local), cloudT = timeOf(cloud)
  if (cloudT > localT && cloud.lastUpdated) base.lastUpdated = cloud.lastUpdated
  if (localT > cloudT && local.lastUpdated) base.lastUpdated = local.lastUpdated
  // Field-merge the id-keyed arrays
  for (const key of ID_KEYED_ARRAYS) {
    base[key] = unionById(local[key], cloud[key])
  }
  return base
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
    merged.push(mergeBook(local, cloud))
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

/**
 * Delete all cloud rows belonging to a user.
 *
 * The Supabase auth user itself is NOT deleted (that requires service_role
 * privileges, which we don't expose to the client). Their auth identity
 * survives — they can sign back in and start clean. Only the row data is wiped.
 *
 * Caller is responsible for calling signOut() afterward.
 */
export async function deleteCloudData(userId) {
  if (!isCloudEnabled || !userId) return { ok: false, error: 'cloud not configured' }
  // Cancel any pending pushes so they don't race against the delete
  if (pushTimers.books)    { clearTimeout(pushTimers.books);    pushTimers.books = null    }
  if (pushTimers.settings) { clearTimeout(pushTimers.settings); pushTimers.settings = null }
  pushQueues.books = null
  pushQueues.settings = null
  const [booksRes, settingsRes] = await Promise.all([
    supabase.from('lantern_books').delete().eq('user_id', userId),
    supabase.from('lantern_settings').delete().eq('user_id', userId),
  ])
  const err = booksRes.error?.message || settingsRes.error?.message
  return err ? { ok: false, error: err } : { ok: true }
}
