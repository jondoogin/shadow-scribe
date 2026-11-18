import { describe, it, expect } from 'vitest'
import { segmentWords, WORDS_VERSION } from './words.js'
import { segmentBlocks, toSpoken } from './segmenter.js'
import { buildNarrationScript } from './narrationScript.js'
import { parseEpubContent } from '../utils/epubParser.js'
import { buildSampleEpub } from '../test/sampleEpub.js'

const shown = (t, ws) => ws.map(w => t.slice(w.s, w.e))
const said = ws => ws.map(w => w.sp).filter(Boolean).join(' ')

describe('word tokens', () => {
  it('widens words over touching punctuation and quotes', () => {
    const t = '“Oh! Mr. Bennet, you are over-scrupulous.”'
    const ws = segmentWords(t, 0, t.length)
    expect(shown(t, ws)).toEqual(['“Oh!', 'Mr.', 'Bennet,', 'you', 'are', 'over-scrupulous.”'])
    expect(ws.map(w => w.sp)).toEqual(['Oh', 'Mr', 'Bennet', 'you', 'are', 'over-scrupulous'])
  })

  it('keeps contractions, decimals and initials together', () => {
    const t = 'I’m sure it’s 3.14, said J.R.R. Tolkien.'
    expect(shown(t, segmentWords(t, 0, t.length))).toEqual(['I’m', 'sure', 'it’s', '3.14,', 'said', 'J.R.R.', 'Tolkien.'])
  })

  it('joins a dash to the word before it and never overlaps', () => {
    const t = 'He paused—then went on — slowly.'
    const ws = segmentWords(t, 0, t.length)
    expect(shown(t, ws)).toEqual(['He', 'paused—', 'then', 'went', 'on', 'slowly.'])
    for (let k = 1; k < ws.length; k++) expect(ws[k].s).toBeGreaterThanOrEqual(ws[k - 1].e)
  })

  it('offsets are relative to the block, within the segment', () => {
    const t = 'First sentence. Second one here.'
    const ws = segmentWords(t, 16, t.length)
    expect(ws[0]).toMatchObject({ s: 16, sp: 'Second' })
    expect(ws[ws.length - 1].e).toBe(t.length)
  })

  it('matches what the engine is asked to say', () => {
    const t = 'IT WAS a dark night[12] & cold.'
    const ws = segmentWords(t, 0, t.length)
    expect(said(ws).toLowerCase()).toBe(toSpoken(t, 'sentence').replace(/[.,]/g, '').toLowerCase())
    expect(ws.find(w => w.sp === '')).toBeTruthy() // the footnote marker is shown but not spoken
  })

  it('speaks roman numerals in headings the way toSpoken does', () => {
    const a = 'CHAPTER IV'
    expect(said(segmentWords(a, 0, a.length, 'heading'))).toBe('CHAPTER 4')
    const b = 'XII'
    expect(said(segmentWords(b, 0, b.length, 'heading'))).toBe('Chapter 12')
    const c = 'I Remember'
    expect(said(segmentWords(c, 0, c.length, 'heading'))).toBe('I Remember')
  })

  it('every segment of a book gets words that cover its text', async () => {
    const content = await parseEpubContent(await buildSampleEpub())
    const script = buildNarrationScript(content)
    expect(script.book.wordsVersion).toBe(WORDS_VERSION)
    for (const s of script.sections) {
      const blocks = new Map(content.sections.find(x => x.id === s.id).blocks.map(b => [b.id, b.text]))
      for (const g of s.segments) {
        expect(g.words.length).toBeGreaterThan(0)
        for (const w of g.words) {
          expect(w.s).toBeGreaterThanOrEqual(g.start)
          expect(w.e).toBeLessThanOrEqual(g.end)
        }
        expect(blocks.get(g.blockId).slice(g.words[0].s, g.words.at(-1).e).trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('does not change the segments themselves', () => {
    const blocks = [{ id: 'b0', type: 'p', text: 'One. Two.' }]
    const plain = segmentBlocks(blocks)
    expect(plain[0].words).toBeUndefined()
  })
})

describe('device voice word boundaries', () => {
  it('maps a boundary in the spoken form back to the word on screen', async () => {
    const { spokenOrdinalAt, spokenToDisplay } = await import('./words.js')
    const t = 'IT WAS a dark night[12] & cold.'
    const spoken = toSpoken(t, 'sentence') // 'It Was a dark night and cold.'
    const ws = segmentWords(t, 0, t.length)
    const map = spokenToDisplay(ws)
    const at = word => map[spokenOrdinalAt(spoken, spoken.indexOf(word))]
    expect(t.slice(ws[at('dark')].s, ws[at('dark')].e)).toBe('dark')
    expect(t.slice(ws[at('and')].s, ws[at('and')].e)).toBe('&')
    expect(t.slice(ws[at('cold')].s, ws[at('cold')].e)).toBe('cold.')
    expect(spokenOrdinalAt(spoken, 0)).toBe(0)
  })

  it('handles headings whose spoken form has more words', async () => {
    const { spokenOrdinalAt, spokenToDisplay } = await import('./words.js')
    const t = 'XII'
    const spoken = toSpoken(t, 'heading') // 'Chapter 12.'
    const map = spokenToDisplay(segmentWords(t, 0, t.length, 'heading'))
    expect(map[spokenOrdinalAt(spoken, spoken.indexOf('12'))]).toBe(0)
  })
})
