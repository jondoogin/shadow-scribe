// ── Narrator shelf → this device → cloud library (Mac, dev server only) ──────
// `scripts/narrator-shelf.mjs` lists what the Mac narrator has finished. Here
// the app takes each file in (EPUB first, because paintings need its text),
// and, when the cloud library is unlocked, uploads it encrypted. On every
// other device the same narrators and paintings then appear in Listen's
// dropdowns. No file picker, no AirDrop.

import { parseEpub } from '../utils/epubParser.js'
import { openAudiobookPackage } from '../narration/audiobookPackage.js'
import { openVisualPackage } from '../atmosphere/visual/visualPackage.js'
import { importVisualPackage } from '../atmosphere/visual/visualImport.js'
import { getContentMeta, getAudiobook, listVisualSets, saveContent, saveAudiobook } from '../content/contentRepository.js'
import { backupEpubFile, backupNarration, backupPaintings } from './restore.js'
import { getLibrarySnapshot, isUnlocked } from './libraryStore.js'

const SEEN_KEY = 'lantern_shelf' // { "<name>@<mtime>": { id, kind } } — device-local
const ORDER = { epub: 0, audio: 1, visuals: 2 }

function loadSeen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') } catch { return {} } }
function saveSeen(s) { try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)) } catch { /* best effort */ } }

/** The shelf listing, or null when this isn't the Mac dev server. */
export async function readShelf() {
  if (!import.meta.env?.DEV) return null
  try {
    const r = await fetch('/__lantern/shelf', { cache: 'no-store' })
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null
    return await r.json()
  } catch { return null }
}

async function onDevice(kind, id) {
  if (kind === 'epub') return !!(await getContentMeta(id))
  if (kind === 'audio') return !!(await getAudiobook(id).catch(() => null))
  return (await listVisualSets()).some(v => v.id === id)
}

const inLibrary = (kind, id) => getLibrarySnapshot().items.some(i => i.kind === kind && i.meta?.naturalId === id)

let running = null
/**
 * Take in everything on the shelf that this device or the library lacks.
 * @returns {Promise<{ imported: number, uploaded: number }|null>}
 */
export function syncShelf({ onStatus } = {}) {
  if (running) return running
  running = (async () => {
    const shelf = await readShelf()
    if (!shelf?.files?.length) return null
    const seen = loadSeen()
    let imported = 0, uploaded = 0
    const files = [...shelf.files].sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.name.localeCompare(b.name))
    for (const f of files) {
      const key = `${f.name}@${f.mtimeMs}`
      const known = seen[key]
      const unlocked = isUnlocked()
      if (known && await onDevice(known.kind, known.id) && (!unlocked || inLibrary(known.kind, known.id))) continue
      try {
        onStatus?.(`Taking in ${f.name}…`)
        const res = await fetch(`/__lantern/shelf/${encodeURIComponent(f.name)}`, { cache: 'no-store' })
        if (!res.ok) continue
        const file = new File([await res.blob()], f.name)
        let id, upload = null
        if (f.kind === 'epub') {
          const data = await parseEpub(file)
          if (!data.content) continue
          id = data.content.contentId
          if (!(await getContentMeta(id))) { await saveContent(data.content); imported++ }
          upload = () => backupEpubFile(data.content, file, { force: true })
        } else if (f.kind === 'audio') {
          const pkg = await openAudiobookPackage(file)
          id = pkg.id
          if (!(await onDevice('audio', id))) { await saveAudiobook(pkg.id, pkg.manifest, pkg.getBlob, null, pkg.getWordTimings); imported++ }
          upload = () => backupNarration(file, pkg.manifest, pkg.id, { force: true })
        } else {
          const peek = await openVisualPackage(file)
          const contentId = peek.manifest.book.contentId
          const meta = await getContentMeta(contentId)
          if (!meta) continue // its EPUB isn't on the shelf or the device; nothing to anchor the gate to
          id = peek.id
          let result = { id, count: peek.images.length, manifest: peek.manifest }
          if (!(await onDevice('visuals', id))) { result = await importVisualPackage(file, { contentId }, meta); imported++ }
          const book = { contentId, title: peek.manifest.book.title, author: peek.manifest.book.author }
          upload = () => backupPaintings(file, result, book, { force: true })
        }
        if (isUnlocked() && !inLibrary(f.kind, id)) { onStatus?.(`Saving ${f.name} to your library…`); if (await upload()) uploaded++ }
        seen[key] = { id, kind: f.kind }
        saveSeen(seen)
      } catch (err) {
        console.warn('[shelf]', f.name, err?.message)
      }
    }
    onStatus?.(null)
    return { imported, uploaded }
  })().finally(() => { running = null })
  return running
}
