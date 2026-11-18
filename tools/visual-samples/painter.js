// Runs inside a browser page (see paint-samples.mjs). Draws a simple reference
// scene, then repaints it with brush strokes, coarse to fine, and records the
// order each stroke was laid down in a second canvas: the stroke map that the
// Visual Journey stage uses to paint the image in.
//
// The scenes are drawn by this code, not by an image model. They exist so the
// painterly stage can be judged before any generated images exist.

window.paintSample = function paintSample(sceneName, seed, W = 1600, H = 1000) {
  let s = seed >>> 0
  const rand = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }

  // ── value noise for smooth regional ordering ──
  const G = 9, grid = Array.from({ length: (G + 1) * (G + 1) }, rand)
  const smooth = (x, y) => {
    const gx = (x / W) * G, gy = (y / H) * G, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy
    const at = (a, b) => grid[Math.min(G, b) * (G + 1) + Math.min(G, a)]
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
    return (at(ix, iy) * (1 - u) + at(ix + 1, iy) * u) * (1 - v) + (at(ix, iy + 1) * (1 - u) + at(ix + 1, iy + 1) * u) * v
  }

  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c }
  const ref = mk(), rc = ref.getContext('2d')
  SCENES[sceneName](rc, W, H, rand)

  const out = mk(), oc = out.getContext('2d')
  const map = mk(), mc = map.getContext('2d')
  oc.fillStyle = '#b89a6a'; oc.fillRect(0, 0, W, H)        // toned ground, as a painter would start
  mc.fillStyle = '#000'; mc.fillRect(0, 0, W, H)

  const radii = [44, 22, 11, 6, 3]
  const thresholds = [0, 16, 20, 24, 30]
  const L = radii.length
  let prevBlur = null

  radii.forEach((r, li) => {
    const b = mk(), bc = b.getContext('2d')
    bc.filter = `blur(${Math.max(1, r * 0.45)}px)`; bc.drawImage(ref, 0, 0); bc.filter = 'none'
    const bd = bc.getImageData(0, 0, W, H).data
    const cd = oc.getImageData(0, 0, W, H).data
    const px = (d, x, y) => { x = Math.max(0, Math.min(W - 1, x | 0)); y = Math.max(0, Math.min(H - 1, y | 0)); const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]] }
    const lum = (x, y) => { const c = px(bd, x, y); return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2] }
    const diff = (a, c) => Math.abs(a[0] - c[0]) + Math.abs(a[1] - c[1]) + Math.abs(a[2] - c[2])

    const strokes = []
    const step = r * 0.85
    for (let gy = 0; gy < H + step; gy += step) {
      for (let gx = 0; gx < W + step; gx += step) {
        const x = gx + (rand() - 0.5) * step, y = gy + (rand() - 0.5) * step
        const target = px(bd, x, y)
        if (li > 0) {
          const have = px(cd, x, y)
          const coarse = prevBlur ? px(prevBlur, x, y) : have
          if (diff(target, have) < thresholds[li] && diff(target, coarse) < thresholds[li]) continue
        }
        // Walk perpendicular to the luminance gradient, so strokes follow forms.
        const pts = [[x, y]]
        let cx = x, cy = y, ldx = 0, ldy = 0
        const maxLen = li === 0 ? 5 : 3 + Math.floor(rand() * 6)
        for (let k = 0; k < maxLen; k++) {
          const gxv = lum(cx + r / 2, cy) - lum(cx - r / 2, cy)
          const gyv = lum(cx, cy + r / 2) - lum(cx, cy - r / 2)
          let dx = -gyv, dy = gxv
          const m = Math.hypot(dx, dy)
          if (m < 0.5) { dx = ldx || 1; dy = ldy || 0.15 } else { dx /= m; dy /= m }
          if (ldx * dx + ldy * dy < 0) { dx = -dx; dy = -dy }
          if (k > 0) { dx = 0.6 * dx + 0.4 * ldx; dy = 0.6 * dy + 0.4 * ldy }
          cx += dx * r; cy += dy * r; ldx = dx; ldy = dy
          if (diff(px(bd, cx, cy), target) > 40) break
          pts.push([cx, cy])
        }
        const order = 0.65 * smooth(x, y) + 0.35 * rand()
        strokes.push({ pts, target, order, w: r * (1.5 + rand() * 0.6), a: 0.82 + rand() * 0.14, j: rand() })
      }
    }
    strokes.sort((a, b) => a.order - b.order)

    const path = (ctx, pts, ox = 0, oy = 0) => {
      ctx.beginPath(); ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy)
      if (pts.length === 1) ctx.lineTo(pts[0][0] + ox + 0.1, pts[0][1] + oy)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy)
    }
    oc.lineCap = mc.lineCap = 'round'; oc.lineJoin = mc.lineJoin = 'round'
    strokes.forEach((st, i) => {
      const [R, Gc, B] = st.target
      const k = 1 + (st.j - 0.5) * 0.13
      const hue = (st.j - 0.5) * 10
      const col = (m) => `rgb(${Math.min(255, R * k * m + hue) | 0},${Math.min(255, Gc * k * m) | 0},${Math.min(255, B * k * m - hue) | 0})`
      oc.globalAlpha = st.a; oc.strokeStyle = col(1); oc.lineWidth = st.w; path(oc, st.pts); oc.stroke()
      // A few bristle lines give the stroke texture.
      if (r >= 6) {
        oc.globalAlpha = 0.26
        for (let bi = 0; bi < 4; bi++) {
          const off = (rand() - 0.5) * st.w * 0.7
          oc.strokeStyle = col(rand() < 0.5 ? 0.9 : 1.08); oc.lineWidth = Math.max(1, st.w * 0.12)
          path(oc, st.pts, off * 0.3, off); oc.stroke()
        }
      }
      const v = Math.round(255 * (li + 0.1 + 0.85 * (i / Math.max(1, strokes.length - 1))) / L)
      mc.globalAlpha = 1; mc.strokeStyle = `rgb(${v},${v},${v})`; mc.lineWidth = st.w; path(mc, st.pts); mc.stroke()
    })
    oc.globalAlpha = 1
    prevBlur = bd
  })

  // The stroke map is stored small; the stage samples it with linear filtering.
  const sm = document.createElement('canvas'); sm.width = 400; sm.height = 250
  const smc = sm.getContext('2d'); smc.imageSmoothingQuality = 'high'; smc.filter = 'blur(1.2px)'; smc.drawImage(map, 0, 0, 400, 250)
  return { image: out.toDataURL('image/webp', 0.8), strokes: sm.toDataURL('image/webp', 0.9) }
}

