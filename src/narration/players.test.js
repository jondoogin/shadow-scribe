import { describe, it, expect, vi } from 'vitest'
import { GeneratedAudioPlayer, SpeechNarrationPlayer, segmentAt } from './players.js'
import { createSleepTimer } from './sleepTimer.js'
import { latestLocator, findSegmentIndex, loadListenState, saveListenState, withBookRecord } from './listenState.js'
import { sectionLabel, chapterReached } from './sectionLabels.js'

// ── Fakes ──────────────────────────────────────────────────────────────────
class FakeAudio extends EventTarget {
  constructor() { super(); this.currentTime = 0; this.duration = NaN; this.paused = true; this.readyState = 0; this.playbackRate = 1; this.volume = 1; this._src = '' }
  get src() { return this._src }
  set src(v) {
    this._src = v; this.readyState = 0; this.currentTime = 0
    queueMicrotask(() => { this.duration = FakeAudio.durations[v] ?? 10; this.readyState = 1; this.dispatchEvent(new Event('loadedmetadata')) })
  }
  removeAttribute() { this._src = '' }
  async play() { if (FakeAudio.block) { const e = new Error('blocked'); e.name = 'NotAllowedError'; throw e } this.paused = false; this.dispatchEvent(new Event('play')) }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')) }
  tick(t) { this.currentTime = t; this.dispatchEvent(new Event('timeupdate')) }
  end() { this.paused = true; this.dispatchEvent(new Event('ended')) }
}
FakeAudio.durations = {}

const sections = [
  { id: 's1', title: 'One', durationSec: 10, segments: [{ id: 'b0.0', blockId: 'b0', t0: 0.3, t1: 2 }, { id: 'b1.0', blockId: 'b1', t0: 2.5, t1: 6 }, { id: 'b2.0', blockId: 'b2', t0: 6.5, t1: 9 }] },
  { id: 's2', title: 'Two', durationSec: 8, segments: [{ id: 'b0.0', blockId: 'b0', t0: 0.3, t1: 4 }] },
]

function makeAudioPlayer(getBlob = s => Promise.resolve(new Blob([s.id]))) {
  let n = 0
  const urls = { createObjectURL: () => `blob:${++n}`, revokeObjectURL: vi.fn() }
  const audio = new FakeAudio()
  const player = new GeneratedAudioPlayer({ sections, getBlob, createAudio: () => audio, urls })
  return { player, audio, urls }
}

