// Visual Journey spoiler gate and pacing. Pure functions, no DOM.
//
// Rule (docs/VISUAL_JOURNEY.md §5): an image may be shown only once the
// reader's CURRENT position is past the last segment of the text it was made
// from (`visibleAfter`). Pictures change on story position, never on a clock;
// the only timing rule is a minimum time on screen so quick context shifts
// don't flicker. Nothing time-based can ever move past the gate.

const blockNum = (id) => {
  const m = /^b(\d+)/.exec(String(id ?? ''))
  return m ? Number(m[1]) : -1
}
const segNum = (id) => {
  const m = /^b\d+\.(\d+)$/.exec(String(id ?? ''))
  return m ? Number(m[1]) : -1
}

/**
 * Order two locators { sectionId, blockId, segmentId? }.
 * `sectionOrder` maps sectionId → spine order (a Map, an object, or an array of ids).
 * A locator without a segment counts as the START of its block: a Reader
 * position (top visible paragraph) has not yet "passed" that paragraph's
 * sentences, which keeps the gate conservative.
 * Returns <0, 0 or >0. Unknown sections sort first (never ahead of anything).
 */
function sectionIndex(id, sectionOrder) {
  if (sectionOrder instanceof Map) return sectionOrder.has(id) ? sectionOrder.get(id) : -1
  if (Array.isArray(sectionOrder)) return sectionOrder.indexOf(id)
  return sectionOrder && id in sectionOrder ? sectionOrder[id] : -1
}

export function compareLocators(a, b, sectionOrder) {
  const ord = (id) => sectionIndex(id, sectionOrder)
  const sa = ord(a?.sectionId), sb = ord(b?.sectionId)
  if (sa !== sb) return sa - sb
  const ba = blockNum(a?.blockId), bb = blockNum(b?.blockId)
  if (ba !== bb) return ba - bb
  return segNum(a?.segmentId) - segNum(b?.segmentId)
}

/**
 * True when `position` is strictly past the image's `visibleAfter`.
 * An image or position in a section the book doesn't know is never eligible:
 * unknown sections would otherwise sort first and slip through the gate.
 */
export function isEligible(image, position, sectionOrder) {
  if (!image?.visibleAfter || !position) return false
  if (sectionIndex(image.visibleAfter.sectionId, sectionOrder) < 0) return false
  if (sectionIndex(position.sectionId, sectionOrder) < 0) return false
  return compareLocators(image.visibleAfter, position, sectionOrder) < 0
}

/** Eligible images, in story order. */
export function eligibleImages(images, position, sectionOrder) {
  return sortImages(images, sectionOrder).filter(img => isEligible(img, position, sectionOrder))
}

export function sortImages(images, sectionOrder) {
  return [...(images || [])].sort((x, y) => compareLocators(x.visibleAfter, y.visibleAfter, sectionOrder))
}

/** The next `n` images that are not yet eligible (for decode-ahead only, never for display). */
export function upcomingImages(images, position, sectionOrder, n = 2) {
  return sortImages(images, sectionOrder).filter(img => !isEligible(img, position, sectionOrder)).slice(0, n)
}

/**
 * Decide which image the stage should show.
 *
 * @param {object} p
 * @param {Array} p.images          all images of the set
 * @param {object} p.position       current locator
 * @param {*} p.sectionOrder
 * @param {string|null} p.currentId image on stage now
 * @param {number} p.shownAt        when it went on stage (ms)
 * @param {number} p.now            ms
 * @param {number} p.minOnScreenMs  minimum time an image stays before the next one replaces it
 * @returns {{ id: string|null, changed: boolean, wakeAt: number|null }}
 *   wakeAt: when to ask again because an already-eligible image is waiting
 *   out the minimum time. It never asks to reveal anything new.
 */
export function chooseImage({ images, position, sectionOrder, currentId, shownAt = 0, now, minOnScreenMs }) {
  const eligible = eligibleImages(images, position, sectionOrder)
  const target = eligible.length ? eligible[eligible.length - 1].id : null
  const currentOk = currentId != null && eligible.some(img => img.id === currentId)

  // Nothing on stage, or what is on stage is now ahead of the reader (they
  // went back): change at once, because keeping it would be a spoiler.
  if (!currentOk) return { id: target, changed: target !== currentId, wakeAt: null }
  if (target === currentId) return { id: currentId, changed: false, wakeAt: null }
  const due = shownAt + minOnScreenMs
  if (now >= due) return { id: target, changed: true, wakeAt: null }
  return { id: currentId, changed: false, wakeAt: due }
}
