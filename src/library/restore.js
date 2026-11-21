// ── Saving imports to the library, and bringing them back ────────────────────
// Each kind goes up exactly as it was imported and comes back through the same
// importer a hand-picked file uses, so the checks (DRM, manifest, edition,
// spoiler gate) all still apply.

import { parseEpub } from '../utils/epubParser.js'
import { openAudiobookPackage } from '../narration/audiobookPackage.js'
import { importVisualPackage } from '../atmosphere/visual/visualImport.js'
import { saveContent, saveAudiobook, getContentMeta, listAudiobooks, listVisualSets, requestPersistentStorage } from '../content/contentRepository.js'
import { backupToLibrary, fetchFromLibrary } from './libraryStore.js'

// The EPUB File a parse came from, by contentId, until it is saved (or forgotten).
const epubFiles = new Map()
export function rememberEpubFile(contentId, file) {
  if (!contentId || !file) return
  epubFiles.set(contentId, file)
  if (epubFiles.size > 4) epubFiles.delete(epubFiles.keys().next().value)
}

/** After an EPUB's text is saved on this device. */
export function backupEpub(content) {
  const file = epubFiles.get(content?.contentId)
  if (!file) return
  epubFiles.delete(content.contentId)
  return backupToLibrary({
    kind: 'epub', naturalId: content.contentId, contentId: content.contentId, file,
    meta: { naturalId: content.contentId, title: content.title, author: content.author, filename: file.name || 'book.epub' },
  })
}

/** After a .lantern-audio package is imported. */
export function backupNarration(file, manifest, id) {
  const n = manifest.narration || {}
  return backupToLibrary({
    kind: 'audio', naturalId: id, contentId: manifest.book.contentId, file,
    meta: {
      naturalId: id, title: manifest.book.title, author: manifest.book.author, filename: file.name || 'narration.lantern-audio',
      label: [n.engineLabel || n.engine, String(n.voice || '').replace(/_/g, ' '), n.style ? `“${n.style}”` : ''].filter(Boolean).join(' · '),
    },
  })
}

/** After a .lantern-visuals package is imported. */
export function backupPaintings(file, result, book) {
  const st = result.manifest?.style || {}
  return backupToLibrary({
    kind: 'visuals', naturalId: result.id, contentId: book.contentId, file,
    meta: { naturalId: result.id, title: book.title, author: book.author, filename: file.name || 'paintings.lantern-visuals', label: `${result.count} paintings${st.preset ? ` · ${st.preset}` : ''}` },
  })
}

/**
 * Download one library item and import it on this device.
 * @returns {{ kind, contentId, id? }}
 */
export async function restoreFromLibrary(item, onProgress) {
  const file = await fetchFromLibrary(item)
  if (item.kind === 'epub') {
    const data = await parseEpub(file)
    if (!data.content) throw new Error('This EPUB has no readable text.')
    epubFiles.delete(data.content.contentId) // it came from the library; don't upload it back
    await saveContent(data.content)
    await requestPersistentStorage()
    return { kind: 'epub', contentId: data.content.contentId }
  }
  if (item.kind === 'audio') {
    const pkg = await openAudiobookPackage(file)
    await saveAudiobook(pkg.id, pkg.manifest, pkg.getBlob, onProgress, pkg.getWordTimings)
    await requestPersistentStorage()
    return { kind: 'audio', contentId: pkg.manifest.book.contentId, id: pkg.id }
  }
  if (item.kind === 'visuals') {
    const meta = await getContentMeta(item.contentId)
    if (!meta) throw new Error('Get the book’s EPUB first: paintings follow its text.')
    const r = await importVisualPackage(file, { contentId: item.contentId }, meta, onProgress)
    await requestPersistentStorage()
    return { kind: 'visuals', contentId: item.contentId, id: r.id }
  }
  throw new Error(`Unknown library item: ${item.kind}`)
}

const ORDER = { epub: 0, audio: 1, visuals: 2 }
/** Everything stored for one book, EPUB first (paintings need its text). */
export function itemsForBook(items, contentId) {
  return items.filter(i => i.contentId === contentId && i.status === 'ready').sort((a, b) => ORDER[a.kind] - ORDER[b.kind])
}

/** Which library items are already on this device. @returns {Promise<Set<string>>} item ids */
export async function itemsOnDevice(items) {
  const have = new Set()
  if (!items?.length) return have
  const audio = new Set((await listAudiobooks()).map(a => a.id))
  const visuals = new Set((await listVisualSets()).map(v => v.id))
  for (const it of items) {
    if (it.kind === 'epub' && await getContentMeta(it.contentId)) have.add(it.id)
    if (it.kind === 'audio' && audio.has(it.meta?.naturalId)) have.add(it.id)
    if (it.kind === 'visuals' && visuals.has(it.meta?.naturalId)) have.add(it.id)
  }
  return have
}

export const KIND_LABEL = { epub: 'EPUB', audio: 'Narration', visuals: 'Paintings' }