describe('GeneratedAudioPlayer', () => {
  it('loads a chapter at a saved time and maps time to the right segment', async () => {
    const { player, audio } = makeAudioPlayer()
    await player.load(0, 3)
    expect(audio.currentTime).toBe(3)
    expect(player.state).toMatchObject({ status: 'ready', sectionId: 's1', segmentId: 'b1.0', blockId: 'b1' })
    audio.tick(7)
    expect(player.state.segmentId).toBe('b2.0')
    expect(segmentAt(sections[0].segments, 0.1)).toBe(-1)
  })

  it('plays, pauses and auto-advances to the next chapter at the end', async () => {
    const { player, audio, urls } = makeAudioPlayer()
    const ended = vi.fn()
    player.onSectionEnded = ended
    await player.load(0)
    await player.play()
    expect(player.state.status).toBe('playing')
    player.pause()
    expect(player.state.status).toBe('paused')
    await player.play()
    audio.end()
    await vi.waitFor(() => expect(player.state).toMatchObject({ sectionId: 's2', status: 'playing' }))
    expect(ended).toHaveBeenCalledWith(0)
    expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:1') // previous chapter URL released
  })

  it('ends cleanly after the last chapter', async () => {
    const { player, audio } = makeAudioPlayer()
    await player.load(1)
    await player.play()
    audio.end()
    await vi.waitFor(() => expect(player.state.status).toBe('ended'))
  })

  it('ignores a slow load that was superseded by a newer one (no wrong chapter)', async () => {
    let release
    const slow = new Promise(r => { release = r })
    const { player } = makeAudioPlayer(s => s.id === 's1' ? slow : Promise.resolve(new Blob(['2'])))
    const first = player.load(0)
    await player.load(1)
    release(new Blob(['1']))
    await first
    expect(player.state.sectionId).toBe('s2')
  })

  it('skips across chapter boundaries and clamps seeks', async () => {
    const { player, audio } = makeAudioPlayer()
    await player.load(1, 2)
    await player.skip(-5)
    expect(player.state.sectionId).toBe('s1')
    expect(audio.currentTime).toBeCloseTo(7, 5)
    player.seek(999)
    expect(audio.currentTime).toBeLessThan(10)
    await player.skip(15)
    expect(player.state.sectionId).toBe('s2')
  })

  it('previous restarts the chapter when well into it, else goes back', async () => {
    const { player, audio } = makeAudioPlayer()
    await player.load(1, 0)
    audio.tick(6)
    await player.prevSection()
    expect(player.state.sectionId).toBe('s2')
    await player.prevSection()
    expect(player.state.sectionId).toBe('s1')
  })

  it('goTo jumps to a segment start; setRate changes playback rate', async () => {
    const { player, audio } = makeAudioPlayer()
    await player.load(0)
    await player.goTo(0, 2)
    expect(audio.currentTime).toBe(6.5)
    player.setRate(1.5)
    expect(audio.playbackRate).toBe(1.5)
    expect(player.state.rate).toBe(1.5)
  })

  it('stops at the next sentence boundary for the sleep timer', async () => {
    const { player, audio } = makeAudioPlayer()
    const onPause = vi.fn()
    player.onBoundaryPause = onPause
    await player.load(0, 3)
    await player.play()
    player.stopAtNextBoundary()
    audio.tick(4)
    expect(player.state.status).toBe('playing')
    audio.tick(6.6)
    expect(player.state.status).toBe('paused')
    expect(onPause).toHaveBeenCalled()
  })

  it('reports missing audio and autoplay blocks instead of failing silently', async () => {
    const { player } = makeAudioPlayer(() => Promise.resolve(null))
    await player.load(0)
    expect(player.state.status).toBe('error')
    expect(player.state.error).toMatch(/missing/)
    const ok = makeAudioPlayer()
    await ok.player.load(0)
    FakeAudio.block = true
    await ok.player.play()
    FakeAudio.block = false
    expect(ok.player.state.error).toMatch(/Tap play/)
  })
})

// ── Speech fallback ────────────────────────────────────────────────────────
class FakeUtterance { constructor(text) { this.text = text } }
function fakeSynth() {
  const spoken = []
  return {
    spoken,
    current: null,
    speak(u) { spoken.push(u.text); this.current = u },
    cancel() { const u = this.current; this.current = null; u?.onerror?.({ error: 'interrupted' }) },
    finish() { const u = this.current; this.current = null; u?.onend?.() },
    getVoices: () => [],
  }
}
const speechSections = [{ id: 's1', title: 'One' }, { id: 's2', title: 'Two' }]
const segs = {
  0: [{ id: 'b0.0', blockId: 'b0', spoken: 'First.' }, { id: 'b1.0', blockId: 'b1', spoken: 'Second.' }],
  1: [{ id: 'b0.0', blockId: 'b0', spoken: 'Third.' }],
}

describe('SpeechNarrationPlayer', () => {
  const make = () => {
    const synth = fakeSynth()
    const player = new SpeechNarrationPlayer({ sections: speechSections, loadSegments: async i => segs[i], synth, Utterance: FakeUtterance })
    return { synth, player }
  }

  it('speaks segments in order across chapters', async () => {
    const { synth, player } = make()
    await player.load(0)
    player.play()
    synth.finish()
    synth.finish()
    await vi.waitFor(() => expect(synth.spoken).toEqual(['First.', 'Second.', 'Third.']))
    synth.finish()
    await vi.waitFor(() => expect(player.state.status).toBe('ended'))
  })

  it('ignores late callbacks from cancelled utterances (no double advance)', async () => {
    const { synth, player } = make()
    await player.load(0)
    player.play()
    const stale = synth.current
    player.seek(1) // while playing: cancel + speak segment 1
    stale.onend() // late onend from the cancelled first utterance
    expect(player.state.segmentIndex).toBe(1)
    expect(synth.spoken).toEqual(['First.', 'Second.'])
  })

  it('pause remembers the sentence and resume repeats it', async () => {
    const { synth, player } = make()
    await player.load(0, 1)
    player.play()
    player.pause()
    expect(player.state.status).toBe('paused')
    player.play()
    expect(synth.spoken).toEqual(['Second.', 'Second.'])
  })

  it('reports unsupported browsers', () => {
    const p = new SpeechNarrationPlayer({ sections: speechSections, loadSegments: async () => [], synth: null, Utterance: null })
    p.state = { ...p.state, status: 'ready' }
    p.play()
    expect(p.state.status).toBe('error')
  })
})

