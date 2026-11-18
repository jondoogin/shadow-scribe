// ── .lantern-visuals package reader ──────────────────────────────────────────
// A package is a STORED ZIP written by `lantern-narrate visuals generate`:
//   manifest.json, images/*.webp, strokes/*.webp, thumbs/*.webp
// It shares the ZIP reader with .lantern-audio, so images are Blob slices of
// the original file and a large set imports on an iPhone without loading the
// whole archive into memory. See docs/VISUAL_JOURNEY.md §8.

import { readZipDirectory, entryBlob } from '../../narration/audiobookPackage.js'

export const VISUALS_FORMAT = 'lantern-visuals'
export const VISUALS_VERSION = 1
export const LIMITS = { images: 2000, bytes: 3 * 1024 * 1024, side: 4096 }

const MIME_BY_EXT = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }
const ID_RE = /^[A-Za-z0-9._-]{1,64}$/
const BLOCK_RE = /^b\d+$/
const SEG_RE = /^(b\d+)\.\d+$/
const DESCRIPTOR_FIELDS = ['setting', 'era', 'timeOfDay', 'weather', 'light', 'mood', 'people']

/** Mime for a package path, or null when the path is unsafe or not a raster image (no SVG). */
export function imagePathMime(path, folder) {
  if (typeof path !== 'string' || path.length > 200) return null
  if (path.includes('..') || path.includes('\\') || path.startsWith('/') || path.includes('\0')) return null
  if (folder && !path.startsWith(`${folder}/`)) return null
  const ext = path.split('.').pop().toLowerCase()
  return MIME_BY_EXT[ext] || null
}

function validLocator(loc) {
  if (!loc || typeof loc.sectionId !== 'string' || !loc.sectionId) return false
  if (!BLOCK_RE.test(loc.blockId || '')) return false
  const m = SEG_RE.exec(loc.segmentId || '')
  return !!m && m[1] === loc.blockId
}

function clamp01(v, d = 0.5) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : d
}

function cleanDescriptor(d) {
  if (!d || typeof d !== 'object') return null
  const out = {}
  for (const k of DESCRIPTOR_FIELDS) if (typeof d[k] === 'string' && d[k].trim()) out[k] = d[k].trim().slice(0, 120)
  return Object.keys(out).length ? out : null
}

/**
 * Check a manifest. Returns { errors, images } where `images` are the cleaned
 * image records Lantern keeps (only known fields, focus clamped).
 */
export function validateVisualManifest(m) {
  const errors = []
  if (!m || m.format !== VISUALS_FORMAT) return { errors: ['Not a Lantern paintings package.'], images: [] }
  if (m.version > VISUALS_VERSION) errors.push(`Package version ${m.version} is newer than this Lantern supports.`)
  if (!m.book?.contentId) errors.push('Package has no book identifier.')
  if (!Array.isArray(m.images) || !m.images.length) errors.push('Package has no paintings.')
  else if (m.images.length > LIMITS.images) errors.push(`Package has ${m.images.length} paintings; the limit is ${LIMITS.images}.`)
  const ids = new Set()
  const images = []
  for (const img of (Array.isArray(m.images) ? m.images : []).slice(0, LIMITS.images)) {
    const label = img?.id || '(no id)'
    if (!ID_RE.test(img?.id || '') || ids.has(img.id)) { errors.push(`Bad or duplicate painting id: ${label}`); continue }
    ids.add(img.id)
    if (!imagePathMime(img.file, 'images')) { errors.push(`Painting ${label} has an unsafe or unsupported file.`); continue }
    if (img.strokes != null && !imagePathMime(img.strokes, 'strokes')) { errors.push(`Painting ${label} has an unsafe stroke map.`); continue }
    if (img.thumb != null && !imagePathMime(img.thumb, 'thumbs')) { errors.push(`Painting ${label} has an unsafe thumbnail.`); continue }
    if (!validLocator(img.visibleAfter)) { errors.push(`Painting ${label} has no valid “visible after” position.`); continue }
    // The spoiler rule's anchor: visibleAfter must be the window's last segment.
    const to = img.sourceWindow?.to
    if (to != null && to !== img.visibleAfter.segmentId) { errors.push(`Painting ${label} could appear before its text is read.`); continue }
    if ((img.width || 0) > LIMITS.side || (img.height || 0) > LIMITS.side) { errors.push(`Painting ${label} is larger than ${LIMITS.side} px.`); continue }
    images.push({
      id: img.id,
      sceneId: typeof img.sceneId === 'string' ? img.sceneId.slice(0, 64) : null,
      alternate: Number(img.alternate) || 0,
      visibleAfter: { sectionId: img.visibleAfter.sectionId, blockId: img.visibleAfter.blockId, segmentId: img.visibleAfter.segmentId },
      file: img.file,
      strokes: img.strokes || null,
      thumb: img.thumb || null,
      width: Number(img.width) || null,
      height: Number(img.height) || null,
      focus: { x: clamp01(img.focus?.x), y: clamp01(img.focus?.y) },
      descriptor: cleanDescriptor(img.descriptor),
    })
  }
  return { errors, images }
}

