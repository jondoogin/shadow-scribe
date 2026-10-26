// ── Unified sleep timer ──────────────────────────────────────────────────────
// One timer for narration and ambience. Stores an absolute deadline, so a tab
// that was suspended (phone locked, background tab) reconciles on its next
// check instead of restarting the countdown.

export const SLEEP_OPTIONS = [
  { id: 'off', label: 'Off' },
  { id: '15', label: '15 min', minutes: 15 },
  { id: '30', label: '30 min', minutes: 30 },
  { id: '45', label: '45 min', minutes: 45 },
  { id: '60', label: '60 min', minutes: 60 },
  { id: 'chapter', label: 'End of chapter' },
]

export function createSleepTimer({ now = () => Date.now(), onFire } = {}) {
  let mode = 'off'
  let deadline = null

  const fire = () => {
    mode = 'off'
    deadline = null
    onFire?.()
  }

  return {
    set(optionId) {
      const opt = SLEEP_OPTIONS.find(o => o.id === optionId) || SLEEP_OPTIONS[0]
      mode = opt.minutes ? 'minutes' : opt.id
      deadline = opt.minutes ? now() + opt.minutes * 60_000 : null
    },
    /** Call on an interval and on visibilitychange/resume. */
    check() {
      if (mode === 'minutes' && deadline !== null && now() >= deadline) fire()
    },
    /** Call when narration crosses a chapter boundary. */
    chapterEnded() {
      if (mode === 'chapter') fire()
    },
    state() {
      return { mode, deadline, remainingMs: deadline ? Math.max(0, deadline - now()) : null }
    },
  }
}
