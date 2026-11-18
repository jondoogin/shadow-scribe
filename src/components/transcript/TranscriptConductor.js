// ── Transcript conductor ─────────────────────────────────────────────────────
// Moves the follow-along transcript without React re-rendering: one class per
// changed sentence, one light pool, and a calm follow-scroll. React renders the
// chapter once (TranscriptView); this object does the per-frame work.
// See docs/TRANSCRIPT.md §5–6.

import { segmentAt } from '../../narration/players.js'
import { followScrollTarget, segmentState, wordAt } from '../../narration/transcript.js'

// People expect to see a sentence light a moment before they hear it.
export const LEAD_SECONDS = 0.03
// After the reader scrolls by hand, follow again once they've left it alone this long.
export const RESUME_FOLLOW_MS = 8000
const POOL_PAD = 12

export class TranscriptConductor {
  /**
   * @param {object} o
   * @param {HTMLElement} o.scroller  the scrolling viewport
   * @param {HTMLElement} o.column    positioned container of the text and the pool
   * @param {HTMLElement} o.pool      the light pool element
   * @param {Array<{t0?: number}>} o.segments  the chapter's segments (timed for audio)
   * @param {Set<number>} [o.headings]  indices of heading segments
   * @param {() => number|null} [o.getTime]  media time in seconds (audio only)
   * @param {(following: boolean) => void} [o.onFollowChange]
   * @param {boolean} [o.reducedMotion]
   */
  constructor({ scroller, column, pool, segments, headings = new Set(), getTime = null, onFollowChange, reducedMotion = false, win = globalThis }) {
    this.scroller = scroller
    this.column = column
    this.pool = pool
    this.segments = segments || []
    this.headings = headings
    this.getTime = getTime
    this.onFollowChange = onFollowChange
    this.reducedMotion = reducedMotion
    this.win = win
    this.index = -1
    this.options = { reveal: false, veilHeading: false, words: true }
    this.following = true
    this.raf = 0
    this.states = []
    this.spans = []
    // Measured word times, read once from the rendered spans (data-t0/data-t1 in ms).
    this.words = []
    for (const el of column.querySelectorAll('[data-seg]')) {
      const k = Number(el.dataset.seg)
      this.spans[k] = el
      const ws = Array.from(el.querySelectorAll('.ts-w'))
      if (ws.length) this.words[k] = { els: ws, t0s: ws.map(w => Number(w.dataset.t0)), t1s: ws.map(w => Number(w.dataset.t1)) }
    }
    this.wordSeg = -1
    this.wordIdx = -2

    this._onUser = this._onUser.bind(this)
    this._onResize = () => this._placePool(false)
    for (const ev of ['wheel', 'touchmove', 'keydown']) scroller.addEventListener(ev, this._onUser, { passive: true })
    this.resizeObserver = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(this._onResize) : null
    this.resizeObserver?.observe(column)
  }

  setOptions(options) {
    this.options = { ...this.options, ...options }
    this._applyStates()
    if (!this.options.words) this._leaveWords()
  }

  /** Light the word being spoken at media time `t` (seconds). Only measured timings are shown. */
  setWordTime(t) {
    const W = this._enterWords()
    if (!W || t == null || !Number.isFinite(W.t0s[0])) return
    const ms = t * 1000
    const k = wordAt(W.t0s, ms)
    const span = W.t1s[k] - W.t0s[k]
    this._showWord(W, k, this.reducedMotion || !(span > 0) ? 1 : Math.min(1, Math.max(0, (ms - W.t0s[k]) / span)))
  }

  /** Device voice: light word `k` of the current sentence, as the speech engine reports it. */
  setWordIndex(k) {
    const W = this._enterWords()
    if (W) this._showWord(W, k, 1)
  }

  /** Show the words at the current media time once (while paused or after a seek). */
  syncWords() {
    if (this.getTime) this.setWordTime(this.getTime() + LEAD_SECONDS)
  }

  /** Show segment `i` as the one being spoken. */
  setIndex(i, { force = false } = {}) {
    if (i === this.index && !force) return
    const jump = this.index >= 0 && Math.abs(i - this.index) > 1
    this.index = i
    this._applyStates()
    this._placePool(!jump && !force)
    if (this.following) this._follow(jump || force)
  }

  /** Per-frame loop while audio plays. */
  start() {
    if (this.raf || !this.getTime) return
    const tick = () => {
      this.raf = this.win.requestAnimationFrame(tick)
      const t = this.getTime()
      if (t == null) return
      this.setIndex(segmentAt(this.segments, t + LEAD_SECONDS))
      this.setWordTime(t + LEAD_SECONDS)
    }
    this.raf = this.win.requestAnimationFrame(tick)
  }

