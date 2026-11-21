// ── Cloud library backend: the only code that talks to Supabase for it ───────
// A small adapter so cloudLibrary.js stays testable with an in-memory backend.
// Everything passed in here is already encrypted (see libraryCrypto.js).

export const LIBRARY_BUCKET = 'lantern-library'

const fail = (error, what) => {
  if (!error) return
  const msg = error.message || String(error)
  if (/relation .* does not exist|schema cache|Bucket not found/i.test(msg)) {
    throw new Error('The cloud library isn’t set up on the server yet (docs/SUPABASE_LIBRARY.sql).', { cause: error })
  }
  throw new Error(`${what}: ${msg}`, { cause: error })
}

export function supabaseLibraryBackend(supabase, userId) {
  const bucket = () => supabase.storage.from(LIBRARY_BUCKET)
  return {
    userId,
    async getKeyRecord() {
      const { data, error } = await supabase.from('lantern_library_keys').select('*').eq('user_id', userId).maybeSingle()
      fail(error, 'Could not read your library key')
      return data || null
    },
    async insertKeyRecord(record) {
      const { error } = await supabase.from('lantern_library_keys').insert({ ...record, user_id: userId })
      fail(error, 'Could not save your library key')
    },
    async listItems() {
      const { data, error } = await supabase.from('lantern_library_items').select('*').eq('user_id', userId).order('created_at')
      fail(error, 'Could not list your library')
      return data || []
    },
    async upsertItem(row) {
      const { error } = await supabase.from('lantern_library_items').upsert({ ...row, user_id: userId })
      fail(error, 'Could not record the file')
    },
    async updateItem(id, patch) {
      const { error } = await supabase.from('lantern_library_items').update(patch).eq('id', id).eq('user_id', userId)
      fail(error, 'Could not update the file')
    },
    async deleteItem(id) {
      const { error } = await supabase.from('lantern_library_items').delete().eq('id', id).eq('user_id', userId)
      fail(error, 'Could not remove the file')
    },
    async getPresets() {
      const { data, error } = await supabase.from('lantern_library_presets').select('*').eq('user_id', userId).maybeSingle()
      fail(error, 'Could not read your presets')
      return data || null
    },
    async putPresets(data_enc) {
      const { error } = await supabase.from('lantern_library_presets').upsert({ user_id: userId, data_enc, updated_at: new Date().toISOString() })
      fail(error, 'Could not save your presets')
    },
    async putObject(path, bytes) {
      const blob = new Blob([bytes], { type: 'application/octet-stream' })
      const { error } = await bucket().upload(`${userId}/${path}`, blob, { upsert: true, contentType: 'application/octet-stream' })
      fail(error, 'Upload failed')
    },
    async getObject(path) {
      const { data, error } = await bucket().download(`${userId}/${path}`)
      fail(error, 'Download failed')
      return new Uint8Array(await data.arrayBuffer())
    },
    async removeObjects(paths) {
      if (!paths.length) return
      const { error } = await bucket().remove(paths.map(p => `${userId}/${p}`))
      fail(error, 'Could not delete the file')
    },
    async removeAll() {
      const items = await this.listItems()
      for (const it of items) await this.removeObjects(chunkPaths(it.id, it.chunk_count))
      for (const t of ['lantern_library_items', 'lantern_library_presets', 'lantern_library_keys']) {
        const { error } = await supabase.from(t).delete().eq('user_id', userId)
        fail(error, 'Could not delete your library')
      }
    },
  }
}

export const chunkPath = (itemId, index) => `${itemId}/${String(index).padStart(5, '0')}`
export const chunkPaths = (itemId, count) => Array.from({ length: count }, (_, i) => chunkPath(itemId, i))

/** In-memory backend for tests and the preview page. */
export function memoryLibraryBackend(userId = 'user-1') {
  const s = { key: null, items: new Map(), presets: null, objects: new Map() }
  return {
    userId,
    _state: s,
    async getKeyRecord() { return s.key },
    async insertKeyRecord(r) { if (s.key) throw new Error('duplicate key'); s.key = { ...r, user_id: userId } },
    async listItems() { return [...s.items.values()].map(r => ({ ...r })) },
    async upsertItem(row) {
      for (const r of s.items.values()) if (r.dedupe_key === row.dedupe_key && r.id !== row.id) throw new Error('duplicate key value violates unique constraint')
      s.items.set(row.id, { created_at: new Date().toISOString(), ...s.items.get(row.id), ...row, user_id: userId })
    },
    async updateItem(id, patch) { const r = s.items.get(id); if (r) s.items.set(id, { ...r, ...patch }) },
    async deleteItem(id) { s.items.delete(id) },
    async getPresets() { return s.presets },
    async putPresets(data_enc) { s.presets = { user_id: userId, data_enc, updated_at: new Date().toISOString() } },
    async putObject(path, bytes) { s.objects.set(path, new Uint8Array(bytes)) },
    async getObject(path) { const o = s.objects.get(path); if (!o) throw new Error('Download failed: not found'); return o },
    async removeObjects(paths) { for (const p of paths) s.objects.delete(p) },
    async removeAll() { s.key = null; s.items.clear(); s.presets = null; s.objects.clear() },
  }
}
