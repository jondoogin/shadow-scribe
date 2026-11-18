import { describe, it, expect } from 'vitest'
import { splitSentences, segmentBlocks, toSpoken, romanToInt, PAUSES } from './segmenter.js'
import { buildNarrationScript, scriptStats } from './narrationScript.js'
import { parseEpubContent } from '../utils/epubParser.js'
import { buildSampleEpub } from '../test/sampleEpub.js'

const sentences = t => splitSentences(t).map(s => t.slice(s.start, s.end))

describe('sentence splitting', () => {
  it('splits ordinary sentences', () => {
    expect(sentences('One. Two! Three? Four…')).toEqual(['One.', 'Two!', 'Three?', 'Four…'])
  })

  it('does not split on honorifics, initials or decimals', () => {
    expect(sentences('Mr. Bennet met Dr. Jones and J. R. R. Tolkien. Pi is 3.14 today.'))
      .toEqual(['Mr. Bennet met Dr. Jones and J. R. R. Tolkien.', 'Pi is 3.14 today.'])
  })

  it('keeps dialogue speech tags with their quotation', () => {
    expect(sentences('“Is he married?” she asked. “Bingley!” cried his wife. He nodded.'))
      .toEqual(['“Is he married?” she asked.', '“Bingley!” cried his wife.', 'He nodded.'])
  })

  it('treats newlines as hard boundaries', () => {
    expect(sentences('Line one\nLine two')).toEqual(['Line one', 'Line two'])
  })

  it('handles empty and whitespace-only text', () => {
    expect(splitSentences('')).toEqual([])
    expect(splitSentences('   ')).toEqual([])
  })
})

describe('segments', () => {
  const blocks = [
    { id: 'b0', type: 'heading', text: 'CHAPTER IV' },
    { id: 'b1', type: 'p', text: 'Short. Also short. ' + 'A much longer sentence that keeps going, and going; with clauses — many of them, '.repeat(6) + 'until it ends.' },
    { id: 'b2', type: 'break', text: '' },
    { id: 'b3', type: 'p', text: '“Is he married or single?”' },
  ]
  const segs = segmentBlocks(blocks, { maxChars: 200 })

  it('never skips or duplicates text: segments tile each block in order', () => {
    for (const b of blocks.filter(x => x.type !== 'break')) {
      const mine = segs.filter(s => s.blockId === b.id)
      const joined = mine.map(s => b.text.slice(s.start, s.end)).join(' ').replace(/\s+/g, ' ')
      expect(joined).toBe(b.text.replace(/\s+/g, ' ').trim())
      for (let i = 1; i < mine.length; i++) expect(mine[i].start).toBeGreaterThanOrEqual(mine[i - 1].end)
    }
    expect(new Set(segs.map(s => s.id)).size).toBe(segs.length)
  })

  it('respects the maximum segment length and splits long sentences at clause boundaries', () => {
    for (const s of segs) expect(s.end - s.start).toBeLessThanOrEqual(200)
    const long = segs.filter(s => s.blockId === 'b1')
    expect(long.length).toBeGreaterThan(2)
    expect(long[0].text.startsWith('Short. Also short.')).toBe(true) // short sentences packed together
  })

  it('normalises headings for speech without touching display text', () => {
    expect(segs[0].text).toBe('CHAPTER IV')
    expect(segs[0].spoken).toBe('Chapter 4.')
    expect(segs[0].pauseAfterMs).toBe(PAUSES.heading)
  })

  it('turns scene breaks into a longer pause on the preceding segment', () => {
    const lastOfB1 = segs.filter(s => s.blockId === 'b1').at(-1)
    expect(lastOfB1.pauseAfterMs).toBe(PAUSES.sceneBreak)
    expect(segs.at(-1).kind).toBe('paragraph')
  })

  it('toSpoken handles small caps openings, footnote markers and ampersands', () => {
    expect(toSpoken('IT WAS a dark night[12] & cold.', 'sentence')).toBe('It Was a dark night and cold.')
    expect(romanToInt('XIV')).toBe(14)
    expect(romanToInt('hello')).toBeNull()
  })
})

describe('narration script', () => {
  it('is built from the EPUB content with matching ids and only narrative sections enabled', async () => {
    const content = await parseEpubContent(buildSampleEpub())
    const script = buildNarrationScript(content)
    expect(script.format).toBe('lantern-narration-script')
    expect(script.book.contentId).toBe(content.contentId)
    expect(script.sections.filter(s => s.narrate).map(s => s.id)).toEqual(['ch1', 'ch2-3'])
    const ch1 = script.sections.find(s => s.id === 'ch1')
    const blockIds = new Set(content.sections.find(s => s.id === 'ch1').blocks.map(b => b.id))
    for (const seg of ch1.segments) expect(blockIds.has(seg.blockId)).toBe(true)
    const st = scriptStats(script)
    expect(st.narratedSections).toBe(2)
    expect(st.estimatedSeconds).toBeGreaterThan(30)
    const all = buildNarrationScript(content, { includeAll: true })
    expect(all.sections.filter(s => s.narrate).length).toBe(4) // cover has no text blocks
  })
})
