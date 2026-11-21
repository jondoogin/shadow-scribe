// ── Per-book presets in the cloud library ────────────────────────────────────
// A book's narration choice (prefs: source, e.g. which imported narration or
// device voice) and painting preferences (visuals) from `lantern_listen`.
// Reading positions are not synced here. The app-wide Listen preferences
// (speed, ambience, volume, transcript options) travel as GLOBAL.
//
// Three-way merge per book against the last synced snapshot: what changed on
// this device since the last sync wins; otherwise the cloud's version is taken.

export const PRESET_FIELDS = ['prefs', 'visuals']
export const GLOBAL = '__global'

export function presetsFromListenState(state) {
  const out = {}
  for (const [bookId, rec] of Object.entries(state?.books || {})) {
    const p = {}
    for (const f of PRESET_FIELDS) if (rec?.[f] !== undefined) p[f] = rec[f]
    if (Object.keys(p).length) out[bookId] = p
  }
  if (state?.prefs) out[GLOBAL] = { prefs: state.prefs }
  return out
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** @returns {{ merged, localChanged: boolean, remoteChanged: boolean }} */
export function mergePresets(local = {}, base = {}, remote = {}) {
  const merged = {}
  let localChanged = false, remoteChanged = false
  for (const id of new Set([...Object.keys(local), ...Object.keys(base), ...Object.keys(remote)])) {
    // Never synced on this device: the cloud's copy wins where there is one,
    // so a fresh device's defaults don't overwrite real choices.
    const mine = base[id] === undefined ? remote[id] === undefined : !same(local[id], base[id])
    const value = mine ? local[id] : (remote[id] !== undefined ? remote[id] : local[id])
    if (value !== undefined) merged[id] = value
    if (!same(value, local[id])) localChanged = true
    if (!same(value, remote[id])) remoteChanged = true
  }
  return { merged, localChanged, remoteChanged }
}

/** Put merged presets back into a listen state, leaving positions alone. */
export function applyPresets(state, presets) {
  const books = { ...state.books }
  let prefs = state.prefs
  for (const [id, p] of Object.entries(presets)) {
    if (id === GLOBAL) { if (p?.prefs) prefs = { ...state.prefs, ...p.prefs }; continue }
    const rec = { ...(books[id] || {}) }
    for (const f of PRESET_FIELDS) {
      if (p[f] !== undefined) rec[f] = p[f]
    }
    books[id] = rec
  }
  return { ...state, prefs, books }
}
