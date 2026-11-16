// Painterly motion constants and the slow drift ("living paint") maths.
// Mirrors the atmosphere tokens in docs/DESIGN_SYSTEM.md / VISUAL_JOURNEY.md §7.3.

export const VISUAL_MOTION = {
  paintInMs: 14_000,          // --visual-paint-in
  backdropPaintInMs: 20_000,  // Reader backdrop: slower, reads as the page colour changing
  reducedFadeMs: 1_000,       // Reduced Motion: plain opacity fade
  minOnScreenMs: 90_000,      // --visual-min-on-screen (no maximum)
  driftFrom: 1.03,            // --visual-drift-scale
  driftTo: 1.07,
  driftPeriodMs: 240_000,     // one slow push in or out; then it eases back the other way
  shimmerPx: 1.5,             // --visual-shimmer
  grain: 0.06,                // --visual-grain
  idleFps: 24,                // redraw rate for drift and shimmer between transitions
}

/** Deterministic 0..1 from a string, so an image moves the same way on every device. */
export function seeded(id, salt = 0) {
  let h = 2166136261 ^ salt
  for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x)    // gentle at both ends

/**
 * Map screen uv (0..1) to image uv: uvImg = uv * (sx, sy) + (ox, oy).
 * Cover-fits the image, zooms about its focus point and pans a little. The
 * visible window always stays inside the image.
 *
 * @param {object} p
 * @param {number} p.canvasAspect width / height of the stage
 * @param {number} p.imageAspect  width / height of the image
 * @param {{x:number,y:number}} [p.focus]
 * @param {number} p.elapsedMs    motion time since this image went on stage (pauses with narration)
 * @param {string} p.id           image id (seeds direction)
 * @param {boolean} p.drift       false = still image at the resting zoom
 */
export function driftTransform({ canvasAspect, imageAspect, focus, elapsedMs, id, drift, motion = VISUAL_MOTION }) {
  let bx = 1, by = 1
  if (canvasAspect > imageAspect) by = imageAspect / canvasAspect
  else bx = canvasAspect / imageAspect

  const f = { x: focus?.x ?? 0.5, y: focus?.y ?? 0.5 }
  const zoomIn = seeded(id, 1) < 0.5                       // alternate push in / pull out by image
  let z = (motion.driftFrom + motion.driftTo) / 2, panX = 0, panY = 0
  if (drift) {
    const cycle = (elapsedMs / motion.driftPeriodMs) % 2
    const u = ease(cycle <= 1 ? cycle : 2 - cycle)          // 0 → 1 → 0, never a visible stop
    const k = zoomIn ? u : 1 - u
    z = motion.driftFrom + (motion.driftTo - motion.driftFrom) * k
    const ang = seeded(id, 2) * Math.PI * 2
    const reach = (1 - 1 / motion.driftTo) * 0.35
    panX = Math.cos(ang) * reach * (k - 0.5)
    panY = Math.sin(ang) * reach * (k - 0.5) * 0.6
  }
  const sx = bx / z, sy = by / z
  let ox = 0.5 * (1 - bx) / z + f.x * (1 - 1 / z) + panX
  let oy = 0.5 * (1 - by) / z + f.y * (1 - 1 / z) + panY
  ox = Math.min(Math.max(ox, 0), 1 - sx)
  oy = Math.min(Math.max(oy, 0), 1 - sy)
  return { sx, sy, ox, oy, z }
}