// ── Sleep timer ────────────────────────────────────────────────────────────
describe('sleep timer', () => {
  it('fires once at the absolute deadline, even after a suspended tab', () => {
    let now = 0
    const fire = vi.fn()
    const t = createSleepTimer({ now: () => now, onFire: fire })
    t.set('15')
    now = 14 * 60_000
    t.check()
    expect(fire).not.toHaveBeenCalled()
    now = 40 * 60_000 // tab was suspended past the deadline
    t.check()
    t.check()
    expect(fire).toHaveBeenCalledTimes(1)
    expect(t.state().mode).toBe('off')
  })

  it('end-of-chapter mode fires on the chapter boundary only', () => {
    const fire = vi.fn()
    const t = createSleepTimer({ onFire: fire })
    t.chapterEnded()
    expect(fire).not.toHaveBeenCalled()
    t.set('chapter')
    t.check()
    expect(fire).not.toHaveBeenCalled()
    t.chapterEnded()
    expect(fire).toHaveBeenCalledTimes(1)
  })
})

// ── Shared location + spoiler labels ───────────────────────────────────────
describe('listen state', () => {
  it('uses the most recent of Reader and Listen locations', () => {
    const read = { sectionId: 'a', blockId: 'b4', updatedAt: '2026-10-26T10:00:00Z' }
    const listen = { sectionId: 'b', blockId: 'b1', updatedAt: '2026-10-26T09:00:00Z' }
    expect(latestLocator({ read, listen })).toBe(read)
    expect(latestLocator({ listen })).toBe(listen)
    expect(latestLocator({})).toBeNull()
  })

  it('finds the segment for a block, or the next one after it', () => {
    const s = [{ blockId: 'b0' }, { blockId: 'b2' }, { blockId: 'b2' }, { blockId: 'b5' }]
    expect(findSegmentIndex(s, 'b2')).toBe(1)
    expect(findSegmentIndex(s, 'b3')).toBe(3)
    expect(findSegmentIndex(s, 'b9')).toBe(3)
    expect(findSegmentIndex(s, null)).toBe(0)
  })

  it('round-trips through storage and survives corrupt data', () => {
    const mem = new Map()
    const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }
    const st = withBookRecord(loadListenState(storage), 'book1', { listen: { sectionId: 's', blockId: 'b1' } })
    saveListenState(st, storage)
    expect(loadListenState(storage).books.book1.listen.blockId).toBe('b1')
    mem.set('lantern_listen', '{oops')
    expect(loadListenState(storage).prefs.rate).toBe(1)
  })

  it('hides unreached chapter titles in strict spoiler mode and never auto-advances progress', () => {
    const s = { title: 'The Proposal', chapterNums: [34] }
    expect(sectionLabel(s, 40, { spoilerMode: 'strict', currentChapter: 3 })).toBe('Section 41')
    expect(sectionLabel(s, 40, { spoilerMode: 'relaxed', currentChapter: 3 })).toBe('The Proposal')
    expect(sectionLabel(s, 40, { spoilerMode: 'strict', currentChapter: 34 })).toBe('The Proposal')
    expect(chapterReached(s, { currentChapter: 3 })).toBe(34)
    expect(chapterReached(s, { currentChapter: 40 })).toBeNull()
  })
})
