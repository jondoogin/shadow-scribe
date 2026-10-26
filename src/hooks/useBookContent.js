import { useCallback, useEffect, useState } from 'react'
import { getContentMeta, listAudiobooks } from '../content/contentRepository.js'

/** Local text + installed narrations for a companion. `reload()` after imports. */
export function useBookContent(book) {
  const contentId = book?.contentId || null
  const [state, setState] = useState({ loading: true, meta: null, audiobooks: [], error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [meta, audiobooks] = contentId
          ? await Promise.all([getContentMeta(contentId), listAudiobooks(contentId)])
          : [null, []]
        if (!cancelled) setState({ loading: false, meta, audiobooks, error: null })
      } catch (err) {
        if (!cancelled) setState({ loading: false, meta: null, audiobooks: [], error: err?.message || 'Local storage unavailable' })
      }
    })()
    return () => { cancelled = true }
  }, [contentId, version])

  const reload = useCallback(() => setVersion(v => v + 1), [])
  return { ...state, reload }
}
