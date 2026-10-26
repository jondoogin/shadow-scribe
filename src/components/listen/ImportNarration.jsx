import { useRef, useState } from 'react'
import { openAudiobookPackage } from '../../narration/audiobookPackage.js'
import { saveAudiobook, requestPersistentStorage } from '../../content/contentRepository.js'
import { formatBytes, formatDuration } from '../../narration/sectionLabels.js'

/**
 * Import a `.lantern-audio` package produced by the Mac narrator. Works the
 * same on desktop and iPhone (Files app, AirDrop, iCloud Drive).
 */
export default function ImportNarration({ book, onUpdateBook, onImported }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(null)        // { done, total, bytes }
  const [pending, setPending] = useState(null)  // { pkg, reason }
  const [message, setMessage] = useState(null)

  const run = async (pkg) => {
    setPending(null)
    setBusy({ done: 0, total: pkg.manifest.sections.length, bytes: 0 })
    try {
      await saveAudiobook(pkg.id, pkg.manifest, pkg.getBlob, p => setBusy(p))
      await requestPersistentStorage()
      if (book.contentId !== pkg.manifest.book.contentId) onUpdateBook({ contentId: pkg.manifest.book.contentId })
      setMessage(null)
      onImported?.(pkg.id)
    } catch (err) {
      setMessage(err?.message || 'Import failed. Nothing was saved.')
    } finally {
      setBusy(null)
    }
  }

  const handleFile = async (file) => {
    if (!file) return
    setMessage(null)
    try {
      const pkg = await openAudiobookPackage(file)
      const m = pkg.manifest
      if (!book.contentId) {
        setPending({ pkg, reason: `This narration is for “${m.book.title}”. Attach it to this companion?` })
      } else if (book.contentId !== m.book.contentId) {
        setPending({ pkg, reason: `This narration was generated from a different EPUB file (“${m.book.title}”). Positions may not line up with the text you linked. Use it anyway?` })
      } else {
        await run(pkg)
      }
    } catch (err) {
      setMessage(err?.message || 'That file is not a Lantern narration package.')
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept=".lantern-audio,.zip,application/zip" hidden onChange={e => handleFile(e.target.files?.[0])} />
      {busy ? (
        <p role="status" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Importing chapter {busy.done} of {busy.total} · {formatBytes(busy.bytes)}…
        </p>
      ) : pending ? (
        <div role="alertdialog" aria-label="Confirm narration import" style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: 6 }}>{pending.reason}</p>
          <p style={{ marginBottom: 10, fontSize: 12, color: 'var(--color-text-dim)' }}>
            {pending.pkg.manifest.narration?.engineLabel} · {pending.pkg.manifest.narration?.voice} · {formatDuration(pending.pkg.manifest.totalDurationSec)}
          </p>
          <div className="flex gap-3">
            <button className="listen-btn" onClick={() => run(pending.pkg)}>Import</button>
            <button className="listen-link" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="listen-link" onClick={() => input.current?.click()}>Import narration (.lantern-audio)…</button>
      )}
      {message && <p role="alert" style={{ fontSize: 12, color: 'var(--color-ember)', marginTop: 8 }}>{message}</p>}
    </div>
  )
}