// ── Reference scenes (simple shapes; the brushwork comes from the painter) ──
const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g }
const glow = (c, x, y, r, col, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2) }
const ridge = (c, W, H, base, amp, freq, phase, fill, rand) => {
  c.beginPath(); c.moveTo(0, H)
  for (let x = 0; x <= W; x += 8) c.lineTo(x, base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.7 + phase * 3) * amp * 0.35 + (rand() - 0.5) * 2)
  c.lineTo(W, H); c.closePath(); c.fillStyle = fill; c.fill()
}
const tree = (c, x, y, len, ang, depth, w, rand) => {
  if (depth === 0 || len < 4) return
  const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len
  c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke()
  const n = 2 + (rand() < 0.4 ? 1 : 0)
  for (let i = 0; i < n; i++) tree(c, x2, y2, len * (0.62 + rand() * 0.18), ang + (rand() - 0.5) * 1.1, depth - 1, w * 0.68, rand)
}

const SCENES = {
  'evening-sea'(c, W, H, rand) {
    c.fillStyle = lin(c, 0, 0, 0, 600, [[0, '#2f3456'], [0.45, '#7a5a78'], [0.8, '#d48a6a'], [1, '#f2c27b']]); c.fillRect(0, 0, W, 600)
    for (let i = 0; i < 7; i++) { c.fillStyle = `rgba(${200 + rand() * 40},${120 + rand() * 40},${120 + rand() * 30},0.35)`; c.beginPath(); c.ellipse(rand() * W, 180 + rand() * 300, 160 + rand() * 260, 10 + rand() * 18, 0, 0, 7); c.fill() }
    glow(c, 1100, 575, 300, 'rgba(255,214,150,A)', 0.55)
    c.fillStyle = '#fbe6b0'; c.beginPath(); c.arc(1100, 572, 34, 0, 7); c.fill()
    c.fillStyle = lin(c, 0, 600, 0, H, [[0, '#8a6a7a'], [0.35, '#55486a'], [1, '#2a2d46']]); c.fillRect(0, 600, W, H - 600)
    for (let i = 0; i < 90; i++) { const y = 610 + rand() * 390; c.fillStyle = `rgba(${150 + rand() * 60},${120 + rand() * 40},${150 + rand() * 40},0.25)`; c.fillRect(rand() * W, y, 60 + rand() * 160, 2 + (y - 600) / 90) }
    for (let i = 0; i < 160; i++) { const y = 606 + Math.pow(rand(), 1.6) * 390, sp = 30 + (y - 600) * 0.35; c.fillStyle = `rgba(255,${200 + rand() * 40},${140 + rand() * 40},${0.25 + rand() * 0.45})`; c.fillRect(1100 + (rand() - 0.5) * sp * 2, y, 20 + rand() * 50, 3 + (y - 600) / 80) }
    c.fillStyle = '#4a3c55'; c.beginPath(); c.moveTo(0, 604); for (let x = 0; x <= W; x += 10) c.lineTo(x, 592 + Math.sin(x * 0.004 + 1.3) * 7); c.lineTo(W, 606); c.closePath(); c.fill()
    c.fillStyle = '#2e2638'; c.beginPath(); c.moveTo(0, 660); c.lineTo(0, 540); for (let x = 0; x <= 470; x += 10) c.lineTo(x, 545 + x * x * 0.00026 + Math.sin(x * 0.03) * 6); c.lineTo(520, 612); c.lineTo(380, 640); c.closePath(); c.fill()
    c.fillStyle = '#231d2a'; c.beginPath(); c.moveTo(690, 602); c.lineTo(712, 552); c.lineTo(716, 602); c.closePath(); c.fill(); c.fillRect(684, 600, 40, 5)
  },
  'morning-hills'(c, W, H, rand) {
    c.fillStyle = lin(c, 0, 0, 0, 520, [[0, '#c9d6d8'], [0.6, '#e8e4d2'], [1, '#f4e6c4']]); c.fillRect(0, 0, W, H)
    glow(c, 1250, 300, 420, 'rgba(255,240,205,A)', 0.6)
    ridge(c, W, H, 430, 30, 0.003, 0.5, '#a9b6b6', rand)
    ridge(c, W, H, 500, 40, 0.0042, 2.1, '#94a596', rand)
    for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(245,242,230,0.28)'; c.beginPath(); c.ellipse(rand() * W, 500 + rand() * 30, 400 + rand() * 300, 30 + rand() * 20, 0, 0, 7); c.fill() }
    ridge(c, W, H, 600, 50, 0.0035, 4.0, '#7d9167', rand)
    ridge(c, W, H, 740, 60, 0.0028, 0.9, '#62794a', rand)
    for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(250,246,234,0.22)'; c.beginPath(); c.ellipse(rand() * W, 660 + rand() * 30, 300 + rand() * 300, 24 + rand() * 16, 0, 0, 7); c.fill() }
    for (let i = 0; i < 26; i++) { const x = rand() * W, y = 560 + rand() * 180; c.fillStyle = `rgb(${50 + rand() * 20},${70 + rand() * 20},${45 + rand() * 15})`; c.beginPath(); c.ellipse(x, y, 26 + rand() * 30, 30 + rand() * 30, 0, 0, 7); c.fill() }
    c.strokeStyle = '#d9c99c'; c.lineCap = 'round'
    c.lineWidth = 60; c.beginPath(); c.moveTo(700, H + 20); c.bezierCurveTo(760, 860, 980, 820, 900, 720); c.bezierCurveTo(860, 660, 940, 640, 980, 610); c.stroke()
    c.lineWidth = 26; c.strokeStyle = '#e6d8ae'; c.stroke()
    c.fillStyle = '#3a3a34'; c.fillRect(936, 640, 7, 20); c.beginPath(); c.arc(939.5, 636, 4.5, 0, 7); c.fill()
  },
  'rain-house'(c, W, H, rand) {
    c.fillStyle = lin(c, 0, 0, 0, 640, [[0, '#59636f'], [1, '#97a09f']]); c.fillRect(0, 0, W, H)
    for (let i = 0; i < 10; i++) { c.fillStyle = `rgba(${70 + rand() * 30},${80 + rand() * 30},${92 + rand() * 30},0.4)`; c.beginPath(); c.ellipse(rand() * W, 80 + rand() * 360, 200 + rand() * 300, 40 + rand() * 60, 0, 0, 7); c.fill() }
    ridge(c, W, H, 600, 20, 0.004, 1, '#5a655f', rand)
    c.fillStyle = lin(c, 0, 640, 0, H, [[0, '#3f4a45'], [1, '#2a312e']]); c.fillRect(0, 640, W, H - 640)
    c.fillStyle = '#2e3335'; c.fillRect(560, 400, 520, 260); c.beginPath(); c.moveTo(530, 410); c.lineTo(820, 270); c.lineTo(1110, 410); c.closePath(); c.fill(); c.fillRect(960, 290, 36, 80)
    ;[[620, 460], [740, 460], [900, 460], [1010, 460], [620, 560], [1010, 560]].forEach(([x, y], i) => {
      glow(c, x + 22, y + 30, 90, 'rgba(240,190,100,A)', 0.35)
      c.fillStyle = i === 3 ? '#e8b85e' : '#f0c46a'; c.fillRect(x, y, 44, 60)
      c.fillStyle = 'rgba(240,196,106,0.35)'; c.fillRect(x - 6, 700 + (y - 460) * 0.6, 56, 90)
    })
    c.fillStyle = '#4a3a2a'; c.fillRect(800, 570, 52, 90)
    for (let i = 0; i < 18; i++) { const x = rand() < 0.5 ? rand() * 480 : 1150 + rand() * 450; c.fillStyle = '#26302c'; c.beginPath(); c.ellipse(x, 560 + rand() * 60, 40 + rand() * 50, 90 + rand() * 80, 0, 0, 7); c.fill() }
    c.strokeStyle = 'rgba(220,228,232,0.22)'; c.lineWidth = 1.5
    for (let i = 0; i < 900; i++) { const x = rand() * W, y = rand() * H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 10, y + 46); c.stroke() }
  },
  'candle-interior'(c, W, H) {
    c.fillStyle = lin(c, 0, 0, W, 0, [[0, '#2a201b'], [0.6, '#3a2a20'], [1, '#231a15']]); c.fillRect(0, 0, W, H)
    c.fillStyle = '#1d2638'; c.fillRect(170, 150, 380, 470)
    glow(c, 360, 300, 260, 'rgba(90,120,170,A)', 0.35)
    c.fillStyle = '#e8edf2'; c.beginPath(); c.arc(450, 250, 22, 0, 7); c.fill()
    c.strokeStyle = '#2b211b'; c.lineWidth = 16; c.strokeRect(170, 150, 380, 470); c.beginPath(); c.moveTo(360, 150); c.lineTo(360, 620); c.moveTo(170, 385); c.lineTo(550, 385); c.stroke()
    c.fillStyle = '#5a3c22'; c.fillRect(140, 620, 440, 20)
    glow(c, 930, 560, 620, 'rgba(255,190,110,A)', 0.42)
    c.fillStyle = lin(c, 0, 690, 0, H, [[0, '#6b4528'], [1, '#2e1f15']]); c.fillRect(0, 690, W, H - 690)
    c.fillStyle = '#7a4f2c'; c.fillRect(0, 684, W, 12)
    c.fillStyle = '#8a2f2a'; c.fillRect(1080, 650, 210, 40); c.fillStyle = '#e9dcc0'; c.fillRect(1086, 640, 200, 12)
    c.fillStyle = '#c9b48f'; c.beginPath(); c.ellipse(700, 680, 46, 14, 0, 0, 7); c.fill(); c.fillRect(660, 630, 80, 50)
    c.fillStyle = '#efe4c8'; c.fillRect(912, 520, 34, 168)
    c.fillStyle = '#b58a4a'; c.beginPath(); c.ellipse(929, 688, 70, 16, 0, 0, 7); c.fill()
    glow(c, 929, 490, 120, 'rgba(255,230,160,A)', 0.8)
    c.fillStyle = '#fff3c8'; c.beginPath(); c.ellipse(929, 494, 10, 24, 0, 0, 7); c.fill()
  },
  'winter-wood'(c, W, H, rand) {
    c.fillStyle = lin(c, 0, 0, 0, 640, [[0, '#7f93b4'], [0.55, '#c9b8c4'], [1, '#efcfbd']]); c.fillRect(0, 0, W, H)
    glow(c, 420, 560, 260, 'rgba(255,230,210,A)', 0.55)
    ridge(c, W, H, 600, 18, 0.005, 0.3, '#8d8fa8', rand)
    for (let i = 0; i < 60; i++) { const x = rand() * W; c.strokeStyle = '#6f7090'; tree(c, x, 640, 40 + rand() * 40, -Math.PI / 2, 4, 3, rand) }
    c.fillStyle = lin(c, 0, 640, 0, H, [[0, '#dfe3ec'], [1, '#f2f3f6']]); c.fillRect(0, 640, W, H - 640)
    for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(160,175,205,0.45)'; c.beginPath(); c.ellipse(rand() * W, 700 + rand() * 280, 200 + rand() * 200, 14 + rand() * 20, 0, 0, 7); c.fill() }
    c.strokeStyle = '#3a3434'
    ;[[180, 1000], [330, 980], [1180, 1000], [1390, 990], [1520, 1000], [860, 900]].forEach(([x, y], i) => tree(c, x, y, i === 5 ? 90 : 170 + rand() * 50, -Math.PI / 2, 7, i === 5 ? 9 : 18, rand))
    c.fillStyle = '#3a3434'; c.fillRect(1040, 820, 6, 18); c.beginPath(); c.arc(1043, 815, 4, 0, 7); c.fill()
  },
}
