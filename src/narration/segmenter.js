// ── Narration segmentation ───────────────────────────────────────────────────
// Splits content blocks into speakable segments at sentence boundaries.
// This is the single source of truth for segmentation: the browser speech
// fallback, the narration script exported to the Mac generator, and the audio
// timing maps all use these segment ids and offsets.
//
// Segment: { id, blockId, start, end, text, spoken, kind, pauseAfterMs }
//   start/end — character offsets into block.text (display text)
//   spoken    — text sent to the TTS engine (light normalisation only)

export const SEGMENTER_VERSION = 1
export const DEFAULT_MAX_CHARS = 320
export const PAUSES = { sentence: 260, paragraph: 650, heading: 1000, sceneBreak: 1400 }

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'mme', 'mlle', 'dr', 'st', 'mt', 'jr', 'sr', 'prof', 'rev', 'gen', 'col', 'capt',
  'lt', 'sgt', 'hon', 'gov', 'pres', 'sen', 'rep', 'fr', 'vs', 'etc', 'no', 'nos', 'vol', 'vols', 'ch',
  'pp', 'cf', 'fig', 'figs', 'ave', 'blvd', 'rd', 'co', 'corp', 'inc', 'ltd', 'dept', 'esq', 'messrs',
  'approx', 'e.g', 'i.e', 'a.m', 'p.m', 'viz', 'ibid', 'op', 'al', 'jan', 'feb', 'mar', 'apr', 'jun',
  'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'u.s', 'u.k',
])

const CLOSERS = `"'”’»)]}`
const OPENERS = `"'“‘«([{`

function isSpace(ch) { return ch === ' ' || ch === '\n' || ch === '\t' }

/**
 * Sentence spans [{ start, end }] covering `text` (end exclusive, trimmed).
 * Newlines are hard boundaries (verse, letters, addresses).
 */
export function splitSentences(text) {
  const spans = []
  let start = 0
  const push = (s, e) => {
    while (s < e && isSpace(text[s])) s++
    while (e > s && isSpace(text[e - 1])) e--
    if (e > s) spans.push({ start: s, end: e })
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\n') { push(start, i); start = i + 1; continue }
    if (ch !== '.' && ch !== '!' && ch !== '?' && ch !== '…') continue
    // Absorb runs like "?!" or "..." and closing quotes/brackets.
    let j = i + 1
    while (j < text.length && '.!?…'.includes(text[j])) j++
    while (j < text.length && CLOSERS.includes(text[j])) j++
    if (j < text.length && !isSpace(text[j])) continue // e.g. "3.14", "U.S.A"
    // Look at what follows the whitespace.
    let k = j
    while (k < text.length && text[k] === ' ') k++
    if (k >= text.length) { push(start, j); start = j; i = j - 1; continue }
    if (text[k] === '\n') { push(start, j); start = j; i = j - 1; continue }
    const next = text[k]
    const nextStartsSentence = /[\p{Lu}\p{N}]/u.test(next) || OPENERS.includes(next) || next === '—' || next === '–'
    if (!nextStartsSentence) continue // “Oh!” cried she — keep the speech tag attached
    if (ch === '.') {
      const word = text.slice(start, i).match(/([\p{L}.]+)$/u)?.[1]?.toLowerCase() || ''
      if (ABBREVIATIONS.has(word) || ABBREVIATIONS.has(word.replace(/\.$/, ''))) continue
      if (/^\p{L}$/u.test(word)) continue // initials: "J. R. R. Tolkien"
    }
    push(start, j)
    start = j
    i = j - 1
  }
  push(start, text.length)
  return spans
}

// Split one over-long sentence at the latest clause boundary before maxChars.
function splitLong(text, span, maxChars) {
  const out = []
  let s = span.start
  while (span.end - s > maxChars) {
    const window = text.slice(s, s + maxChars)
    let cut = -1
    for (const re of [/[;:—–](?=\s)/g, /,(?=\s)/g, /\s/g]) {
      let m
      while ((m = re.exec(window))) if (m.index > maxChars * 0.4) cut = m.index + 1
      if (cut > 0) break
    }
    if (cut <= 0) cut = maxChars
    out.push({ start: s, end: s + cut })
    s += cut
    while (s < span.end && isSpace(text[s])) s++
  }
  if (span.end > s) out.push({ start: s, end: span.end })
  return out
}

