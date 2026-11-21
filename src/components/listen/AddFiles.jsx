import { useRef, useState } from 'react'
import { parseEpub } from '../../utils/epubParser.js'
import { openAudiobookPackage } from '../../narration/audiobookPackage.js'
import { openVisualPackage } from '../../atmosphere/visual/visualPackage.js'
import { importVisualPackage } from '../../atmosphere/visual/visualImport.js'
import { saveContent, saveAudiobook, getContentMeta, requestPersistentStorage } from '../../content/contentRepository.js'
import { rememberEpubFile, backupEpub, backupNarration, backupPaintings } from '../../library/restore.js'

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// iOS greys out unregistered extensions when `accept` is set, so take anything there.
const IS_IOS = typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
const ACCEPT = IS_IOS ? undefined : '.epub,.lantern-audio,.lantern-visuals,.zip,application/epub+zip,application/zip'

function kindOf(name) {
  if (/\.epub$/i.test(name)) return 'epub'
  if (/\.lantern-visuals$/i.test(name)) return 'visuals'
  if (/\.lantern-audio$/i.test(name)) return 'audio'
  return null
}

/**
 * One way in for any file: an EPUB, a narration or a painting set. Rarely
 * needed now (the Mac narrator's files arrive by themselves through the
 * library), so it lives as a quiet link.
 */
export default function AddFiles({ book, onUpdateBook, onAdded, label = 'Add a file…' }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(null)
  const [note, setNote] = useState(null)

  const relink = (contentId) => { if (contentId && book.contentId !== contentId) onUpdateBook({ contentId }) }

  const handle = async (file) => {
    if (!file) return
    setNote(null)
    try {
      let kind = kindOf(file.name)
      if (!kind) {
        // No telling extension (iOS renames sometimes): try each in turn.
        kind = await openAudiobookPackage(file).then(() => 'audio', () => openVisualPackage(file).then(() => 'visuals', () => 'epub'))
      }
      if (kind === 'epub') {
        setBusy('Reading the EPUB…')
        const data = await parseEpub(file)
        if (!data.content) throw new Error(data.warnings?.find(w => /DRM|text could not/.test(w)) || 'No readable text was found in this EPUB.')
        if (book.title && norm(data.title) !== norm(book.title) &&
          !window.confirm(`This EPUB is “${data.title}”. Use its text for “${book.title}”?`)) return
        rememberEpubFile(data.content.contentId, file)
        await saveContent(data.content)
        backupEpub(data.content)
        relink(data.content.contentId)
        setNote({ ok: true, text: 'Book text added.' })
      } else if (kind === 'audio') {
        const pkg = await openAudiobookPackage(file)
        await saveAudiobook(pkg.id, pkg.manifest, pkg.getBlob, p => setBusy(`Adding narration · chapter ${p.done} of ${p.total}…`), pkg.getWordTimings)
        backupNarration(file, pkg.manifest, pkg.id)
        relink(pkg.manifest.book.contentId)
        setNote({ ok: true, text: `Narration added: ${String(pkg.manifest.narration?.voice || '').replace(/_/g, ' ')}.` })
        onAdded?.('audio', pkg.id)
      } else {
        const peek = await openVisualPackage(file)
        const contentId = peek.manifest.book.contentId
        const meta = await getContentMeta(contentId)
        if (!meta) throw new Error('Add the EPUB these paintings were made from first: they follow its text.')
        const r = await importVisualPackage(file, { contentId }, meta, p => setBusy(`Adding painting ${p.done} of ${p.total || '…'}…`))
        backupPaintings(file, r, { ...book, contentId })
        relink(contentId)
        setNote({ ok: true, text: `${r.count} paintings added.` })
        onAdded?.('visuals', r.id)
      }
      await requestPersistentStorage()
      onAdded?.('any')
    } catch (err) {
      setNote({ ok: false, text: err?.message || 'That file could not be added.' })
    } finally {
      setBusy(null)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <>
      <input ref={input} type="file" hidden accept={ACCEPT} onChange={e => handle(e.target.files?.[0])} />
      {busy
        ? <p role="status" className="c2-fine">{busy}</p>
        : <button type="button" className="c2-link" onClick={() => input.current?.click()}>{label}</button>}
      {note && <p role={note.ok ? 'status' : 'alert'} className="c2-fine" style={{ marginTop: 4, color: note.ok ? undefined : 'var(--color-ember)' }}>{note.text}</p>}
    </>
  )
}
