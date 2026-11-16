// ── Follow-along transcript: pure helpers ────────────────────────────────────
// Rendering and DOM work live in components/transcript/. Everything here is
// plain data so it can be tested in Node. See docs/TRANSCRIPT.md.

/**
 * Split a chapter's blocks into pieces tied to narration segments.
 * @param {Array<{id, type, text}>} blocks   content blocks (IndexedDB `sections`)
 * @param {Array<{blockId, start, end}>} segments  the player's segments for this chapter, in order
 * @returns {Array<{ id, type, pieces: Array<{ text, seg: number|null }> }>}
 *   `seg` is the segment's index in `segments`, or null for text between segments.
 */
export function buildTranscript(blocks, segments) {
  const byBlock = new Map()
  ;(segments || []).forEach((s, i) => {
    if (!s || s.start == null || s.end == null) return
    if (!byBlock.has(s.blockId)) byBlock.set(s.blockId, [])
    byBlock.get(s.blockId).push({ start: s.start, end: s.end, i })
  })
  return (blocks || []).map(b => {
    if (b.type === 'break') return { id: b.id, type: 'break', pieces: [] }
    const text = b.text || ''
    const segs = (byBlock.get(b.id) || []).slice().sort((x, y) => x.start - y.start)
    const pieces = []
    let at = 0
    for (const s of segs) {
      const start = Math.max(at, Math.min(s.start, text.length))
      const end = Math.max(start, Math.min(s.end, text.length))
      if (start > at) pieces.push({ text: text.slice(at, start), seg: null })
      if (end > start) pieces.push({ text: text.slice(start, end), seg: s.i })
      at = end
    }
    if (at < text.length) pieces.push({ text: text.slice(at), seg: null })
    return { id: b.id, type: b.type || 'paragraph', pieces }
  })
}

/**
 * How one segment should look.
 * @param {number} k        segment index
 * @param {number} current  index being spoken (-1 before the first)
 * @param {object} o
 * @param {boolean} o.reveal   "reveal as spoken": veil everything after the next sentence
 * @param {boolean} o.veilHeading  strict spoiler mode in an unreached chapter: veil headings until spoken
 * @param {boolean} o.isHeading
 * @returns {'spoken'|'current'|'ahead'|'veiled'}
 */
export function segmentState(k, current, { reveal = false, veilHeading = false, isHeading = false } = {}) {
  if (k < current) return 'spoken'
  if (k === current) return 'current'
  if (isHeading && veilHeading) return 'veiled'
  if (reveal && k > current + 1) return 'veiled'
  return 'ahead'
}

// The current sentence rests near 38% of the view and the page moves only when
// it drifts outside a comfortable band, so scrolling happens in calm steps.
export const FOLLOW = { anchor: 0.38, bandTop: 0.25, bandBottom: 0.55 }

/**
 * New scrollTop for a scroll container, or null if no scroll is needed.
 * Positions are in the container's content coordinates.
 */
export function followScrollTarget({ top, bottom }, { scrollTop, height, scrollHeight }, follow = FOLLOW) {
  const viewTop = scrollTop + height * follow.bandTop
  const viewBottom = scrollTop + height * follow.bandBottom
  const tall = bottom - top > height * (follow.bandBottom - follow.bandTop)
  if (top >= viewTop && (bottom <= viewBottom || tall) && top <= viewBottom) return null
  const target = Math.round(top - height * follow.anchor)
  const max = Math.max(0, (scrollHeight ?? Infinity) - height)
  const next = Math.max(0, Math.min(target, max))
  return Math.abs(next - scrollTop) < 2 ? null : next
}
