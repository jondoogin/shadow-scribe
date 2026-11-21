import { useEffect, useMemo, useState } from 'react'
import { useLibrary } from './libraryStore.js'
import { itemsForBook, itemsOnDevice, restoreFromLibrary, KIND_LABEL } from './restore.js'
import { formatBytes } from '../narration/sectionLabels.js'

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * "In your library" line for one book: whatever the encrypted cloud library
 * holds for it that this device doesn't have yet, with one button to get it.
 * Renders nothing when the library is locked, off, or has nothing new.
 */
export default function FromLibrary({ book, onUpdateBook, onRestored, onAvailable, style }) {
  const lib = useLibrary()
  const [onDevice, setOnDevice] = useState(null)
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  const forBook = useMemo(() => {
    if (lib.status !== 'unlocked') return []
    if (book.contentId) return itemsForBook(lib.items, book.contentId)
    // No EPUB linked yet: offer a stored EPUB whose title matches this companion.
    const epub = lib.items.find(i => i.kind === 'epub' && i.status === 'ready' && norm(i.meta?.title) === norm(book.title))
    return epub ? itemsForBook(lib.items, epub.contentId) : []
  }, [lib.status, lib.items, book.contentId, book.title])

  useEffect(() => {
    let live = true
    itemsOnDevice(forBook).then(s => { if (live) setOnDevice(s) }, () => { if (live) setOnDevice(new Set()) })
    return () => { live = false }
  }, [forBook])

  const missing = onDevice ? forBook.filter(i => !onDevice.has(i.id)) : []
  const available = missing.length > 0
  useEffect(() => { onAvailable?.(available) }, [available, onAvailable])
  if (!missing.length && !message) return null

  const getAll = async () => {
    setMessage(null)
    let linked = book.contentId
    try {
      for (const item of missing) {
        setBusy(`${KIND_LABEL[item.kind]}…`)
        const r = await restoreFromLibrary(item, p => setBusy(`${KIND_LABEL[item.kind]} ${p.done} of ${p.total}…`))
        if (r.kind === 'epub' && r.contentId !== linked) {
          onUpdateBook?.({ contentId: r.contentId })
          linked = r.contentId
        }
      }
      setMessage({ ok: true, text: 'Downloaded from your library.' })
      setOnDevice(await itemsOnDevice(forBook))
      onRestored?.()
    } catch (err) {
      setMessage({ ok: false, text: err?.message || 'Could not get that from your library.' })
    } finally {
      setBusy(null)
    }
  }

  const total = missing.reduce((n, i) => n + i.bytes, 0)
  return (
    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, ...style }}>
      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>
            In your library: {missing.map(i => i.kind === 'epub' ? 'the EPUB' : i.kind === 'audio' && i.meta?.label ? `narration (${i.meta.label})` : KIND_LABEL[i.kind].toLowerCase()).join(', ')} · {formatBytes(total)}
          </span>
          <button className="c2-btn c2-btn--primary" style={{ padding: '0 18px' }} disabled={!!busy} onClick={getAll}>
            {busy ? `Getting ${busy}` : 'Get from library'}
          </button>
        </div>
      )}
      {message && <p role={message.ok ? 'status' : 'alert'} style={{ fontSize: 12, marginTop: 6, color: message.ok ? 'var(--color-text-dim)' : 'var(--color-ember)' }}>{message.text}</p>}
    </div>
  )
}
