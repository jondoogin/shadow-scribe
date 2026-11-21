// ── One list of narrators and painting sets per book ─────────────────────────
// Merges what this device already holds (IndexedDB) with what the encrypted
// cloud library holds, so Listen can offer two plain dropdowns: Narrator and
// Paintings. Choosing an option that isn't on this device downloads it, and
// brings the matching EPUB along when the asset was made from another copy
// of the book, so "different edition" never reaches the reader.

import { getContentMeta, listAudiobooks, listVisualSets } from '../content/contentRepository.js'
import { restoreFromLibrary } from './restore.js'

export const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Curated order (Session 170). Anything else still shows, after these.
export const NARRATOR_ORDER = ['aiden', 'margaret', 'walter', 'niamh']
export const PAINTING_ORDER = ['ink-and-gouache', 'ink-and-wash']

const PRESET_LABEL = {
  'ink-and-gouache': 'Ink and gouache',
  'ink-and-wash': 'Ink and wash',
  gouache: 'Gouache',
  watercolour: 'Watercolour',
  'oil-sketch': 'Oil sketch',
}

/** Narrators the app auto-downloads without asking (bigger ones wait for a pick). */
export const AUTO_FETCH_BYTES = 80 * 1024 * 1024

export const voiceName = v => String(v || 'Narrator').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
export const presetLabel = p => PRESET_LABEL[p] || (p ? voiceName(String(p).replace(/-/g, ' ')) : 'Paintings')

function rank(order, key) {
  const i = order.indexOf(String(key || '').toLowerCase())
  return i < 0 ? order.length : i
}

/** Same book? Same EPUB, or the same title when one side is another copy. */
export function sameWork(book, contentId, title) {
  if (book?.contentId && contentId === book.contentId) return true
  return !!title && norm(title) === norm(book?.title)
}

function presetFromLabel(label) {
  const m = /·\s*([a-z-]+)\s*$/.exec(label || '')
  return m ? m[1] : null
}

/**
 * Build the two option lists from plain data (pure; tested).
 * @param book                     companion record
 * @param {Array} localAudio       IndexedDB audiobooks { id, contentId, manifest, totalBytes }
 * @param {Array} localVisuals     IndexedDB visual sets { id, contentId, manifest, images, totalBytes }
 * @param {Array} items            unlocked library items (decrypted meta)
 */
export function buildAssetOptions(book, localAudio = [], localVisuals = [], items = []) {
  const narrators = new Map()
  for (const ab of localAudio) {
    const m = ab.manifest || {}
    if (!sameWork(book, ab.contentId, m.book?.title)) continue
    const n = m.narration || {}
    narrators.set(ab.id, {
      id: ab.id, kind: 'audio', contentId: ab.contentId, onDevice: true, item: null,
      voice: n.voice, style: n.style || '', engine: n.engineLabel || n.engine || '',
      durationSec: m.totalDurationSec || null, bytes: ab.totalBytes || 0,
    })
  }
  const paintings = new Map()
  for (const vs of localVisuals) {
    const m = vs.manifest || {}
    if (!sameWork(book, vs.contentId, m.book?.title)) continue
    paintings.set(vs.id, {
      id: vs.id, kind: 'visuals', contentId: vs.contentId, onDevice: true, item: null,
      preset: m.style?.preset || null, count: vs.images?.length || 0, bytes: vs.totalBytes || 0,
    })
  }
  const epubs = new Map()
  for (const it of items) {
    if (it.status !== 'ready' || !sameWork(book, it.contentId, it.meta?.title)) continue
    const id = it.meta?.naturalId
    if (it.kind === 'epub') { epubs.set(it.contentId, it); continue }
    if (!id) continue
    if (it.kind === 'audio') {
      const have = narrators.get(id)
      if (have) { have.item = it; continue }
      narrators.set(id, {
        id, kind: 'audio', contentId: it.contentId, onDevice: false, item: it,
        voice: it.meta?.voice || (it.meta?.label || '').split(' · ')[1] || 'Narrator',
        style: it.meta?.style || '', engine: it.meta?.engine || (it.meta?.label || '').split(' · ')[0] || '',
        durationSec: it.meta?.durationSec || null, bytes: it.bytes,
      })
    }
    if (it.kind === 'visuals') {
      const have = paintings.get(id)
      if (have) { have.item = it; continue }
      paintings.set(id, {
        id, kind: 'visuals', contentId: it.contentId, onDevice: false, item: it,
        preset: it.meta?.preset || presetFromLabel(it.meta?.label), count: it.meta?.count || 0, bytes: it.bytes,
      })
    }
  }

  const nList = [...narrators.values()].sort((a, b) =>
    rank(NARRATOR_ORDER, a.voice) - rank(NARRATOR_ORDER, b.voice) || String(a.voice).localeCompare(String(b.voice)) || a.style.length - b.style.length)
  // Label: the voice's name; add the style only when two share a name.
  const byVoice = new Map()
  for (const o of nList) byVoice.set(norm(o.voice), (byVoice.get(norm(o.voice)) || 0) + 1)
  for (const o of nList) o.label = voiceName(o.voice) + (byVoice.get(norm(o.voice)) > 1 && o.style ? ` (${o.style.split(',')[0]})` : '')

  const pList = [...paintings.values()].sort((a, b) => rank(PAINTING_ORDER, a.preset) - rank(PAINTING_ORDER, b.preset))
  const byPreset = new Map()
  for (const o of pList) byPreset.set(o.preset, (byPreset.get(o.preset) || 0) + 1)
  const seen = new Map()
  for (const o of pList) {
    const k = (seen.get(o.preset) || 0) + 1
    seen.set(o.preset, k)
    o.label = presetLabel(o.preset) + (byPreset.get(o.preset) > 1 ? ` ${k}` : '')
  }
  return { narrators: nList, paintings: pList, epubs }
}

