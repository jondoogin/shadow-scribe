import { describe, it, expect } from 'vitest'
import { compareLocators, isEligible, eligibleImages, upcomingImages, chooseImage } from './eligibility.js'

const order = ['ch1', 'ch2', 'ch3']
const loc = (sectionId, blockId, segmentId) => ({ sectionId, blockId, segmentId })
const images = [
  { id: 'a', visibleAfter: loc('ch1', 'b3', 'b3.1') },
  { id: 'b', visibleAfter: loc('ch1', 'b12', 'b12.0') },
  { id: 'c', visibleAfter: loc('ch2', 'b2', 'b2.2') },
  { id: 'd', visibleAfter: loc('ch3', 'b0', 'b0.0') },
]
const MIN = 90_000

describe('compareLocators', () => {
  it('orders by section, then block number (not string), then segment', () => {
    expect(compareLocators(loc('ch1', 'b9'), loc('ch1', 'b10'), order)).toBeLessThan(0)
    expect(compareLocators(loc('ch2', 'b0'), loc('ch1', 'b99'), order)).toBeGreaterThan(0)
    expect(compareLocators(loc('ch1', 'b3', 'b3.2'), loc('ch1', 'b3', 'b3.10'), order)).toBeLessThan(0)
  })
  it('treats a block-only locator as the start of the block', () => {
    expect(compareLocators(loc('ch1', 'b3'), loc('ch1', 'b3', 'b3.0'), order)).toBeLessThan(0)
  })
  it('accepts a Map or an object for section order', () => {
    const m = new Map(order.map((id, i) => [id, i]))
    expect(compareLocators(loc('ch2', 'b0'), loc('ch1', 'b0'), m)).toBeGreaterThan(0)
    expect(compareLocators(loc('ch2', 'b0'), loc('ch1', 'b0'), { ch1: 0, ch2: 1 })).toBeGreaterThan(0)
  })
})

describe('spoiler gate', () => {
  it('shows nothing until the reader is past the end of the source window', () => {
    expect(isEligible(images[0], loc('ch1', 'b3', 'b3.1'), order)).toBe(false)   // still being read
    expect(isEligible(images[0], loc('ch1', 'b3', 'b3.2'), order)).toBe(true)
    expect(isEligible(images[0], loc('ch1', 'b3'), order)).toBe(false)          // Reader at top of that paragraph
    expect(isEligible(images[0], loc('ch1', 'b4'), order)).toBe(true)
  })
  it('lists eligible images in story order and never includes later ones', () => {
    expect(eligibleImages(images, loc('ch2', 'b0'), order).map(i => i.id)).toEqual(['a', 'b'])
    expect(eligibleImages([...images].reverse(), loc('ch2', 'b5'), order).map(i => i.id)).toEqual(['a', 'b', 'c'])
  })
  it('decode-ahead candidates are exactly the next ineligible images', () => {
    expect(upcomingImages(images, loc('ch1', 'b5'), order, 2).map(i => i.id)).toEqual(['b', 'c'])
  })
})

describe('chooseImage', () => {
  const base = { images, sectionOrder: order, minOnScreenMs: MIN }
  it('starts with no image before anything is eligible', () => {
    expect(chooseImage({ ...base, position: loc('ch1', 'b0'), currentId: null, now: 0 })).toEqual({ id: null, changed: false, wakeAt: null })
  })
  it('puts the first eligible image up immediately', () => {
    const r = chooseImage({ ...base, position: loc('ch1', 'b4'), currentId: null, now: 0 })
    expect(r).toMatchObject({ id: 'a', changed: true })
  })
  it('waits out the minimum time on screen, then changes on story position', () => {
    const p = loc('ch1', 'b13')
    expect(chooseImage({ ...base, position: p, currentId: 'a', shownAt: 0, now: 10_000 })).toEqual({ id: 'a', changed: false, wakeAt: MIN })
    expect(chooseImage({ ...base, position: p, currentId: 'a', shownAt: 0, now: MIN })).toMatchObject({ id: 'b', changed: true })
  })
  it('keeps an image for as long as the context holds (no maximum)', () => {
    const r = chooseImage({ ...base, position: loc('ch1', 'b11'), currentId: 'a', shownAt: 0, now: 3_600_000 })
    expect(r).toEqual({ id: 'a', changed: false, wakeAt: null })
  })
  it('skips straight to the newest eligible image after fast listening', () => {
    const r = chooseImage({ ...base, position: loc('ch2', 'b9'), currentId: 'a', shownAt: 0, now: MIN })
    expect(r.id).toBe('c')
  })
  it('replaces an image at once when the reader goes back before it', () => {
    const r = chooseImage({ ...base, position: loc('ch1', 'b5'), currentId: 'c', shownAt: 1_000, now: 2_000 })
    expect(r).toMatchObject({ id: 'a', changed: true })
    const none = chooseImage({ ...base, position: loc('ch1', 'b1'), currentId: 'c', shownAt: 1_000, now: 2_000 })
    expect(none).toMatchObject({ id: null, changed: true })
  })
  it('never returns an image that is not eligible, over a sweep of positions and times', () => {
    const positions = []
    for (const s of order) for (let b = 0; b < 15; b++) for (let g = -1; g < 4; g++) positions.push(loc(s, `b${b}`, g < 0 ? undefined : `b${b}.${g}`))
    let currentId = null, shownAt = 0
    positions.forEach((p, i) => {
      const now = i * 7_000
      const r = chooseImage({ ...base, position: p, currentId, shownAt, now })
      if (r.id) expect(isEligible(images.find(x => x.id === r.id), p, order)).toBe(true)
      if (r.changed) { currentId = r.id; shownAt = now }
    })
    // and backwards
    positions.reverse().forEach((p, i) => {
      const r = chooseImage({ ...base, position: p, currentId, shownAt, now: 1e7 + i })
      if (r.id) expect(isEligible(images.find(x => x.id === r.id), p, order)).toBe(true)
      if (r.changed) { currentId = r.id; shownAt = 1e7 + i }
    })
  })
})

describe('unknown sections never pass the gate', () => {
  it('an image in a section the book does not know is never eligible', () => {
    const order = ['ch1', 'ch2']
    const ghost = { id: 'g', visibleAfter: { sectionId: 'appendix', blockId: 'b1', segmentId: 'b1.0' } }
    expect(isEligible(ghost, { sectionId: 'ch2', blockId: 'b9', segmentId: 'b9.0' }, order)).toBe(false)
    const real = { id: 'r', visibleAfter: { sectionId: 'ch1', blockId: 'b1', segmentId: 'b1.0' } }
    expect(isEligible(real, { sectionId: 'nowhere', blockId: 'b9' }, order)).toBe(false)
    expect(isEligible(real, { sectionId: 'ch2', blockId: 'b0' }, order)).toBe(true)
  })
})
