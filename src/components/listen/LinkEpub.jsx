import { useRef, useState } from 'react'
import { parseEpub } from '../../utils/epubParser.js'
import { saveContent, requestPersistentStorage } from '../../content/contentRepository.js'

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Attach a DRM-free EPUB's text to an existing companion. Only the book's
 * local text store and `book.contentId` change; notes, characters, progress and
 * spoiler settings are never touched.
 */
export default function LinkEpub({ book, onLinked, onUpdateBook, compact = false }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [pending, setPending] = useState(null) // parsed content awaiting confirmation

  const commit = async (content) => {
    await saveContent(content)
    await requestPersistentStorage()
    onUpdateBook({ contentId: content.contentId })
    setPending(null)
    setMessage(null)
    onLinked?.(content.contentId)
  }

  const handleFile = async (file) => {
    if (!file) return
    setBusy(true)
    setMessage(null)
    try {
      const data = await parseEpub(file)
      if (!data.content) throw new Error(data.warnings?.find(w => /DRM|text could not/.test(w)) || 'No readable text was found in this EPUB.')
      const matches = norm(data.title) === norm(book.title)
      if (matches) await commit(data.content)
      else setPending({ content: data.content, title: data.title, author: data.author })
    } catch (err) {
      setMessage(err?.message || 'That EPUB could not be read.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className={compact ? '' : 'listen-panel'}>
      {!compact && (
        <>
          <p className="font-serif" style={{ fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 6 }}>
            This companion doesn’t have the book’s text on this device yet.
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
            Link the DRM-free EPUB to read and listen here. Your notes, characters and progress stay exactly as they are.
            The text is kept only in this browser and is never uploaded.
          </p>
        </>
      )}
      <input ref={input} type="file" accept=".epub,application/epub+zip" hidden onChange={e => handleFile(e.target.files?.[0])} />
      {pending ? (
        <div role="alertdialog" aria-label="Confirm EPUB" style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: 10 }}>
            This EPUB is <em>{pending.title}</em>{pending.author ? ` by ${pending.author}` : ''}, which doesn’t match
            this companion’s title (<em>{book.title}</em>). Link it anyway?
          </p>
          <div className="flex gap-3">
            <button className="listen-btn" onClick={() => commit(pending.content)}>Link this EPUB</button>
            <button className="listen-link" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="listen-btn" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Reading EPUB…' : compact ? 'Link a different EPUB' : 'Link EPUB'}
        </button>
      )}
      {message && <p role="alert" style={{ fontSize: 12, color: 'var(--color-ember)', marginTop: 10 }}>{message}</p>}
    </div>
  )
}
