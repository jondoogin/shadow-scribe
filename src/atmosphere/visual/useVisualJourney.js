import { useEffect, useMemo, useRef, useState } from 'react'
import { chooseImage } from './eligibility.js'
import { VISUAL_MOTION } from './motion.js'

/**
 * Which image the stage may show for the current position.
 * Re-decides whenever the position changes; the only timer waits out the
 * minimum time on screen for an image that is ALREADY eligible.
 *
 * @returns {{ image: object|null, waitingId: string|null }}
 */
export function useVisualJourney({ images, sectionOrder, position, minOnScreenMs = VISUAL_MOTION.minOnScreenMs, enabled = true }) {
  const [state, setState] = useState({ id: null, shownAt: 0, waitingId: null })
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) { setState({ id: null, shownAt: 0, waitingId: null }); return } // eslint-disable-line react-hooks/set-state-in-effect
    const cur = stateRef.current
    const t = Date.now()
    const r = chooseImage({ images, position, sectionOrder, currentId: cur.id, shownAt: cur.shownAt, now: t, minOnScreenMs })
    if (r.changed) setState({ id: r.id, shownAt: t, waitingId: null })
    else if (r.wakeAt) {
      const peek = chooseImage({ images, position, sectionOrder, currentId: cur.id, shownAt: -Infinity, now: t, minOnScreenMs })
      if (peek.id !== cur.waitingId) setState(s => ({ ...s, waitingId: peek.id }))
      const timer = setTimeout(() => setTick(n => n + 1), Math.max(50, r.wakeAt - t))
      return () => clearTimeout(timer)
    } else if (cur.waitingId) setState(s => ({ ...s, waitingId: null }))
  }, [images, sectionOrder, position?.sectionId, position?.blockId, position?.segmentId, minOnScreenMs, enabled, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const image = useMemo(() => images?.find(i => i.id === state.id) || null, [images, state.id])
  return { image, waitingId: state.waitingId }
}

/** prefers-reduced-motion, live. */
export function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return !!reduced
}
