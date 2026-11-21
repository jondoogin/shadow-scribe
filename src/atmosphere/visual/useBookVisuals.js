import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listVisualSets, getVisualImage } from '../../content/contentRepository.js'
import { sortImages, upcomingImages, eligibleImages } from './eligibility.js'

const REVOKE_DELAY_MS = 30_000

/**
 * The paintings installed for a book (the newest set if there are several),
 * and the book's section order for the spoiler gate.
 */
export function useBookVisuals(book, meta, setId = null) {
  const contentId = book?.contentId || null
  const [state, setState] = useState({ loading: true, set: null, sets: [] })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const sets = contentId ? await listVisualSets(contentId) : []
        sets.sort((a, b) => (b.importedAt || '').localeCompare(a.importedAt || ''))
        if (!cancelled) setState({ loading: false, set: sets.find(s => s.id === setId) || sets[0] || null, sets })
      } catch {
        if (!cancelled) setState({ loading: false, set: null, sets: [] })
      }
    })()
    return () => { cancelled = true }
  }, [contentId, version, setId])

  const sectionOrder = useMemo(() => {
    const secs = [...(meta?.sections || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return new Map(secs.map((s, i) => [s.id, i]))
  }, [meta])

  const images = useMemo(() => sortImages(state.set?.images || [], sectionOrder), [state.set, sectionOrder])
  const reload = useCallback(() => setVersion(v => v + 1), [])
  return { ...state, images, sectionOrder, reload }
}

/**
 * Turn the gate's choice into something the stage can draw.
 *
 * Holds object URLs only for a small queue: the image on stage, the one
 * before it (for a step back), and the next two by `visibleAfter`, which are
 * decoded ahead on detached elements so the paint-in starts smoothly. Decoding
 * ahead is not display: nothing here puts an image in the DOM, and the stage
 * only ever receives `chosen`, which the gate already allowed.
 *
 * @returns {object|null} chosen image with { src, strokes } once loaded
 */
export function usePaintingSources(setId, images, chosen, position, sectionOrder) {
  const cache = useRef(new Map())     // id → { src, strokes }
  const setRef = useRef(setId)
  const [ready, setReady] = useState({ id: null, entry: null })

  // A different set (or none) drops everything.
  useEffect(() => {
    setRef.current = setId
    const c = cache.current
    return () => {
      for (const e of c.values()) { URL.revokeObjectURL(e.src); if (e.strokes) URL.revokeObjectURL(e.strokes) }
      c.clear()
    }
  }, [setId])

  const keepIds = useMemo(() => {
    if (!setId || !images?.length) return []
    const ids = []
    if (chosen) ids.push(chosen.id)
    const before = eligibleImages(images, position, sectionOrder)
    const prev = before.length > 1 ? before[before.length - 2] : null
    if (prev) ids.push(prev.id)
    for (const img of upcomingImages(images, position, sectionOrder, 2)) ids.push(img.id)
    return [...new Set(ids)]
  }, [setId, images, chosen, position, sectionOrder])

  useEffect(() => {
    let cancelled = false
    const c = cache.current
    const sid = setId
    // Drop what left the queue. The URLs are revoked a little later, because
    // the stage may still be painting over the outgoing picture.
    for (const [id, e] of c) {
      if (!keepIds.includes(id)) {
        c.delete(id)
        setTimeout(() => { URL.revokeObjectURL(e.src); if (e.strokes) URL.revokeObjectURL(e.strokes) }, REVOKE_DELAY_MS)
      }
    }
    ;(async () => {
      for (const id of keepIds) {
        if (c.has(id)) continue
        const row = await getVisualImage(sid, id).catch(() => null)
        if (cancelled || setRef.current !== sid || !row?.blob) continue
        const entry = { src: URL.createObjectURL(row.blob), strokes: row.strokes ? URL.createObjectURL(row.strokes) : null }
        if (c.has(id)) { URL.revokeObjectURL(entry.src); if (entry.strokes) URL.revokeObjectURL(entry.strokes); continue }
        c.set(id, entry)
        // Decode ahead on a detached element (never attached to the page).
        const pre = new Image()
        pre.src = entry.src
        pre.decode?.().catch(() => {})
        if (chosen?.id === id) setReady({ id, entry })
      }
      if (!cancelled && chosen && c.has(chosen.id)) setReady(r => (r.id === chosen.id ? r : { id: chosen.id, entry: c.get(chosen.id) }))
    })()
    return () => { cancelled = true }
  }, [setId, keepIds, chosen])

  return useMemo(() => {
    if (!chosen || ready.id !== chosen.id || !ready.entry) return null
    return { ...chosen, src: ready.entry.src, strokes: ready.entry.strokes }
  }, [chosen, ready])
}

/** Object URLs for a few thumbnails (the eligible ones only). Revoked on change. */
export function useThumbs(setId, ids) {
  const [urls, setUrls] = useState({})
  const key = ids.join('|')
  useEffect(() => {
    let cancelled = false
    const made = {}
    ;(async () => {
      for (const id of ids) {
        const row = await getVisualImage(setId, id).catch(() => null)
        if (cancelled) break
        const b = row?.thumb || row?.blob
        if (b) made[id] = URL.createObjectURL(b)
      }
      if (!cancelled) setUrls(made)
    })()
    return () => { cancelled = true; for (const u of Object.values(made)) URL.revokeObjectURL(u) }
  }, [setId, key]) // eslint-disable-line react-hooks/exhaustive-deps
  return urls
}
