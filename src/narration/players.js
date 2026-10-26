// ── Narration players ────────────────────────────────────────────────────────
// Two deliberately separate implementations behind one small surface:
//
//   GeneratedAudioPlayer  — plays pre-generated chapter audio (neural, from the
//                           Mac narrator). Real time positions, true seeking,
//                           mixes with ambience, survives screen lock where the
//                           platform allows media playback.
//   SpeechNarrationPlayer — the browser's own speech (Web Speech API) as a
//                           fallback. Position is a sentence index, not a time:
//                           SpeechSynthesis exposes no timeline, no PCM, and
//                           cannot be routed through Web Audio.
//
// Common state: { kind, status, sectionIndex, sectionId, segmentIndex, segmentId,
//                 blockId, time, duration, rate, error }
// status: idle | loading | ready | playing | paused | ended | error

const IDLE = Object.freeze({
  status: 'idle', sectionIndex: 0, sectionId: null, segmentIndex: -1, segmentId: null, blockId: null,
  time: 0, duration: 0, rate: 1, error: null,
})

class Emitter {
  constructor() { this.listeners = new Set() }
  subscribe(fn) { this.listeners.add(fn); fn(this.state); return () => this.listeners.delete(fn) }
  set(patch) {
    this.state = { ...this.state, ...patch }
    for (const fn of this.listeners) fn(this.state)
  }
}

/** Index of the segment playing at `time` (last segment whose t0 <= time). */
export function segmentAt(segments, time) {
  let lo = 0, hi = segments.length - 1, ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (segments[mid].t0 <= time + 1e-3) { ans = mid; lo = mid + 1 } else hi = mid - 1
  }
  return ans
}

export class GeneratedAudioPlayer extends Emitter {
  /**
   * @param {object} o
   * @param {Array} o.sections   manifest sections (ordered) with segments [{id, blockId, t0, t1}]
   * @param {(section) => Promise<Blob>} o.getBlob
   * @param {() => HTMLAudioElement} [o.createAudio]
   * @param {{createObjectURL, revokeObjectURL}} [o.urls]
   */
  constructor({ sections, getBlob, createAudio = () => new Audio(), urls = URL }) {
    super()
    this.kind = 'audio'
    this.sections = sections
    this.getBlob = getBlob
    this.urls = urls
    this.audio = createAudio()
    this.audio.preload = 'auto'
    if ('preservesPitch' in this.audio) this.audio.preservesPitch = true
    this.url = null
    this.token = 0
    this.pauseAtBoundary = false
    this.state = { ...IDLE, kind: 'audio' }
    this._wire()
  }

  _wire() {
    const a = this.audio
    this._handlers = {
      timeupdate: () => this._onTime(),
      play: () => this.set({ status: 'playing', error: null }),
      pause: () => { if (this.state.status === 'playing') this.set({ status: 'paused' }) },
      ended: () => this._onEnded(),
      loadedmetadata: () => this.set({ duration: Number.isFinite(a.duration) ? a.duration : this.sections[this.state.sectionIndex]?.durationSec || 0 }),
      error: () => this.set({ status: 'error', error: 'This chapter’s audio could not be played. It may be damaged; re-import the narration.' }),
    }
    for (const [k, fn] of Object.entries(this._handlers)) a.addEventListener(k, fn)
  }

  _onTime() {
    const time = this.audio.currentTime || 0
    const segs = this.sections[this.state.sectionIndex]?.segments || []
    const i = segmentAt(segs, time)
    if (i !== this.state.segmentIndex) {
      if (this.pauseAtBoundary && this.state.segmentIndex >= 0 && i > this.state.segmentIndex) {
        this.pauseAtBoundary = false
        this.audio.pause()
        this.set({ status: 'paused' })
        this.onBoundaryPause?.()
      }
      const seg = segs[i]
      this.set({ time, segmentIndex: i, segmentId: seg?.id || null, blockId: seg?.blockId || null })
    } else {
      this.set({ time })
    }
  }

  async _onEnded() {
    const next = this.state.sectionIndex + 1
    this.onSectionEnded?.(this.state.sectionIndex)
    if (this.pauseAtBoundary) {
      this.pauseAtBoundary = false
      this.set({ status: 'paused' })
      this.onBoundaryPause?.()
      if (next < this.sections.length) await this.load(next, 0, { autoplay: false })
      return
    }
    if (next < this.sections.length) await this.load(next, 0, { autoplay: true })
    else this.set({ status: 'ended' })
  }

