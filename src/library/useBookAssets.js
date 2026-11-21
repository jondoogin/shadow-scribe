import { useCallback, useEffect, useRef, useState } from 'react'
import { useLibrary } from './libraryStore.js'
import { loadAssetOptions, bringToDevice, ensureText } from './bookAssets.js'

/**
 * Narrators and painting sets for one book, from this device and the cloud
 * library, plus `bring(option)` to download one (and its EPUB) on demand.
 */
export function useBookAssets(book, { onUpdateBook, onChanged } = {}) {
  const lib = useLibrary()
  const items = lib.status === 'unlocked' ? lib.items : null
  const [options, setOptions] = useState({ narrators: [], paintings: [], epubs: new Map(), ready: false })
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  const bookRef = useRef(book)
  useEffect(() => { bookRef.current = book }, [book])

  useEffect(() => {
    if (!book) return
    let live = true
    loadAssetOptions(book, items || []).then(o => { if (live) setOptions({ ...o, ready: true }) }, () => {})
    return () => { live = false }
  }, [book?.id, book?.contentId, book?.title, items, version]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => setVersion(v => v + 1), [])

  const bring = useCallback(async (option) => {
    setError(null)
    try {
      const res = await bringToDevice(option, { book: bookRef.current, epubs: options.epubs, onUpdateBook, onStatus: setStatus })
      refresh()
      onChanged?.()
      return res
    } catch (err) {
      setStatus(null)
      setError(err?.message || 'Could not download that.')
      return null
    }
  }, [options.epubs, onUpdateBook, onChanged, refresh])

  /** Get the book's text from the library when this device has none. */
  const bringText = useCallback(async () => {
    const b = bookRef.current
    const epub = (b.contentId && options.epubs.get(b.contentId)) || [...options.epubs.values()][0]
    if (!epub) return false
    setError(null)
    try {
      await ensureText(epub.contentId, options.epubs, setStatus)
      if (b.contentId !== epub.contentId) onUpdateBook?.({ contentId: epub.contentId })
      setStatus(null)
      refresh()
      onChanged?.()
      return true
    } catch (err) {
      setStatus(null)
      setError(err?.message || 'Could not get the book from your library.')
      return false
    }
  }, [options.epubs, onUpdateBook, onChanged, refresh])

  return { ...options, libraryStatus: lib.status, status, error, clearError: () => setError(null), bring, bringText, refresh }
}
