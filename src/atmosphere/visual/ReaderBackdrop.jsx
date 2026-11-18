import VisualStage from './VisualStage.jsx'
import { VISUAL_MOTION } from './motion.js'

export const BACKDROP_DEFAULT_STRENGTH = 0.22
export const BACKDROP_MAX_STRENGTH = 0.4

// Reader backdrop (docs/VISUAL_JOURNEY.md §7.5). The painting sits behind the
// page at low strength, softly blurred, under a veil that is strongest behind
// the text column, so body text keeps its contrast in light and dark mode.
// Motion behind text is off unless the reader turns it on.
export default function ReaderBackdrop({ image, strength = BACKDROP_DEFAULT_STRENGTH, motion = false, paused = false, reduced = false, hidden = false }) {
  const s = Math.max(0, Math.min(BACKDROP_MAX_STRENGTH, strength))
  return (
    <div className="reader-backdrop" aria-hidden="true" style={{ opacity: hidden ? 0 : 1 }}>
      <VisualStage
        image={image}
        drift={motion}
        shimmer={motion}
        paused={paused}
        reduced={reduced}
        paintInMs={VISUAL_MOTION.backdropPaintInMs}
        className="reader-backdrop-stage"
        style={{ opacity: s }}
      />
      <div className="reader-backdrop-veil" />
    </div>
  )
}