  async load(sectionIndex, time = 0, { autoplay = false } = {}) {
    const section = this.sections[sectionIndex]
    if (!section) throw new Error('No such chapter')
    const token = ++this.token
    this.set({ status: 'loading', sectionIndex, sectionId: section.id, segmentIndex: -1, segmentId: null, blockId: null, time, duration: section.durationSec || 0, error: null })
    let blob
    try {
      blob = await this.getBlob(section)
    } catch (err) {
      if (token === this.token) this.set({ status: 'error', error: err?.message || 'Audio unavailable' })
      return
    }
    if (token !== this.token) return // superseded by a newer load
    if (!blob) {
      this.set({ status: 'error', error: `Audio for “${section.title || section.id}” is missing on this device.` })
      return
    }
    if (this.url) this.urls.revokeObjectURL(this.url)
    this.url = this.urls.createObjectURL(blob)
    this.audio.src = this.url
    this.audio.playbackRate = this.state.rate
    await waitForMetadata(this.audio)
    if (token !== this.token) return
    try { this.audio.currentTime = Math.max(0, Math.min(time, (this.audio.duration || section.durationSec || time) - 0.05)) } catch { /* not seekable yet */ }
    this._onTime()
    this.set({ status: 'ready' })
    if (autoplay) await this.play()
  }

  async play() {
    if (this.state.status === 'idle' || (!this.audio.src && this.sections.length)) {
      await this.load(this.state.sectionIndex, this.state.time)
    }
    try {
      await this.audio.play()
      this.set({ status: 'playing', error: null })
    } catch (err) {
      const blocked = err?.name === 'NotAllowedError'
      this.set({ status: 'paused', error: blocked ? 'Tap play to start audio (the browser blocked autoplay).' : (err?.message || 'Playback failed') })
    }
  }

  pause() {
    this.pauseAtBoundary = false
    this.audio.pause()
    if (this.state.status !== 'idle') this.set({ status: 'paused' })
  }

  seek(time) {
    const dur = this.audio.duration || this.state.duration || 0
    const t = Math.max(0, dur ? Math.min(time, dur - 0.05) : time)
    this.audio.currentTime = t
    this._onTime()
  }

  async skip(seconds) {
    const t = (this.audio.currentTime || 0) + seconds
    const dur = this.audio.duration || this.state.duration
    if (t < 0 && this.state.sectionIndex > 0) {
      const prev = this.sections[this.state.sectionIndex - 1]
      return this.load(this.state.sectionIndex - 1, Math.max(0, (prev.durationSec || 0) + t), { autoplay: this.state.status === 'playing' })
    }
    if (dur && t >= dur && this.state.sectionIndex < this.sections.length - 1) {
      return this.load(this.state.sectionIndex + 1, 0, { autoplay: this.state.status === 'playing' })
    }
    this.seek(t)
  }

  async nextSection() {
    if (this.state.sectionIndex >= this.sections.length - 1) return
    await this.load(this.state.sectionIndex + 1, 0, { autoplay: this.state.status === 'playing' })
  }

  async prevSection() {
    const restart = (this.audio.currentTime || 0) > 4 || this.state.sectionIndex === 0
    await this.load(restart ? this.state.sectionIndex : this.state.sectionIndex - 1, 0, { autoplay: this.state.status === 'playing' })
  }

  async goTo(sectionIndex, segmentIndex = 0, { autoplay } = {}) {
    const segs = this.sections[sectionIndex]?.segments || []
    const t = segs[segmentIndex]?.t0 ?? 0
    const play = autoplay ?? this.state.status === 'playing'
    if (sectionIndex === this.state.sectionIndex && this.audio.src && this.state.status !== 'loading') {
      this.seek(t)
      if (play && this.state.status !== 'playing') await this.play()
      return
    }
    await this.load(sectionIndex, t, { autoplay: play })
  }

  setRate(rate) {
    this.audio.playbackRate = rate
    this.set({ rate })
  }

  setVolume(v) { this.audio.volume = Math.max(0, Math.min(1, v)) }

  stopAtNextBoundary() { this.pauseAtBoundary = true }

  dispose() {
    this.token++
    this.audio.pause()
    for (const [k, fn] of Object.entries(this._handlers)) this.audio.removeEventListener(k, fn)
    this.audio.removeAttribute?.('src')
    if (this.url) this.urls.revokeObjectURL(this.url)
    this.url = null
    this.listeners.clear()
  }
}

function waitForMetadata(audio) {
  if (audio.readyState >= 1) return Promise.resolve()
  return new Promise(resolve => {
    const done = () => { audio.removeEventListener('loadedmetadata', done); audio.removeEventListener('error', done); resolve() }
    audio.addEventListener('loadedmetadata', done)
    audio.addEventListener('error', done)
    setTimeout(done, 8000)
  })
}

// ── Browser speech fallback ─────────────────────────────────────────────────

export function listSpeechVoices(synth = globalThis.speechSynthesis, timeoutMs = 1500) {
  if (!synth) return Promise.resolve([])
  const now = synth.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise(resolve => {
    const done = () => { synth.removeEventListener?.('voiceschanged', done); resolve(synth.getVoices()) }
    synth.addEventListener?.('voiceschanged', done)
    setTimeout(done, timeoutMs)
  })
}

export class SpeechNarrationPlayer extends Emitter {
  /**
   * @param {object} o
   * @param {Array<{id, title}>} o.sections
   * @param {(sectionIndex) => Promise<Array>} o.loadSegments  segments from segmentBlocks()
   * @param {SpeechSynthesis} [o.synth]
   * @param {typeof SpeechSynthesisUtterance} [o.Utterance]
   */
  constructor({ sections, loadSegments, synth = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance, voice = null }) {
    super()
    this.kind = 'speech'
    this.sections = sections
    this.loadSegments = loadSegments
    this.synth = synth
    this.Utterance = Utterance
    this.voice = voice
    this.segments = []
    this.session = 0
    this.pauseAtBoundary = false
    this.state = { ...IDLE, kind: 'speech', duration: 0 }
  }

