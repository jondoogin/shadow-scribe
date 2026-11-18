import { describe, it, expect, vi } from 'vitest'
import { TranscriptConductor, RESUME_FOLLOW_MS } from './TranscriptConductor.js'

// Minimal DOM stand-ins: each sentence is one line box, 30 px tall, stacked.
function el(extra = {}) {
  const t = new EventTarget()
  return Object.assign(t, {
    dataset: {}, attrs: {},
    style: { setProperty(k, v) { this[k] = v }, removeProperty(k) { delete this[k] } },
    querySelectorAll: () => [],
    setAttribute(k, v) { this.attrs[k] = v },
    removeAttribute(k) { delete this.attrs[k] },
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 30, width: 100, height: 30 }),
  }, extra)
}

function setup(n = 6, words = {}) {
  const spans = Array.from({ length: n }, (_, k) => {
    const ws = (words[k] || []).map(([t0, t1]) => el({ dataset: { t0: String(t0), t1: String(t1) } }))
    const s = el({ dataset: { seg: String(k) }, querySelectorAll: () => ws, words: ws })
    s.getBoundingClientRect = () => ({ left: 10, top: 100 + k * 120 - scroller.scrollTop, right: 300, bottom: 130 + k * 120 - scroller.scrollTop, width: 290, height: 30 })
    s.getClientRects = () => [s.getBoundingClientRect()]
    return s
  })
  const scroller = el({ scrollTop: 0, clientHeight: 400, scrollHeight: 2000 })
  scroller.scrollTo = vi.fn(({ top }) => { scroller.scrollTop = top })
  const column = el({ querySelectorAll: () => spans })
  column.getBoundingClientRect = () => ({ left: 0, top: -scroller.scrollTop, right: 400, bottom: 2000, width: 400, height: 2000 })
  const pool = el()
  let frame = null
  const win = {
    requestAnimationFrame: fn => { frame = fn; return 1 },
    cancelAnimationFrame: () => { frame = null },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: id => clearTimeout(id),
  }
  const segments = spans.map((_, k) => ({ t0: k * 2 + 0.3, t1: k * 2 + 1.8 }))
  return { spans, scroller, column, pool, win, segments, runFrame: () => frame?.() }
}

describe('TranscriptConductor', () => {
  it('lights the current sentence and settles the rest', () => {
    const d = setup()
    const c = new TranscriptConductor({ ...d, headings: new Set([0]) })
    c.setIndex(2)
    expect(d.spans.map(s => s.dataset.state)).toEqual(['spoken', 'spoken', 'current', 'ahead', 'ahead', 'ahead'])
    expect(d.spans[2].attrs['aria-current']).toBe('true')
    expect(d.pool.dataset.visible).toBe('true')
    expect(d.pool.style.transform).toBe('translate(-2px, 328px)')
    c.setIndex(3)
    expect(d.spans[2].attrs['aria-current']).toBeUndefined()
    expect(d.pool.dataset.glide).toBe('true')
  })

  it('does not glide across a jump (seek), and hides the pool before the first sentence', () => {
    const d = setup()
    const c = new TranscriptConductor(d)
    c.setIndex(1)
    c.setIndex(5)
    expect(d.pool.dataset.glide).toBe('false')
    c.setIndex(-1)
    expect(d.pool.dataset.visible).toBe('false')
  })

  it('follows the audio clock frame by frame (with a small lead)', () => {
    const d = setup()
    let t = 0
    const c = new TranscriptConductor({ ...d, getTime: () => t })
    c.start()
    d.runFrame()
    expect(c.index).toBe(-1)
    t = 2.28 // 2.3 minus less than the lead
    d.runFrame()
    expect(c.index).toBe(1)
    t = 3.9 // in the pause after sentence 1: it stays lit
    d.runFrame()
    expect(c.index).toBe(1)
    c.stop()
  })

  it('applies reveal-as-spoken and the strict-mode heading veil', () => {
    const d = setup()
    const c = new TranscriptConductor({ ...d, headings: new Set([0]) })
    c.setOptions({ veilHeading: true })
    c.setIndex(-1, { force: true })
    expect(d.spans[0].dataset.state).toBe('veiled')
    c.setOptions({ reveal: true })
    c.setIndex(1)
    expect(d.spans.map(s => s.dataset.state)).toEqual(['spoken', 'current', 'ahead', 'veiled', 'veiled', 'veiled'])
  })

  it('scrolls to keep the voice in view, but never against the reader', () => {
    vi.useFakeTimers()
    const d = setup()
    const onFollowChange = vi.fn()
    const c = new TranscriptConductor({ ...d, onFollowChange })
    c.setIndex(0)
    c.setIndex(1)
    c.setIndex(2)
    expect(d.scroller.scrollTo).toHaveBeenCalled()
    const calls = d.scroller.scrollTo.mock.calls.length
    d.scroller.dispatchEvent(new Event('wheel'))
    expect(onFollowChange).toHaveBeenLastCalledWith(false)
    c.setIndex(3)
    c.setIndex(4)
    expect(d.scroller.scrollTo.mock.calls.length).toBe(calls)
    vi.advanceTimersByTime(RESUME_FOLLOW_MS)
    expect(onFollowChange).toHaveBeenLastCalledWith(true)
    expect(d.scroller.scrollTo.mock.calls.length).toBe(calls + 1)
    c.dispose()
    vi.useRealTimers()
  })

  it('inks in measured words inside the current sentence only', () => {
    const d = setup(4, { 1: [[2300, 2600], [2600, 3000], [3000, 3800]] })
    const c = new TranscriptConductor(d)
    const w = d.spans[1].words
    c.setIndex(1)
    c.setWordTime(2.2)
    expect(d.spans[1].dataset.words).toBe('on')
    expect(w.map(x => x.dataset.w)).toEqual([undefined, undefined, undefined])
    c.setWordTime(2.8)
    expect(w.map(x => x.dataset.w)).toEqual(['said', 'now', undefined])
    expect(Number(w[1].style['--fill'])).toBeCloseTo(0.5, 2)
    c.setWordTime(3.5)
    expect(w.map(x => x.dataset.w)).toEqual(['said', 'said', 'now'])
    c.setWordTime(2.4) // seek back
    expect(w.map(x => x.dataset.w)).toEqual(['now', undefined, undefined])
    c.setIndex(2)
    c.setWordTime(4.4)
    expect(d.spans[1].dataset.words).toBeUndefined()
    expect(w.map(x => x.dataset.w)).toEqual([undefined, undefined, undefined])
  })

  it('shows no words when word level is off or the sentence was not measured', () => {
    const d = setup(3, { 0: [[300, 900]] })
    const c = new TranscriptConductor(d)
    c.setOptions({ words: false })
    c.setIndex(0)
    c.setWordTime(0.5)
    expect(d.spans[0].words[0].dataset.w).toBeUndefined()
    c.setOptions({ words: true })
    c.setIndex(1)
    c.setWordTime(2.5)
    expect(d.spans[1].dataset.words).toBeUndefined()
  })
})
