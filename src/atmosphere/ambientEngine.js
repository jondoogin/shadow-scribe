// ── Ambient audio engine ─────────────────────────────────────────────────────
// One ambience loop at a time, owned app-wide (PlaybackContext), independent of
// narration. Sounds are synthesised procedurally into seamless loop buffers, so
// no third-party recordings (and no licensing questions) ship with Lantern.
// File-based loops (e.g. a licensed piano or forest recording) can be added to
// the catalog with a `src` and are played through the same gain chain.
//
// Graph: source(loop) → trackGain (fades/crossfades) → duckGain → master → out
//
// Narration is NOT routed through this graph. Generated narration plays in an
// <audio> element (keeps iOS lock-screen playback working) and browser speech
// cannot be routed at all, so ducking is event-driven: it follows the
// narration's play/pause state, not its waveform.

export const AMBIENT_CATALOG = [
  { id: 'rain',      label: 'Rain',          kind: 'procedural' },
  { id: 'fire',      label: 'Fireplace',     kind: 'procedural' },
  { id: 'ocean',     label: 'Ocean',         kind: 'procedural' },
  { id: 'wind',      label: 'Night wind',    kind: 'procedural' },
  { id: 'brown',     label: 'Brown noise',   kind: 'procedural' },
  { id: 'white',     label: 'White noise',   kind: 'procedural' },
]

export const FADE_MS = 600
export const DUCK_LEVEL = 0.45

// ── Procedural generators (pure; testable without Web Audio) ────────────────

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function white(n, r) { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = r() * 2 - 1; return a }

function brownFrom(w) {
  const a = new Float32Array(w.length)
  let last = 0
  for (let i = 0; i < w.length; i++) { last = (last + 0.02 * w[i]) / 1.02; a[i] = last * 3.5 }
  return a
}

function pinkFrom(w) {
  const a = new Float32Array(w.length)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < w.length; i++) {
    const x = w[i]
    b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759
    b2 = 0.96900 * b2 + x * 0.1538520; b3 = 0.86650 * b3 + x * 0.3104856
    b4 = 0.55000 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.0168980
    a[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11
    b6 = x * 0.115926
  }
  return a
}

function onePoleLow(x, sr, hz) {
  const k = 1 - Math.exp(-2 * Math.PI * hz / sr)
  const y = new Float32Array(x.length)
  let v = 0
  for (let i = 0; i < x.length; i++) { v += k * (x[i] - v); y[i] = v }
  return y
}

function onePoleHigh(x, sr, hz) {
  const lp = onePoleLow(x, sr, hz)
  return x.map((v, i) => v - lp[i])
}

/** Blend the tail into the head so the buffer loops without a seam. */
export function makeSeamless(x, sr, ms = 400) {
  const n = Math.min(Math.floor(sr * ms / 1000), Math.floor(x.length / 4))
  const out = x.slice(0, x.length - n)
  for (let i = 0; i < n; i++) {
    const t = i / n
    out[i] = x[i] * Math.sqrt(t) + x[x.length - n + i] * Math.sqrt(1 - t)
  }
  return out
}

function normalizePeak(x, peak = 0.6) {
  let m = 0
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]))
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m
  return x
}