/** Stable id: the same book + style + model replaces itself on re-import. */
export function visualSetIdFor(manifest) {
  const g = manifest.generator || {}
  const st = manifest.style || {}
  return ['v', manifest.book.contentId.replace(/^sha256:/, '').slice(0, 16), st.preset || st.id || 'style', g.model || 'model']
    .map(x => String(x).replace(/[^A-Za-z0-9._-]/g, '-')).join('~')
}

/**
 * When the package was made with a different parser version, block ids may
 * have moved. Each painting is then held back to the END of its section, so
 * it can only appear once the reader has moved past that whole section.
 */
export function holdToSectionEnd(images) {
  return images.map(img => ({ ...img, visibleAfter: { sectionId: img.visibleAfter.sectionId, blockId: 'b999999', segmentId: 'b999999.999' }, heldToSectionEnd: true }))
}

/**
 * Open a package File. Reads only the directory and manifest.
 * @param {Blob} file
 * @param {{ contentId?: string, parserVersion?: number, sectionIds?: string[] }} book  the book it is for
 * @returns {{ manifest, id, images, warnings, getBlob(path) }}
 */
export async function openVisualPackage(file, book = {}) {
  let entries
  try { entries = await readZipDirectory(file) } catch { throw new Error('This is not a Lantern paintings package.') }
  const byName = new Map(entries.map(e => [e.name, e]))
  const mEntry = byName.get('manifest.json')
  if (!mEntry) throw new Error('This package has no manifest.json.')
  let manifest
  try { manifest = JSON.parse(await (await entryBlob(file, mEntry)).text()) } catch { throw new Error('The package manifest could not be read.') }
  const { errors, images: checked } = validateVisualManifest(manifest)
  if (errors.length) throw new Error(errors[0])
  if (book.contentId && manifest.book.contentId !== book.contentId) {
    throw new Error('These paintings were made for a different edition of this book (the EPUB does not match).')
  }
  const warnings = []
  let images = checked
  for (const img of images) {
    for (const path of [img.file, img.strokes, img.thumb].filter(Boolean)) {
      const e = byName.get(path)
      if (!e) throw new Error(`Painting ${img.id} is missing from the package (${path}).`)
      if (e.size > LIMITS.bytes) throw new Error(`Painting ${img.id} is larger than ${Math.round(LIMITS.bytes / 1048576)} MB.`)
    }
  }
  if (book.sectionIds) {
    const known = new Set(book.sectionIds)
    const before = images.length
    images = images.filter(img => known.has(img.visibleAfter.sectionId))
    if (images.length < before) warnings.push(`${before - images.length} paintings point at chapters this book doesn't have and were left out.`)
    if (!images.length) throw new Error('None of these paintings match this book’s chapters.')
  }
  if (book.parserVersion != null && manifest.book.parserVersion != null && book.parserVersion !== manifest.book.parserVersion) {
    images = holdToSectionEnd(images)
    warnings.push('These paintings were made with an older reading of the book, so each one waits until you finish its chapter.')
  }
  return {
    manifest,
    id: visualSetIdFor(manifest),
    images,
    warnings,
    getBlob: (path) => entryBlob(file, byName.get(path), imagePathMime(path)),
  }
}

/**
 * Confirm a Blob really is a raster image within the size limit. Uses
 * createImageBitmap where available (browsers); skipped elsewhere (tests).
 */
export async function checkImageBlob(blob) {
  if (typeof createImageBitmap !== 'function') return true
  try {
    const bmp = await createImageBitmap(blob)
    const ok = bmp.width > 0 && bmp.height > 0 && bmp.width <= LIMITS.side && bmp.height <= LIMITS.side
    bmp.close?.()
    return ok
  } catch {
    return false
  }
}
