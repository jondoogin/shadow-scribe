// ── .lantern-audio package reader ────────────────────────────────────────────
// A package is a ZIP written by tools/narrator: manifest.json + audio/*.m4a.
// Audio entries are STORED (uncompressed), so we read the central directory and
// hand back Blob slices of the original File: a 300 MB novel imports on an
// iPhone without ever being loaded into memory as a whole.

import { inflateSync } from 'fflate'

export const PACKAGE_FORMAT = 'lantern-audiobook'
export const PACKAGE_VERSION = 1
const PLAYABLE_MIME = /^audio\/(mp4|aac|mpeg|wav|x-wav|wave|webm|ogg)$/

const u16 = (v, o) => v.getUint16(o, true)
const u32 = (v, o) => v.getUint32(o, true)
const u64 = (v, o) => Number(v.getBigUint64(o, true))

async function readRange(blob, start, end) {
  return new DataView(await blob.slice(start, end).arrayBuffer())
}

/** List ZIP entries: { name, method, compressedSize, size, localHeaderOffset }. */
export async function readZipDirectory(blob) {
  const tailLen = Math.min(blob.size, 65557)
  const tail = await readRange(blob, blob.size - tailLen, blob.size)
  let eocd = -1
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (u32(tail, i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('This is not a Lantern narration package (no ZIP directory found).')
  let count = u16(tail, eocd + 10)
  let cdSize = u32(tail, eocd + 12)
  let cdOffset = u32(tail, eocd + 16)
  // ZIP64 (books over 4 GB or 65k files)
  if (cdOffset === 0xffffffff || count === 0xffff) {
    const loc = eocd - 20
    if (loc >= 0 && u32(tail, loc) === 0x07064b50) {
      const z64Offset = u64(tail, loc + 8)
      const z64 = await readRange(blob, z64Offset, z64Offset + 56)
      count = u64(z64, 32)
      cdSize = u64(z64, 40)
      cdOffset = u64(z64, 48)
    }
  }
  const cd = await readRange(blob, cdOffset, cdOffset + cdSize)
  const dec = new TextDecoder()
  const entries = []
  let p = 0
  for (let n = 0; n < count; n++) {
    if (u32(cd, p) !== 0x02014b50) throw new Error('Narration package is damaged (bad directory entry).')
    const method = u16(cd, p + 10)
    let compressedSize = u32(cd, p + 20)
    let size = u32(cd, p + 24)
    const nameLen = u16(cd, p + 28)
    const extraLen = u16(cd, p + 30)
    const commentLen = u16(cd, p + 32)
    let localHeaderOffset = u32(cd, p + 42)
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen))
    // ZIP64 extended info
    let e = p + 46 + nameLen
    const extraEnd = e + extraLen
    while (e + 4 <= extraEnd) {
      const id = u16(cd, e), len = u16(cd, e + 2)
      if (id === 0x0001) {
        let q = e + 4
        if (size === 0xffffffff) { size = u64(cd, q); q += 8 }
        if (compressedSize === 0xffffffff) { compressedSize = u64(cd, q); q += 8 }
        if (localHeaderOffset === 0xffffffff) { localHeaderOffset = u64(cd, q) }
      }
      e += 4 + len
    }
    entries.push({ name, method, compressedSize, size, localHeaderOffset })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

async function entryBlob(blob, entry, mime) {
  const head = await readRange(blob, entry.localHeaderOffset, entry.localHeaderOffset + 30)
  if (u32(head, 0) !== 0x04034b50) throw new Error(`Narration package is damaged (${entry.name}).`)
  const start = entry.localHeaderOffset + 30 + u16(head, 26) + u16(head, 28)
  const raw = blob.slice(start, start + entry.compressedSize)
  if (entry.method === 0) return mime ? new Blob([raw], { type: mime }) : raw
  if (entry.method === 8) {
    if (entry.size > 64 * 1024 * 1024) throw new Error(`${entry.name} is compressed and too large to import on this device.`)
    const data = inflateSync(new Uint8Array(await raw.arrayBuffer()))
    return new Blob([data], { type: mime || '' })
  }
  throw new Error(`Unsupported compression in ${entry.name}.`)
}

export function validateManifest(m) {
  const errors = []
  if (!m || m.format !== PACKAGE_FORMAT) errors.push('Not a Lantern narration package.')
  else {
    if (m.version > PACKAGE_VERSION) errors.push(`Package version ${m.version} is newer than this Lantern supports.`)
    if (!m.book?.contentId) errors.push('Package has no book identifier.')
    if (!Array.isArray(m.sections) || m.sections.length === 0) errors.push('Package has no chapters.')
    const ids = new Set()
    for (const s of m.sections || []) {
      if (!s.id || ids.has(s.id)) errors.push(`Bad or duplicate chapter id: ${s.id}`)
      ids.add(s.id)
      if (!s.file) errors.push(`Chapter ${s.id} has no audio file.`)
      if (s.mime && !PLAYABLE_MIME.test(s.mime)) errors.push(`Chapter ${s.id} has an unsupported audio type (${s.mime}).`)
      if (!Array.isArray(s.segments)) errors.push(`Chapter ${s.id} has no timing map.`)
      else {
        let prev = -1
        for (const g of s.segments) {
          if (!(g.t1 >= g.t0) || g.t0 < prev) { errors.push(`Chapter ${s.id} has an out-of-order timing map.`); break }
          prev = g.t0
        }
      }
    }
  }
  return errors
}

/** Stable id for an audiobook: the same book + voice + engine + speed replaces itself on re-import. */
export function audiobookIdFor(manifest) {
  const n = manifest.narration || {}
  return [manifest.book.contentId.replace(/^sha256:/, '').slice(0, 16), n.engine || 'engine', n.voice || 'voice', n.speed ?? 1]
    .join('~')
}

/**
 * Open a package File. Returns { manifest, id, getBlob(section) } without reading audio yet.
 */
export async function openAudiobookPackage(file) {
  const entries = await readZipDirectory(file)
  const byName = new Map(entries.map(e => [e.name, e]))
  const mEntry = byName.get('manifest.json')
  if (!mEntry) throw new Error('This package has no manifest.json.')
  let manifest
  try {
    manifest = JSON.parse(await (await entryBlob(file, mEntry)).text())
  } catch {
    throw new Error('The package manifest could not be read.')
  }
  const errors = validateManifest(manifest)
  if (errors.length) throw new Error(errors[0])
  for (const s of manifest.sections) {
    if (!byName.has(s.file)) throw new Error(`Audio for "${s.title || s.id}" is missing from the package.`)
  }
  return {
    manifest,
    id: audiobookIdFor(manifest),
    getBlob: section => entryBlob(file, byName.get(section.file), section.mime || 'audio/mp4'),
  }
}