export function synthesize(id, sr = 22050, seconds = 12, seed = 7) {
  const n = Math.floor(sr * seconds)
  const r = rng(seed)
  let x
  switch (id) {
    case 'white':
      x = white(n, r).map(v => v * 0.35)
      break
    case 'brown':
      x = brownFrom(white(n, r))
      break
    case 'rain': {
      const bed = onePoleHigh(pinkFrom(white(n, r)), sr, 400)
      x = new Float32Array(n)
      for (let i = 0; i < n; i++) x[i] = bed[i] * 0.8
      // Droplets: short bright decaying ticks at random times.
      const drops = Math.floor(seconds * 70)
      for (let d = 0; d < drops; d++) {
        const at = Math.floor(r() * n), amp = 0.05 + r() * 0.25, len = Math.floor(sr * (0.004 + r() * 0.01))
        for (let j = 0; j < len && at + j < n; j++) x[at + j] += (r() * 2 - 1) * amp * Math.exp(-6 * j / len)
      }
      break
    }
    case 'fire': {
      const rumble = onePoleLow(brownFrom(white(n, r)), sr, 300)
      x = new Float32Array(n)
      for (let i = 0; i < n; i++) x[i] = rumble[i] * 0.9
      const crackles = Math.floor(seconds * 9)
      for (let c = 0; c < crackles; c++) {
        const at = Math.floor(r() * n), amp = 0.15 + r() * 0.6, len = Math.floor(sr * (0.002 + r() * 0.012))
        for (let j = 0; j < len && at + j < n; j++) x[at + j] += (r() * 2 - 1) * amp * Math.exp(-5 * j / len)
        if (r() < 0.35) { // occasional pops in quick succession
          const at2 = at + Math.floor(sr * (0.02 + r() * 0.06))
          for (let j = 0; j < len && at2 + j < n; j++) x[at2 + j] += (r() * 2 - 1) * amp * 0.6 * Math.exp(-5 * j / len)
        }
      }
      break
    }
    case 'ocean': {
      const base = onePoleLow(pinkFrom(white(n, r)), sr, 1200)
      const waves = 2 // whole number of swells per loop keeps the loop seamless
      x = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const phase = (i / n) * waves * 2 * Math.PI
        const swell = Math.pow(0.5 - 0.5 * Math.cos(phase), 1.6)
        x[i] = base[i] * (0.15 + 0.85 * swell)
      }
      break
    }
    case 'wind': {
      const base = onePoleLow(onePoleHigh(pinkFrom(white(n, r)), sr, 150), sr, 700)
      x = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const lfo = 0.55 + 0.45 * Math.sin((i / n) * 2 * Math.PI * 3 + Math.sin((i / n) * 2 * Math.PI) * 1.5)
        x[i] = base[i] * lfo
      }
      break
    }
    default:
      throw new Error(`Unknown ambience: ${id}`)
  }
  return normalizePeak(makeSeamless(x, sr), id === 'white' ? 0.35 : 0.6)
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class AmbientEngine {
  constructor({ AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext, fetchImpl = globalThis.fetch } = {}) {
    this.AudioContextCtor = AudioContextCtor
    this.fetch = fetchImpl
    this.ctx = null
    this.buffers = new Map()
    this.current = null // { id, source, gain }
    this.volume = 0.5
    this.ducked = false
    this.duckEnabled = true
    this.listeners = new Set()
  }

  get supported() { return !!this.AudioContextCtor }

  subscribe(fn) { this.listeners.add(fn); fn(this.snapshot()); return () => this.listeners.delete(fn) }
  snapshot() { return { trackId: this.current?.id || null, playing: !!this.current, volume: this.volume, ducked: this.ducked } }
  _emit() { const s = this.snapshot(); for (const fn of this.listeners) fn(s) }

  _ensure() {
    if (this.ctx) return this.ctx
    if (!this.AudioContextCtor) throw new Error('Web Audio is not available in this browser.')
    // On iOS, ask for "playback" so ambience ignores the silent switch and mixes with narration.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback' } catch { /* not supported */ }
    this.ctx = new this.AudioContextCtor()
    this.master = this.ctx.createGain()
    this.duck = this.ctx.createGain()
    this.master.gain.value = this.volume
    this.duck.connect(this.master)
    this.master.connect(this.ctx.destination)
    return this.ctx
  }

  async _buffer(id) {
    if (this.buffers.has(id)) return this.buffers.get(id)
    const ctx = this._ensure()
    const entry = AMBIENT_CATALOG.find(t => t.id === id)
    let buf
    if (entry?.src) {
      const data = await (await this.fetch(entry.src)).arrayBuffer()
      buf = await ctx.decodeAudioData(data)
    } else {
      const sr = 22050
      const pcm = synthesize(id, sr)
      buf = ctx.createBuffer(1, pcm.length, sr)
      buf.getChannelData(0).set(pcm)
    }
    this.buffers.set(id, buf)
    return buf
  }

  _ramp(param, value, ms) {
    const now = this.ctx.currentTime
    param.cancelScheduledValues(now)
    param.setValueAtTime(param.value, now)
    param.linearRampToValueAtTime(value, now + ms / 1000)
  }

  /** Start (or crossfade to) a track. Must be called from a user gesture the first time (autoplay rules). */
  async play(id) {
    const ctx = this._ensure()
    if (ctx.state === 'suspended') await ctx.resume()
    if (this.current?.id === id) return
    const buf = await this._buffer(id)
    const source = ctx.createBufferSource()
    source.buffer = buf
    source.loop = true
    const gain = ctx.createGain()
    gain.gain.value = 0
    source.connect(gain)
    gain.connect(this.duck)
    source.start()
    this._ramp(gain.gain, 1, FADE_MS)
    const prev = this.current
    this.current = { id, source, gain }
    if (prev) this._retire(prev, FADE_MS)
    this._emit()
  }

  _retire(track, ms) {
    this._ramp(track.gain.gain, 0, ms)
    setTimeout(() => { try { track.source.stop(); track.source.disconnect(); track.gain.disconnect() } catch { /* already stopped */ } }, ms + 50)
  }

  stop(ms = FADE_MS) {
    if (!this.current) return
    this._retire(this.current, ms)
    this.current = null
    this._emit()
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.ctx) this._ramp(this.master.gain, this.volume, 120)
    this._emit()
  }

  setDuckEnabled(on) {
    this.duckEnabled = on
    if (!on) this.setDucked(false)
  }

  /** Follow narration: lower ambience while speech plays, restore during pauses. */
  setDucked(on) {
    const target = on && this.duckEnabled
    if (target === this.ducked) return
    this.ducked = target
    if (this.ctx) this._ramp(this.duck.gain, target ? DUCK_LEVEL : 1, target ? 400 : 900)
    this._emit()
  }

  /** Sleep-timer fade: ramp to silence, then stop. */
  fadeOut(ms = 6000) {
    this.stop(ms)
  }

  dispose() {
    this.stop(50)
    try { this.ctx?.close() } catch { /* ignore */ }
    this.ctx = null
    this.buffers.clear()
    this.listeners.clear()
  }
}