  stop() {
    if (this.raf) this.win.cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  resumeFollow() {
    this.win.clearTimeout(this.resumeTimer)
    if (!this.following) {
      this.following = true
      this.onFollowChange?.(true)
    }
    this._follow(true)
  }

  dispose() {
    this.stop()
    this.win.clearTimeout(this.resumeTimer)
    for (const ev of ['wheel', 'touchmove', 'keydown']) this.scroller.removeEventListener(ev, this._onUser)
    this.resizeObserver?.disconnect()
  }

  // ── internals ──
  _enterWords() {
    const W = this.options.words && this.words[this.index]
    if (this.wordSeg !== this.index) this._leaveWords()
    if (!W) return null
    if (this.wordSeg !== this.index) {
      this.wordSeg = this.index
      this.spans[this.index].dataset.words = 'on'
    }
    return W
  }

  _showWord(W, k, fill) {
    if (k !== this.wordIdx) {
      const from = Math.max(0, Math.min(k, this.wordIdx < 0 ? 0 : this.wordIdx))
      const to = this.wordIdx === -2 ? W.els.length - 1 : Math.max(k, this.wordIdx)
      for (let j = from; j <= to && j < W.els.length; j++) {
        const state = j < k ? 'said' : j === k ? 'now' : ''
        if (state) W.els[j].dataset.w = state
        else delete W.els[j].dataset.w
      }
      this.wordIdx = k
    }
    if (k >= 0 && W.els[k]) W.els[k].style.setProperty('--fill', fill.toFixed(3))
  }

  _leaveWords() {
    const W = this.words[this.wordSeg]
    if (W) {
      for (const el of W.els) { delete el.dataset.w; el.style.removeProperty('--fill') }
      delete this.spans[this.wordSeg].dataset.words
    }
    this.wordSeg = -1
    this.wordIdx = -2
  }

  _applyStates() {
    const { reveal, veilHeading } = this.options
    for (let k = 0; k < this.spans.length; k++) {
      const el = this.spans[k]
      if (!el) continue
      const state = segmentState(k, this.index, { reveal, veilHeading, isHeading: this.headings.has(k) })
      if (this.states[k] === state) continue
      this.states[k] = state
      el.dataset.state = state
      if (state === 'current') el.setAttribute('aria-current', 'true')
      else el.removeAttribute('aria-current')
    }
  }

  _rectOf(el) {
    // Union of the sentence's line boxes, relative to the column.
    const base = this.column.getBoundingClientRect()
    const rects = Array.from(el.getClientRects?.() || [])
    if (!rects.length) rects.push(el.getBoundingClientRect())
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
    for (const r of rects) {
      left = Math.min(left, r.left); top = Math.min(top, r.top)
      right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom)
    }
    return { left: left - base.left, top: top - base.top, width: right - left, height: bottom - top }
  }

  _placePool(glide) {
    const el = this.spans[this.index]
    const pool = this.pool
    if (!pool) return
    if (!el) { pool.dataset.visible = 'false'; return }
    const r = this._rectOf(el)
    pool.dataset.glide = glide && !this.reducedMotion ? 'true' : 'false'
    pool.dataset.visible = 'true'
    pool.style.transform = `translate(${Math.round(r.left - POOL_PAD)}px, ${Math.round(r.top - POOL_PAD)}px)`
    pool.style.width = `${Math.round(r.width + POOL_PAD * 2)}px`
    pool.style.height = `${Math.round(r.height + POOL_PAD * 2)}px`
  }

  _follow(instant) {
    const el = this.spans[this.index]
    if (!el) return
    const s = this.scroller
    const sRect = s.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    const top = eRect.top - sRect.top + s.scrollTop
    const target = followScrollTarget(
      { top, bottom: top + eRect.height },
      { scrollTop: s.scrollTop, height: s.clientHeight, scrollHeight: s.scrollHeight },
    )
    if (target == null) return
    s.scrollTo({ top: target, behavior: instant || this.reducedMotion ? 'auto' : 'smooth' })
  }

  _onUser(e) {
    if (e.type === 'keydown' && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) return
    if (this.following) {
      this.following = false
      this.onFollowChange?.(false)
    }
    this.win.clearTimeout(this.resumeTimer)
    this.resumeTimer = this.win.setTimeout(() => this.resumeFollow(), RESUME_FOLLOW_MS)
  }
}