/** Load the device side and build options for a book. */
export async function loadAssetOptions(book, items) {
  const [audio, visuals] = await Promise.all([listAudiobooks(), listVisualSets()])
  return buildAssetOptions(book, audio, visuals, items)
}

/**
 * Make sure the book's text for `contentId` is on this device, fetching the
 * EPUB from the library when needed. @returns {Promise<boolean>} text present
 */
export async function ensureText(contentId, epubs, onStatus) {
  if (await getContentMeta(contentId)) return true
  const epub = epubs?.get(contentId)
  if (!epub) return false
  onStatus?.('Getting the book…')
  await restoreFromLibrary(epub)
  return true
}

/**
 * Bring a narrator or painting set onto this device.
 * Re-links the companion to the option's EPUB when it came from another copy
 * (the old "different edition" error), fetching that EPUB first.
 * @returns {Promise<{ id: string, contentId: string }>} the asset id, and the EPUB the book now uses
 */
export async function bringToDevice(option, { book, epubs, onUpdateBook, onStatus }) {
  const hasText = await ensureText(option.contentId, epubs, onStatus)
  if (option.kind === 'visuals' && !hasText) {
    throw new Error('These paintings need the copy of the book they were painted from. Add its EPUB to your library first.')
  }
  if (!option.onDevice) {
    const what = option.kind === 'audio' ? option.label || 'narration' : 'paintings'
    onStatus?.(`Downloading ${what}…`)
    await restoreFromLibrary(option.item, p => onStatus?.(`Downloading ${what} · ${p.done} of ${p.total}…`))
  }
  const relinked = hasText && book.contentId !== option.contentId
  if (relinked) onUpdateBook?.({ contentId: option.contentId })
  onStatus?.(null)
  return { id: option.id, contentId: hasText ? option.contentId : book.contentId }
}

/** The option to use when the reader hasn't chosen one. */
export function preferredOption(options, chosenId) {
  return options.find(o => o.id === chosenId) || options[0] || null
}

/** The few device voices worth offering: English, best quality first. */
export function pickDeviceVoices(voices, max = 4) {
  const score = v => (/premium|enhanced|neural|natural/i.test(v.name) ? 4 : 0) + (v.localService ? 2 : 0) + (v.default ? 1 : 0) + (/^en-(GB|US)/i.test(v.lang) ? 1 : 0)
  const seen = new Set()
  return voices
    .filter(v => /^en\b|^en-/i.test(v.lang))
    .sort((a, b) => score(b) - score(a))
    .filter(v => { const k = v.name.replace(/\s*\(.*\)$/, ''); if (seen.has(k)) return false; seen.add(k); return true })
    .slice(0, max)
}
