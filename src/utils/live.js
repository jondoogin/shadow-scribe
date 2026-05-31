/**
 * live.js — Tombstone filter for id-keyed arrays.
 *
 * Tombstoned items (deleted: true) remain in book.notes / book.mysteries so that
 * multi-device sync can resolve deletions correctly: the later-timestamped side
 * wins, and a tombstone from Device A beats an un-deleted copy still on Device B.
 *
 * All code that DISPLAYS or COMPUTES from notes/mysteries must call liveItems()
 * first. Code that WRITES back to the array (onUpdateBook) works on the full
 * array including tombstones — do not filter before writing.
 */
export function liveItems(arr) {
  return Array.isArray(arr) ? arr.filter(item => !item?.deleted) : []
}
