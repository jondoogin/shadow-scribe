import { describe, it, expect } from 'vitest'
import { buildTranscript, segmentState, followScrollTarget, splitWords, wordAt } from './transcript.js'
import { MediaClock } from './clock.js'
import { segmentBlocks } from './segmenter.js'

describe('buildTranscript', () => {
  const blocks = [
    { id: 'b0', type: 'heading', text: 'Chapter I' },
    { id: 'b1', type: 'paragraph', text: 'It is a truth. Universally acknowledged! [1]' },
    { id: 'b2', type: 'break' },
    { id: 'b3', type: 'paragraph', text: 'Unnarrated text.' },
  ]

  it('splits blocks into segment pieces that rebuild the exact text', () => {
    const segs = [
      { blockId: 'b0', start: 0, end: 9 },
      { blockId: 'b1', start: 0, end: 14 },
      { blockId: 'b1', start: 15, end: 40 },
    ]
    const t = buildTranscript(blocks, segs)
    expect(t.map(b => b.type)).toEqual(['heading', 'paragraph', 'break', 'paragraph'])
    expect(t[0].pieces).toEqual([{ text: 'Chapter I', start: 0, seg: 0 }])
    expect(t[1].pieces).toEqual([
      { text: 'It is a truth.', start: 0, seg: 1 },
      { text: ' ', start: 14, seg: null },
      { text: 'Universally acknowledged!', start: 15, seg: 2 },
      { text: ' [1]', start: 40, seg: null },
    ])
    expect(t[1].pieces.map(p => p.text).join('')).toBe(blocks[1].text)
    expect(t[3].pieces).toEqual([{ text: 'Unnarrated text.', start: 0, seg: null }])
  })

  it('matches the segmenter used by the player for every block', () => {
    const real = [
      { id: 'b0', type: 'heading', text: 'CHAPTER II' },
      { id: 'b1', type: 'paragraph', text: '“Oh!” cried she. Mr. Bennet was among the earliest. He had always intended to visit him.' },
    ]
    const segs = segmentBlocks(real)
    const t = buildTranscript(real, segs)
    for (let i = 0; i < real.length; i++) expect(t[i].pieces.map(p => p.text).join('')).toBe(real[i].text)
    const indices = t.flatMap(b => b.pieces.filter(p => p.seg != null).map(p => p.seg))
    expect(indices).toEqual(segs.map((_, i) => i))
  })

  it('tolerates segments without offsets and out-of-range offsets', () => {
    const t = buildTranscript([{ id: 'b0', text: 'Short.' }], [{ blockId: 'b0' }, { blockId: 'b0', start: 0, end: 99 }])
    expect(t[0].pieces).toEqual([{ text: 'Short.', start: 0, seg: 1 }])
  })
})

describe('segmentState', () => {
  it('marks spoken, current and ahead', () => {
    expect([0, 1, 2, 3].map(k => segmentState(k, 1))).toEqual(['spoken', 'current', 'ahead', 'ahead'])
  })
  it('before the first sentence everything is ahead', () => {
    expect(segmentState(0, -1)).toBe('ahead')
  })
  it('reveal-as-spoken veils everything after the next sentence', () => {
    expect([1, 2, 3, 4].map(k => segmentState(k, 1, { reveal: true }))).toEqual(['current', 'ahead', 'veiled', 'veiled'])
  })
  it('strict mode veils an unreached heading until it is spoken', () => {
    expect(segmentState(0, -1, { veilHeading: true, isHeading: true })).toBe('veiled')
    expect(segmentState(0, 0, { veilHeading: true, isHeading: true })).toBe('current')
    expect(segmentState(3, 0, { veilHeading: true, isHeading: false })).toBe('ahead')
  })
})

describe('followScrollTarget', () => {
  const view = { scrollTop: 1000, height: 400, scrollHeight: 5000 }
  it('stays put while the sentence is in the comfortable band (25%–55%)', () => {
    expect(followScrollTarget({ top: 1120, bottom: 1200 }, view)).toBeNull()
  })
  it('brings a sentence below the band up to 38%', () => {
    expect(followScrollTarget({ top: 1300, bottom: 1360 }, view)).toBe(1300 - 152)
  })
  it('brings a sentence above the band down to 38%', () => {
    expect(followScrollTarget({ top: 1020, bottom: 1060 }, view)).toBe(1020 - 152)
  })
  it('accepts a sentence taller than the band if it starts inside it', () => {
    expect(followScrollTarget({ top: 1110, bottom: 1500 }, view)).toBeNull()
  })
  it('clamps to the scrollable range', () => {
    expect(followScrollTarget({ top: 40, bottom: 80 }, { scrollTop: 300, height: 400, scrollHeight: 2000 })).toBe(0)
    expect(followScrollTarget({ top: 1950, bottom: 1990 }, { scrollTop: 1000, height: 400, scrollHeight: 2000 })).toBe(1600)
  })
})

describe('MediaClock', () => {
  it('extrapolates while running and holds while paused', () => {
    let now = 0
    const c = new MediaClock(() => now)
    c.sync(10, { rate: 1, running: true })
    now = 250
    expect(c.read()).toBeCloseTo(10.25)
    c.sync(10.25, { running: false })
    now = 2000
    expect(c.read()).toBeCloseTo(10.25)
  })
  it('follows playback speed', () => {
    let now = 0
    const c = new MediaClock(() => now)
    c.sync(0, { rate: 1.5, running: true })
    now = 1000
    expect(c.read()).toBeCloseTo(1.5)
  })
  it('keeps the smooth value for small differences and snaps on large ones (seek)', () => {
    let now = 0
    const c = new MediaClock(() => now)
    c.sync(5, { rate: 1, running: true })
    now = 100
    expect(c.read(5.13)).toBeCloseTo(5.1)
    expect(c.read(42)).toBe(42)
    now = 200
    expect(c.read()).toBeCloseTo(42.1)
  })
})

describe('word runs', () => {
  const text = '“Oh!” cried she.'
  it('splits a sentence into timed words and untimed gaps that rebuild the text', () => {
    // block offsets: the piece starts at 20 in its block
    const runs = splitWords(text, 20, [[20, 25, 1000, 1300], [26, 31, 1300, 1600], [32, 36, 1600, 1900]])
    expect(runs.map(r => r.text).join('')).toBe(text)
    expect(runs.filter(r => r.w != null).map(r => r.text)).toEqual(['“Oh!”', 'cried', 'she.'])
    expect(runs[1]).toEqual({ text: ' ' })
  })
  it('ignores timings outside the piece and survives none', () => {
    expect(splitWords(text, 0, [[90, 95, 1, 2]])).toEqual([{ text }])
    expect(splitWords(text, 0, null)).toEqual([{ text }])
  })
  it('finds the word being spoken', () => {
    const t0s = [1000, 1300, 1600]
    expect(wordAt(t0s, 999)).toBe(-1)
    expect(wordAt(t0s, 1000)).toBe(0)
    expect(wordAt(t0s, 1450)).toBe(1)
    expect(wordAt(t0s, 9000)).toBe(2)
  })
})
