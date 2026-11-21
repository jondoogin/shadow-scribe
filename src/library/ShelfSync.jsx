import { useEffect } from 'react'
import { syncShelf } from './shelf.js'
import { subscribeLibrary, getLibrarySnapshot } from './libraryStore.js'

/**
 * Mac dev server only: keep this device and the cloud library in step with
 * what the narrator has finished (docs/LIBRARY.md, "Narrator shelf").
 * Runs on start, whenever the library unlocks, and every minute.
 */
export default function ShelfSync() {
  useEffect(() => {
    if (!import.meta.env.DEV) return
    let last = getLibrarySnapshot().status
    syncShelf()
    const unsub = subscribeLibrary(() => {
      const st = getLibrarySnapshot().status
      if (st === 'unlocked' && last !== 'unlocked') syncShelf()
      last = st
    })
    const id = setInterval(() => syncShelf(), 60_000)
    return () => { unsub(); clearInterval(id) }
  }, [])
  return null
}
