// WebGL painterly stage (docs/VISUAL_JOURNEY.md §7).
//
//  1. Ink bloom (Session 170): the incoming painting spreads out from its
//     focus like ink taking in damp paper, through a soft, uneven front
//     (low-frequency noise plus the stroke map, so washes lead and detail
//     follows). The outgoing painting lifts a little towards paper as it goes.
//     No dark edge, no visible stroke-by-stroke stepping.
//  2. Living paint: a slow drift and zoom plus a faint shimmer. Motion eases
//     to rest when narration pauses and eases back when it resumes.
//  3. Paper: a procedural grain over everything.
//
// No React here. VisualStage.jsx owns the DOM and the fallback.

import { VISUAL_MOTION, driftTransform, seeded } from './motion.js'

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uFrom, uTo, uStroke;
uniform vec4 uFromX, uToX;
uniform float uProgress, uTime, uShimmer, uGrain, uHasFrom, uFade, uSeed;
uniform vec2 uRes, uFocus;
uniform vec3 uPaper;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}

void main() {
  float t = uTime * 0.045;
  vec2 d = (vec2(noise(vUv * 5.0 + vec2(t, 0.0)), noise(vUv * 5.0 + vec2(13.1, t))) - 0.5) * 2.0 * uShimmer / uRes;
  vec2 fu = vUv * uFromX.xy + uFromX.zw + d;
  vec2 tu = vUv * uToX.xy + uToX.zw + d;

  vec3 from = uHasFrom > 0.5 ? texture2D(uFrom, fu).rgb : uPaper;
  vec3 to = texture2D(uTo, tu).rgb;

  float p = uProgress * uProgress * (3.0 - 2.0 * uProgress);
  float a;
  float front = 0.0;
  if (uFade > 0.5) {
    a = p;
  } else {
    vec2 asp = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
    float dist = length((vUv - uFocus) * asp) / length(asp);
    float field = 0.58 * dist + 0.30 * fbm(vUv * 2.6 + uSeed) + 0.12 * texture2D(uStroke, tu).r;
    float w = 0.22;
    a = smoothstep(field - w, field + w, p * (1.0 + 2.0 * w) - w * 0.5);
    front = a * (1.0 - a) * 4.0;
  }
  from = mix(from, uPaper, 0.14 * p * uHasFrom);
  vec3 col = mix(from, to, a);
  col = mix(col, uPaper, 0.10 * front);

  float g = noise(gl_FragCoord.xy * 0.85) * 0.55 + noise(gl_FragCoord.xy * 0.21) * 0.3 + noise(gl_FragCoord.xy * 0.035) * 0.15;
  col *= 1.0 + (g - 0.5) * uGrain * 2.0;
  gl_FragColor = vec4(col, 1.0);
}
`

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

async function loadImage(src) {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  await img.decode()
  return img
}

/** A stroke map for an image that has none: broad areas first, edges and detail later. */
export function deriveStrokeMap(img, w = 256, h = 160) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.filter = 'blur(1.5px)'; ctx.drawImage(img, 0, 0, w, h); ctx.filter = 'none'
  const src = ctx.getImageData(0, 0, w, h)
  const out = ctx.createImageData(w, h)
  strokeOrderFromPixels(src.data, out.data, w, h)
  ctx.putImageData(out, 0, 0)
  return c
}

/** Pure core of deriveStrokeMap (testable): RGBA in, greyscale order RGBA out. */
export function strokeOrderFromPixels(rgba, out, w, h) {
  const lum = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) lum[i] = 0.3 * rgba[i * 4] + 0.59 * rgba[i * 4 + 1] + 0.11 * rgba[i * 4 + 2]
  let max = 1
  const grad = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    const g = Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + w] - lum[i - w])
    grad[i] = g; if (g > max) max = g
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    // Coarse regional sweep plus local detail, quantised into "strokes" of ~8 px.
    const region = 0.5 + 0.5 * Math.sin((Math.floor(x / 8) * 0.37 + Math.floor(y / 5) * 0.91) * 2.3)
    const v = Math.min(1, 0.6 * Math.sqrt(grad[i] / max) + 0.4 * region)
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = Math.round(v * 255); out[i * 4 + 3] = 255
  }
  return out
}

export class PaintRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ paper?: number[], onIdle?: () => void, onChange?: (id: string|null) => void }} opts
   */
  constructor(canvas, opts = {}) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' })
    if (!gl || gl.isContextLost()) throw new Error('WebGL unavailable')
    this.canvas = canvas
    this.gl = gl
    this.opts = opts
    this.paper = opts.paper || [0.93, 0.92, 0.9]
    this.settings = { drift: true, shimmer: true, grain: VISUAL_MOTION.grain, paused: false, reduced: false, paintInMs: VISUAL_MOTION.paintInMs }
    this.from = null            // { id, tex, aspect, focus, motionStart }
    this.to = null
    this.transition = null      // { start, duration, fade }
    this.pending = null
    this.loadSeq = 0
    this.motionMs = 0           // motion clock: eases to rest while paused
    this.speed = 1              // 0..1, follows settings.paused with a soft ease
    this.lastTick = now()
    this.lastDraw = 0
    this.raf = 0
    this.disposed = false
    this._init()
  }

  _init() {
    const gl = this.gl
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || (gl.isContextLost() ? 'WebGL context lost' : 'shader compile failed'))
      return s
    }
    const p = gl.createProgram()
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link failed')
    gl.useProgram(p)
    this.prog = p
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(p, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    this.u = {}
    for (const n of ['uFrom', 'uTo', 'uStroke', 'uFromX', 'uToX', 'uProgress', 'uTime', 'uShimmer', 'uGrain', 'uHasFrom', 'uFade', 'uRes', 'uPaper', 'uFocus', 'uSeed']) this.u[n] = gl.getUniformLocation(p, n)
    gl.uniform1i(this.u.uFrom, 0); gl.uniform1i(this.u.uTo, 1); gl.uniform1i(this.u.uStroke, 2)
    this.blank = this._texture(null)
  }

  _texture(source) {
    const gl = this.gl
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]))
    return t
  }

  _free(layer) {
    if (!layer) return
    if (layer.tex) this.gl.deleteTexture(layer.tex)
    if (layer.stroke) this.gl.deleteTexture(layer.stroke)
  }

  /** Change settings; any of drift, shimmer, grain, paused, reduced, paintInMs. */
  configure(patch) {
    Object.assign(this.settings, patch)
    this._wake()
  }

  setPaper(rgb) { this.paper = rgb; this._wake() }

  /**
   * Show an image ({ id, src, strokes?, focus? }) or null (back to paper).
   * Loads and decodes first, so the transition starts only when it can run smoothly.
   */
  async show(image) {
    const seq = ++this.loadSeq
    if (!image) { this._enqueue({ id: null }); return }
    if (this.to?.id === image.id && !this.pending) return
    let layer
    try {
      const [img, strokesImg] = await Promise.all([loadImage(image.src), image.strokes ? loadImage(image.strokes).catch(() => null) : null])
      if (this.disposed || seq !== this.loadSeq) return
      const stroke = strokesImg || deriveStrokeMap(img)
      layer = { id: image.id, tex: this._texture(img), stroke: this._texture(stroke), aspect: img.naturalWidth / img.naturalHeight, focus: image.focus, motionStart: 0 }
    } catch (e) {
      console.warn('[visual] could not load', image.src, e)
      return
    }
    this._enqueue(layer)
  }

  _enqueue(layer) {
    if (this.transition) { if (this.pending && this.pending !== layer) this._free(this.pending); this.pending = layer; return }
    this._begin(layer)
  }

  _begin(layer) {
    // The current target becomes the layer being painted over.
    if (this.from && this.from !== this.to) this._free(this.from)
    this.from = this.to
    this.to = layer.id === null ? null : layer
    if (this.to) this.to.motionStart = this.motionMs
    const fade = this.settings.reduced || !this.to
    this.transition = { start: now(), duration: this.settings.reduced ? VISUAL_MOTION.reducedFadeMs : fade ? VISUAL_MOTION.toPaperMs : this.settings.paintInMs, fade }
    this.opts.onChange?.(this.to?.id ?? null)
    this._wake()
  }

  _wake() { if (!this.raf && !this.disposed) this.raf = requestAnimationFrame(this._frame) }

  _frame = () => {
    this.raf = 0
    if (this.disposed) return
    const t = now()
    const dt = Math.min(250, t - this.lastTick); this.lastTick = t
    const s = this.settings
    const target = s.paused ? 0 : 1
    this.speed += (target - this.speed) * (1 - Math.exp(-dt / VISUAL_MOTION.easeMs))
    if (Math.abs(target - this.speed) < 0.002) this.speed = target
    this.motionMs += dt * this.speed

    let progress = 1
    if (this.transition) {
      progress = Math.min(1, (t - this.transition.start) / this.transition.duration)
    }
    const animating = !!this.transition
    const living = (this.speed > 0) && !s.reduced && (s.drift || s.shimmer) && (this.to || this.from)
    const frameGap = 1000 / VISUAL_MOTION.idleFps
    if (animating || t - this.lastDraw >= frameGap || this.needsDraw) {
      this._draw(progress)
      this.lastDraw = t
      this.needsDraw = false
    }
    if (this.transition && progress >= 1) {
      const done = this.transition
      this.transition = null
      if (this.from) { this._free(this.from); this.from = null }
      if (done && this.pending) { const p = this.pending; this.pending = null; this._begin(p); return }
    }
    if (this.transition || living) this.raf = requestAnimationFrame(this._frame)
    else this.opts.onIdle?.()
  }

  resize(cssW, cssH, dpr = 1) {
    const scale = Math.min(dpr, 2, Math.sqrt(2_600_000 / Math.max(1, cssW * cssH)))
    const w = Math.max(1, Math.round(cssW * scale)), h = Math.max(1, Math.round(cssH * scale))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h
      this.gl.viewport(0, 0, w, h)
    }
    this.needsDraw = true
    this._wake()
  }

  _xform(layer) {
    if (!layer) return [1, 1, 0, 0]
    const s = this.settings
    const m = driftTransform({
      canvasAspect: this.canvas.width / this.canvas.height, imageAspect: layer.aspect, focus: layer.focus,
      elapsedMs: this.motionMs - layer.motionStart, id: layer.id, drift: s.drift && !s.reduced,
    })
    return [m.sx, m.sy, m.ox, m.oy]
  }

  _draw(progress) {
    const gl = this.gl, u = this.u, s = this.settings
    const fromLayer = this.transition ? this.from : null
    // With no target (back to paper), fade the old image out to paper.
    const toLayer = this.to || null
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fromLayer?.tex || this.blank)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, toLayer?.tex || this.blank)
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, toLayer?.stroke || this.blank)
    gl.uniform4fv(u.uFromX, this._xform(fromLayer))
    gl.uniform4fv(u.uToX, this._xform(toLayer))
    gl.uniform1f(u.uHasFrom, fromLayer ? 1 : 0)
    gl.uniform1f(u.uFade, this.transition?.fade ? 1 : 0)
    gl.uniform1f(u.uProgress, toLayer ? progress : 0)
    gl.uniform1f(u.uTime, this.motionMs / 1000)
    gl.uniform1f(u.uShimmer, s.shimmer && !s.reduced ? VISUAL_MOTION.shimmerPx * (this.canvas.width / Math.max(1, this.canvas.clientWidth || this.canvas.width)) : 0)
    gl.uniform1f(u.uGrain, s.grain)
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height)
    gl.uniform3fv(u.uPaper, this.paper)
    gl.uniform2fv(u.uFocus, this._screenFocus(toLayer))
    gl.uniform1f(u.uSeed, toLayer ? seeded(toLayer.id, 3) * 40 : 0)
    if (!toLayer && fromLayer) {
      // Fading back to paper: draw the old image as the "to" layer, fading out.
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fromLayer.tex)
      gl.uniform4fv(u.uToX, this._xform(fromLayer))
      gl.uniform1f(u.uHasFrom, 0)
      gl.uniform1f(u.uFade, 1)
      gl.uniform1f(u.uProgress, 1 - progress)
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  /** The image's focus point in screen uv, where the bloom starts. */
  _screenFocus(layer) {
    if (!layer) return [0.5, 0.5]
    const [sx, sy, ox, oy] = this._xform(layer)
    const fx = ((layer.focus?.x ?? 0.5) - ox) / sx, fy = ((layer.focus?.y ?? 0.5) - oy) / sy
    return [Math.min(0.85, Math.max(0.15, fx)), Math.min(0.85, Math.max(0.15, fy))]
  }

  get currentId() { return this.to?.id ?? null }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this._free(this.from); this._free(this.to); this._free(this.pending)
    // Release the context only once the canvas has left the page. A canvas
    // that stays (React's development double mount, or a renderer rebuilt on
    // the same element) would otherwise hand back a lost context forever.
    const { gl, canvas } = this
    setTimeout(() => { if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext() }, 0)
  }
}
