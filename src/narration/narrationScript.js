// ── Narration script ─────────────────────────────────────────────────────────
// The hand-off document between Lantern and the local Mac generator
// (tools/narrator). It carries everything the generator needs and nothing it
// should re-derive: section order, segment ids, offsets and spoken text.

import { segmentBlocks, SEGMENTER_VERSION } from './segmenter.js'

export const SCRIPT_FORMAT = 'lantern-narration-script'
export const SCRIPT_VERSION = 1

export function buildNarrationScript(content, { includeAll = false, maxChars } = {}) {
  return {
    format: SCRIPT_FORMAT,
    version: SCRIPT_VERSION,
    createdAt: new Date().toISOString(),
    book: {
      contentId: content.contentId,
      title: content.title,
      author: content.author,
      language: content.language,
      parserVersion: content.parserVersion,
      segmenterVersion: SEGMENTER_VERSION,
    },
    sections: content.sections.map(s => ({
      id: s.id,
      order: s.order,
      title: s.title,
      narrate: includeAll ? s.blocks.length > 0 : s.narrate,
      skipReason: includeAll ? null : s.skipReason,
      chapterNums: s.chapterNums || [],
      anchors: s.anchors || [],
      segments: segmentBlocks(s.blocks, { maxChars }),
    })),
  }
}

export function scriptStats(script) {
  const narrated = script.sections.filter(s => s.narrate && s.segments.length)
  const chars = narrated.reduce((n, s) => n + s.segments.reduce((m, g) => m + g.spoken.length, 0), 0)
  return {
    sections: script.sections.length,
    narratedSections: narrated.length,
    segments: narrated.reduce((n, s) => n + s.segments.length, 0),
    chars,
    // ~15 spoken characters per second is a typical audiobook pace; an estimate only.
    estimatedSeconds: Math.round(chars / 15),
  }
}
