// ── Media clock ──────────────────────────────────────────────────────────────
// The transcript reads the narration's position on every animation frame.
// Browsers fire `timeupdate` only about every 250 ms, and some (Firefox with
// reduced timer precision) quantise `currentTime`, so the clock extrapolates
// from the last known position and snaps back when the two disagree.
//
//   mediaTime(now) = anchor.media + (now − anchor.perf) / 1000 × rate
//
// See docs/TRANSCRIPT.md §5.

export const SNAP_SECONDS = 0.08

export class MediaClock {
  /** @param {() => number} now  milliseconds, monotonic (performance.now) */
  constructor(now = () => globalThis.performance?.now?.() ?? Date.now()) {
    this.now = now
    this.media = 0
    this.perf = now()
    this.rate = 1
    this.running = false
  }

  /** Re-anchor from the element's own position (on timeupdate, seek, play, pause, rate change). */
  sync(mediaTime, { rate = this.rate, running = this.running } = {}) {
    this.media = Number.isFinite(mediaTime) ? mediaTime : 0
    this.perf = this.now()
    this.rate = rate
    this.running = running
  }

  /** Extrapolated position. Pass the element's `currentTime` to snap when they drift apart. */
  read(actual) {
    const t = this.running ? this.media + ((this.now() - this.perf) / 1000) * this.rate : this.media
    if (Number.isFinite(actual) && Math.abs(actual - t) > SNAP_SECONDS) {
      this.sync(actual)
      return actual
    }
    return t
  }
}
