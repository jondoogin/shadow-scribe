// ── Word tokens for follow-along timing ─────────────────────────────────────
// The segmenter owns both the displayed sentence and the text sent to the TTS
// engine, so it also owns the mapping between their words (docs/TRANSCRIPT.md §3).
//
// Word: { s, e, sp }
//   s/e — character offsets into the block's display text, widened to take in
//         touching punctuation (“Oh!” lights as one unit; a dash joins the
//         word before it)
//   sp  — what the engine is asked to say for it: '' for footnote markers,
//         'and' for '&', 'Chapter 4' for a bare roman heading, otherwise the
//         word itself without punctuation. The aligner verbalises numbers and
//         abbreviations on the Mac.
//
// A regex (not Intl.Segmenter) defines words, so offsets never depend on a
// browser's ICU version. Offsets are stored in packages, never recomputed.

import { romanToInt } from './segmenter.js'

export const WORDS_VERSION = 1

const WORD = /[\p{L}\p{M}\p{N}]+(?:['’.\-‑][\p{L}\p{M}\p{N}]+)*/gu
const HEADING_LEAD = /^(chapter|part|book|act|section)$/i
const isSpace = ch => ch === ' ' || ch === '\n' || ch === '\t' || ch === '\u00a0'

/**
 * Words of `text.slice(start, end)`, offsets relative to `text`.
 * @param {string} text   the block's display text
 * @param {'sentence'|'paragraph'|'heading'} kind
 */
export function segmentWords(text, start, end, kind = 'sentence') {
  const slice = text.slice(start, end)
  const raw = []
  for (const m of slice.matchAll(WORD)) raw.push({ s: start + m.index, e: start + m.index + m[0].length, w: m[0] })
  // An ampersand is spoken as a word (toSpoken turns every '&' into 'and').
  for (let i = start; i < end; i++) if (text[i] === '&') raw.push({ s: i, e: i + 1, w: '&' })
  raw.sort((a, b) => a.s - b.s)

  const words = raw.map((r, k) => {
    let sp = r.w === '&' ? 'and' : r.w
    if (/^\d{1,3}$/.test(r.w) && text[r.s - 1] === '[' && text[r.e] === ']') sp = '' // footnote marker
    if (kind === 'heading') {
      // Mirrors toSpoken: 'Chapter IV' → 'Chapter 4', a bare 'IV' → 'Chapter 4'.
      const n = romanToInt(r.w)
      if (n && k === 1 && HEADING_LEAD.test(raw[0].w)) sp = String(n)
      else if (n && raw.length === 1 && r.w.length <= 6) sp = `Chapter ${n}`
    }
    return { s: r.s, e: r.e, sp }
  })

  // Widen each word over touching punctuation, without overlapping its neighbours.
  for (let k = 0; k < words.length; k++) {
    const w = words[k]
    const prevEnd = k > 0 ? words[k - 1].e : start
    while (w.s > prevEnd && !isSpace(text[w.s - 1])) w.s--
    const nextStart = k + 1 < words.length ? words[k + 1].s : end
    while (w.e < nextStart && !isSpace(text[w.e])) w.e++
  }
  return words
}

// ── Device voice: the browser's own word boundaries ─────────────────────────
// Speech engines report `boundary` events with a character index into the text
// they were given (the segment's `spoken` form). Those are real positions, not
// estimates, so the Text view can light words from them.

/** Which word of `spoken` starts at or before `charIndex` (0-based), or -1. */
export function spokenOrdinalAt(spoken, charIndex) {
  let n = -1
  for (const m of (spoken || '').matchAll(WORD)) {
    if (m.index > charIndex) break
    n++
  }
  return n
}

/** For each word of the spoken form, the index of the display word it belongs to. */
export function spokenToDisplay(words) {
  const map = []
  words.forEach((w, k) => {
    const n = (w.sp || '').match(WORD)?.length || 0
    for (let i = 0; i < n; i++) map.push(k)
  })
  return map
}