const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }
export function romanToInt(r) {
  const s = r.toLowerCase()
  if (!/^[ivxlcdm]+$/.test(s)) return null
  let total = 0
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]], n = ROMAN[s[i + 1]] || 0
    total += v < n ? -v : v
  }
  return total > 0 && total < 400 ? total : null
}

function titleCaseRun(run) {
  return run.replace(/\p{L}[\p{L}'’]*/gu, w => w[0] + w.slice(1).toLowerCase())
}

/** Light, predictable text normalisation for the TTS engine. Display text is untouched. */
export function toSpoken(text, kind) {
  let s = text
    .replace(/\[\d{1,3}\]/g, '')          // bracketed footnote markers
    .replace(/\s*\n\s*/g, kind === 'heading' ? '. ' : ', ')
    .replace(/&/g, ' and ')
    .replace(/[_*#~|]+/g, ' ')
  // Runs of 2+ ALL-CAPS words (small-caps chapter openings) → sentence case.
  s = s.replace(/\b(\p{Lu}{2,}[’']?\p{Lu}*)(\s+\p{Lu}{2,}[’']?\p{Lu}*)+\b/gu, m => titleCaseRun(m))
  if (kind === 'heading') {
    s = s.replace(/^(chapter|part|book|act|section)\s+([ivxlcdm]+)\b\.?/i, (m, w, r) => {
      const n = romanToInt(r)
      return n ? `${w[0].toUpperCase()}${w.slice(1).toLowerCase()} ${n}` : m
    })
    const bare = s.trim().replace(/\.$/, '')
    const n = romanToInt(bare)
    if (n && bare.length <= 6) s = `Chapter ${n}`
    if (/^\p{Lu}[\p{Lu}\s’',-]+$/u.test(s.trim()) && s.trim().length > 3) s = titleCaseRun(s)
    if (!/[.!?…:]["”’)]*$/.test(s.trim())) s = s.trim() + '.'
  }
  return s.replace(/\s{2,}/g, ' ').trim()
}

/**
 * Segment a section's blocks.
 * @returns {Array<Segment>}
 */
export function segmentBlocks(blocks, { maxChars = DEFAULT_MAX_CHARS } = {}) {
  const segments = []
  for (const block of blocks) {
    if (block.type === 'break') {
      const last = segments[segments.length - 1]
      if (last) last.pauseAfterMs = Math.max(last.pauseAfterMs, PAUSES.sceneBreak)
      continue
    }
    const text = block.text
    const kind = block.type === 'heading' ? 'heading' : 'sentence'
    let spans = splitSentences(text).flatMap(sp => (sp.end - sp.start > maxChars ? splitLong(text, sp, maxChars) : [sp]))
    if (kind === 'heading') spans = spans.length ? [{ start: spans[0].start, end: spans[spans.length - 1].end }] : []
    // Pack consecutive short sentences into one segment: better prosody, fewer seams.
    const packed = []
    for (const sp of spans) {
      const prev = packed[packed.length - 1]
      if (prev && kind !== 'heading' && sp.end - prev.start <= maxChars && !text.slice(prev.end, sp.start).includes('\n')) {
        prev.end = sp.end
      } else {
        packed.push({ ...sp })
      }
    }
    packed.forEach((sp, n) => {
      const display = text.slice(sp.start, sp.end)
      const spoken = toSpoken(display, kind)
      if (!/[\p{L}\p{N}]/u.test(spoken)) return
      const isLast = n === packed.length - 1
      segments.push({
        id: `${block.id}.${n}`,
        blockId: block.id,
        start: sp.start,
        end: sp.end,
        text: display,
        spoken,
        kind: kind === 'heading' ? 'heading' : isLast ? 'paragraph' : 'sentence',
        pauseAfterMs: kind === 'heading' ? PAUSES.heading : isLast ? PAUSES.paragraph : PAUSES.sentence,
      })
    })
  }
  return segments
}