  get supported() { return !!(this.synth && this.Utterance) }

  async load(sectionIndex, segmentIndex = 0, { autoplay = false } = {}) {
    const section = this.sections[sectionIndex]
    if (!section) throw new Error('No such chapter')
    const session = ++this.session
    this.synth?.cancel()
    this.set({ status: 'loading', sectionIndex, sectionId: section.id, error: null })
    const segs = await this.loadSegments(sectionIndex)
    if (session !== this.session) return
    this.segments = segs || []
    const i = Math.max(0, Math.min(segmentIndex, this.segments.length - 1))
    const seg = this.segments[i]
    this.set({ status: 'ready', segmentIndex: i, segmentId: seg?.id || null, blockId: seg?.blockId || null, time: i, duration: this.segments.length })
    if (autoplay) this.play()
  }

  play() {
    if (!this.supported) {
      this.set({ status: 'error', error: 'This browser has no built-in speech.' })
      return
    }
    if (this.state.status === 'idle') {
      this.load(this.state.sectionIndex, Math.max(0, this.state.segmentIndex), { autoplay: true })
      return
    }
    this._speak(Math.max(0, this.state.segmentIndex))
  }

  _speak(i) {
    const session = ++this.session
    this.synth.cancel()
    const seg = this.segments[i]
    if (!seg) return this._sectionEnd(session)
    const u = new this.Utterance(seg.spoken || seg.text)
    if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang }
    u.rate = this.state.rate
    u.onend = () => {
      if (session !== this.session) return // stale callback from a cancelled utterance
      if (this.pauseAtBoundary) {
        this.pauseAtBoundary = false
        this.set({ status: 'paused', segmentIndex: Math.min(i + 1, this.segments.length - 1) })
        this.onBoundaryPause?.()
        return
      }
      if (i + 1 < this.segments.length) this._speak(i + 1)
      else this._sectionEnd(session)
    }
    u.onerror = e => {
      if (session !== this.session) return
      if (e?.error === 'interrupted' || e?.error === 'canceled') return
      this.set({ status: 'error', error: `Speech failed (${e?.error || 'unknown'}).` })
    }
    this.set({ status: 'playing', segmentIndex: i, segmentId: seg.id, blockId: seg.blockId, time: i, error: null })
    this.synth.speak(u)
  }

  async _sectionEnd(session) {
    if (session !== this.session) return
    this.onSectionEnded?.(this.state.sectionIndex)
    const next = this.state.sectionIndex + 1
    if (next < this.sections.length && !this.pauseAtBoundary) await this.load(next, 0, { autoplay: true })
    else { this.pauseAtBoundary = false; this.set({ status: next < this.sections.length ? 'paused' : 'ended' }) }
  }

  // Pause is implemented as cancel + remember the sentence: speechSynthesis.pause()
  // is unreliable on several platforms. Resuming restarts the current sentence.
  pause() {
    this.session++
    this.pauseAtBoundary = false
    this.synth?.cancel()
    if (this.state.status !== 'idle') this.set({ status: 'paused' })
  }

  seek(segmentIndex) {
    const i = Math.max(0, Math.min(Math.round(segmentIndex), this.segments.length - 1))
    if (this.state.status === 'playing') this._speak(i)
    else {
      const seg = this.segments[i]
      this.set({ segmentIndex: i, segmentId: seg?.id, blockId: seg?.blockId, time: i })
    }
  }

  skip(sentences) { this.seek(this.state.segmentIndex + sentences) }

  async nextSection() {
    if (this.state.sectionIndex < this.sections.length - 1) await this.load(this.state.sectionIndex + 1, 0, { autoplay: this.state.status === 'playing' })
  }

  async prevSection() {
    const restart = this.state.segmentIndex > 1 || this.state.sectionIndex === 0
    await this.load(restart ? this.state.sectionIndex : this.state.sectionIndex - 1, 0, { autoplay: this.state.status === 'playing' })
  }

  async goTo(sectionIndex, segmentIndex = 0, { autoplay } = {}) {
    const play = autoplay ?? this.state.status === 'playing'
    if (sectionIndex === this.state.sectionIndex && this.segments.length) {
      if (play) this._speak(segmentIndex)
      else this.seek(segmentIndex)
      return
    }
    await this.load(sectionIndex, segmentIndex, { autoplay: play })
  }

  setRate(rate) {
    this.set({ rate })
    // Takes effect from the next sentence; restarting mid-sentence would repeat words.
  }

  setVoice(voice) { this.voice = voice }

  setVolume() { /* speech volume follows the device; not controllable reliably */ }

  stopAtNextBoundary() { this.pauseAtBoundary = true }

  dispose() {
    this.session++
    this.synth?.cancel()
    this.listeners.clear()
  }
}
