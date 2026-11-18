import { describe, it, expect } from 'vitest'
import { driftTransform, seeded, VISUAL_MOTION } from './motion.js'

describe('driftTransform', () => {
  const cases = []
  for (const canvasAspect of [0.46, 0.75, 1.6, 2.4]) for (const fx of [0, 0.5, 1]) for (const t of [0, 30_000, 120_000, 240_000, 400_000]) cases.push({ canvasAspect, fx, t })

  it('keeps the visible window inside the image for any aspect, focus and time', () => {
    for (const { canvasAspect, fx, t } of cases) {
      const m = driftTransform({ canvasAspect, imageAspect: 1.6, focus: { x: fx, y: 1 - fx }, elapsedMs: t, id: 'img-3', drift: true })
      expect(m.ox).toBeGreaterThanOrEqual(0)
      expect(m.oy).toBeGreaterThanOrEqual(0)
      expect(m.ox + m.sx).toBeLessThanOrEqual(1 + 1e-9)
      expect(m.oy + m.sy).toBeLessThanOrEqual(1 + 1e-9)
    }
  })

  it('stays between the drift limits and moves smoothly', () => {
    let prev = null
    for (let t = 0; t <= 600_000; t += 1_000) {
      const { z } = driftTransform({ canvasAspect: 1.6, imageAspect: 1.6, elapsedMs: t, id: 'a', drift: true })
      expect(z).toBeGreaterThanOrEqual(VISUAL_MOTION.driftFrom - 1e-9)
      expect(z).toBeLessThanOrEqual(VISUAL_MOTION.driftTo + 1e-9)
      if (prev !== null) expect(Math.abs(z - prev)).toBeLessThan(0.0006)   // no jumps, including at the turn
      prev = z
    }
  })

  it('holds still when drift is off', () => {
    const a = driftTransform({ canvasAspect: 1.6, imageAspect: 1.6, elapsedMs: 0, id: 'a', drift: false })
    const b = driftTransform({ canvasAspect: 1.6, imageAspect: 1.6, elapsedMs: 200_000, id: 'a', drift: false })
    expect(a).toEqual(b)
  })

  it('is deterministic per image id', () => {
    expect(seeded('img-7')).toBe(seeded('img-7'))
    expect(seeded('img-7')).not.toBe(seeded('img-8'))
  })
})
