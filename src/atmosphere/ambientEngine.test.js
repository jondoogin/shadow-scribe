import { describe, it, expect, vi } from 'vitest'
import { AmbientEngine, AMBIENT_CATALOG, synthesize, DUCK_LEVEL } from './ambientEngine.js'

// Minimal Web Audio mock that records graph activity.
function mockAudioContext() {
  const created = { sources: [], gains: [] }
  class Param {
    constructor(v) { this.value = v; this.ramps = [] }
    cancelScheduledValues() {}
    setValueAtTime(v) { this.value = v }
    linearRampToValueAtTime(v, t) { this.ramps.push([v, t]); this.value = v }
  }
  class Ctx {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {} }
    createGain() { const g = { gain: new Param(1), connect: vi.fn(), disconnect: vi.fn() }; created.gains.push(g); return g }
    createBufferSource() { const s = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), loop: false }; created.sources.push(s); return s }
    createBuffer(ch, len, sr) { const data = new Float32Array(len); return { length: len, sampleRate: sr, getChannelData: () => data } }
    resume() { this.state = 'running'; return Promise.resolve() }
    close() {}
  }
  return { Ctx, created }
}

describe('procedural ambience', () => {
  it('produces bounded, seamless loops for every catalog sound', () => {
    for (const t of AMBIENT_CATALOG) {
      const x = synthesize(t.id, 8000, 4)
      expect(x.length).toBeGreaterThan(8000 * 3)
      let peak = 0
      for (const v of x) { expect(Number.isFinite(v)).toBe(true); peak = Math.max(peak, Math.abs(v)) }
      expect(peak).toBeLessThanOrEqual(0.61)
      // Seam: the jump from last sample to first is no bigger than typical sample-to-sample steps.
      let maxStep = 0
      for (let i = 1; i < x.length; i++) maxStep = Math.max(maxStep, Math.abs(x[i] - x[i - 1]))
      expect(Math.abs(x[0] - x[x.length - 1])).toBeLessThanOrEqual(maxStep + 1e-6)
    }
  })

  it('is deterministic', () => {
    expect(synthesize('rain', 8000, 2)).toEqual(synthesize('rain', 8000, 2))
  })
})

describe('AmbientEngine', () => {
  it('plays one looping track, never duplicating it, and crossfades on change', async () => {
    vi.useFakeTimers()
    const { Ctx, created } = mockAudioContext()
    const eng = new AmbientEngine({ AudioContextCtor: Ctx })
    await eng.play('rain')
    await eng.play('rain')
    expect(created.sources.length).toBe(1)
    expect(created.sources[0].loop).toBe(true)
    await eng.play('fire')
    expect(created.sources.length).toBe(2)
    vi.advanceTimersByTime(1000)
    expect(created.sources[0].stop).toHaveBeenCalled()
    expect(created.sources[1].stop).not.toHaveBeenCalled()
    expect(eng.snapshot().trackId).toBe('fire')
    vi.useRealTimers()
  })

  it('ducks under narration, restores, and respects the duck setting', async () => {
    const { Ctx } = mockAudioContext()
    const eng = new AmbientEngine({ AudioContextCtor: Ctx })
    await eng.play('ocean')
    eng.setDucked(true)
    expect(eng.duck.gain.value).toBe(DUCK_LEVEL)
    eng.setDucked(false)
    expect(eng.duck.gain.value).toBe(1)
    eng.setDuckEnabled(false)
    eng.setDucked(true)
    expect(eng.duck.gain.value).toBe(1)
  })

  it('has independent volume and a sleep fade that stops the loop', async () => {
    vi.useFakeTimers()
    const { Ctx, created } = mockAudioContext()
    const eng = new AmbientEngine({ AudioContextCtor: Ctx })
    await eng.play('brown')
    eng.setVolume(0.2)
    expect(eng.master.gain.value).toBeCloseTo(0.2)
    eng.fadeOut(6000)
    expect(eng.snapshot().playing).toBe(false)
    vi.advanceTimersByTime(6100)
    expect(created.sources[0].stop).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('reports unsupported browsers', async () => {
    const eng = new AmbientEngine({ AudioContextCtor: undefined })
    expect(eng.supported).toBe(false)
    await expect(eng.play('rain')).rejects.toThrow(/Web Audio/)
  })
})
