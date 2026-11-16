import { describe, it, expect } from 'vitest'
import { buildSampleJourney } from './sampleJourney.js'
import { isEligible } from './eligibility.js'

describe('sample journey', () => {
  const j = buildSampleJourney()
  it('has five scenes, each with a painting and its stroke map', () => {
    expect(j.scenes).toHaveLength(5)
    expect(j.images.map(i => i.id)).toEqual(j.scenes.map(s => s.id))
    j.images.forEach(i => expect(i.strokes).toMatch(/\.strokes\.webp$/))
  })
  it('unlocks each painting only after the scene\'s second paragraph has been read', () => {
    j.images.forEach((img, si) => {
      const start = Number(j.scenes[si].startBlock.slice(1))
      const segs = j.segments
      const lastOfWindow = segs.filter(s => s.blockId === `b${start + 1}`).pop()
      const firstAfter = segs[segs.indexOf(lastOfWindow) + 1]
      expect(img.visibleAfter.segmentId).toBe(lastOfWindow.id)
      for (const s of segs.slice(0, segs.indexOf(lastOfWindow) + 1)) {
        expect(isEligible(img, { sectionId: 'sample', blockId: s.blockId, segmentId: s.id }, j.sectionOrder)).toBe(false)
      }
      if (firstAfter) expect(isEligible(img, { sectionId: 'sample', blockId: firstAfter.blockId, segmentId: firstAfter.id }, j.sectionOrder)).toBe(true)
    })
  })
})
