import { describe, it, expect } from 'vitest'
import { parseEpubContent } from '../utils/epubParser.js'
import { buildSampleEpub, CHAPTER_1, CHAPTER_2, CHAPTER_3 } from '../test/sampleEpub.js'
import { buildTextContent, extractBlocks, normalizeText, PARSER_VERSION } from './epubContent.js'

const parse = opts => parseEpubContent(buildSampleEpub(opts))
const allText = c => c.sections.flatMap(s => s.blocks.map(b => b.text)).join('\n')

describe('EPUB content extraction', () => {
  it('reads metadata and a stable SHA-256 content id', async () => {
    const a = await parse()
    const b = await parse()
    expect(a.title).toBe('Pride and Prejudice')
    expect(a.author).toBe('Jane Austen')
    expect(a.parserVersion).toBe(PARSER_VERSION)
    expect(a.contentId).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(b.contentId).toBe(a.contentId)
  })

  it('keeps canonical spine order, including front matter and non-linear items', async () => {
    const c = await parse()
    expect(c.sections.map(s => s.id)).toEqual(['cover', 'copyright', 'ch1', 'ch2-3', 'notes'])
    expect(c.sections.map(s => s.order)).toEqual([0, 1, 2, 3, 4])
  })

  it('marks only narrative sections for narration', async () => {
    const c = await parse()
    const flags = Object.fromEntries(c.sections.map(s => [s.id, [s.narrate, s.skipReason]]))
    expect(flags.cover).toEqual([false, 'front-or-back-matter'])
    expect(flags.copyright).toEqual([false, 'front-or-back-matter'])
    expect(flags.ch1).toEqual([true, null])
    expect(flags['ch2-3']).toEqual([true, null])
    expect(flags.notes).toEqual([false, 'nonlinear'])
  })

  it('extracts every paragraph of chapter text in order, without truncation', async () => {
    const c = await parse()
    const ch1 = c.sections.find(s => s.id === 'ch1').blocks.filter(b => b.type === 'p').map(b => b.text)
    expect(ch1.slice(0, CHAPTER_1.length)).toEqual(CHAPTER_1)
    const ch23 = c.sections.find(s => s.id === 'ch2-3').blocks.filter(b => b.type === 'p').map(b => b.text)
    expect(ch23).toEqual([...CHAPTER_2, ...CHAPTER_3])
  })

  it('drops scripts, styles, footnote refs, footnotes and page breaks; never keeps HTML', async () => {
    const c = await parse()
    const text = allText(c)
    expect(text).not.toMatch(/alert\(1\)|p\{margin|evil|onclick|<\w+/)
    expect(text).not.toContain('footnote that should not be narrated')
    expect(c.sections.find(s => s.id === 'ch1').blocks[1].text.endsWith('wife.')).toBe(true) // noteref "1" removed
    for (const s of c.sections) for (const b of s.blocks) expect(Object.keys(b).sort()).toEqual(['id', 'text', 'type'])
  })

  it('maps TOC fragments and companion chapters to block anchors', async () => {
    const c = await parse()
    const s = c.sections.find(x => x.id === 'ch2-3')
    expect(s.chapterNums).toEqual([2, 3])
    const ch3 = s.anchors.find(a => a.chapterNum === 3)
    expect(s.blocks.find(b => b.id === ch3.blockId).text).toBe('CHAPTER III')
    expect(s.title).toBe('Chapter II')
  })

  it('keeps line breaks and turns decorative scene breaks into break blocks', async () => {
    const c = await parse()
    const blocks = c.sections.find(s => s.id === 'ch1').blocks
    expect(blocks.some(b => b.type === 'break')).toBe(true)
    expect(blocks.find(b => b.text.startsWith('Line one')).text).toBe('Line one\nLine two')
    expect(blocks.map(b => b.id)).toEqual(blocks.map((_, i) => `b${i}`))
  })

  it('refuses DRM-encrypted text but accepts obfuscated fonts', async () => {
    await expect(parse({ encryptText: true })).rejects.toThrow(/DRM/)
    const ok = await parse({ obfuscatedFont: true })
    expect(ok.sections.length).toBe(5)
  })

  it('rejects non-EPUB data with a clear message', async () => {
    await expect(parseEpubContent(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(/corrupted or DRM/)
  })
})

describe('block extraction details', () => {
  const doc = html => new DOMParser().parseFromString(`<html><body>${html}</body></html>`, 'text/html')

  it('treats inline text between blocks as its own paragraph and normalises whitespace', () => {
    const { blocks } = extractBlocks(doc('<div>Loose  text here<p>Para</p>tail</div>'))
    expect(blocks.map(b => b.text)).toEqual(['Loose text here', 'Para', 'tail'])
  })

  it('skips hidden content and maps nested anchor ids to their block', () => {
    const { blocks, anchors } = extractBlocks(doc('<p style="display:none">secret</p><p><a id="x"></a>Visible</p>'))
    expect(blocks.map(b => b.text)).toEqual(['Visible'])
    expect(anchors.get('x')).toBe('b0')
  })

  it('normalizeText strips zero-width characters and soft hyphens', () => {
    expect(normalizeText('ex­tra​ordinary ')).toBe('extraordinary')
  })

  it('builds sections from plain text', () => {
    const c = buildTextContent('Chapter 1\n\nHello there.\n\nChapter 2\n\nAgain.', { contentId: 'x' })
    expect(c.sections.map(s => s.title)).toEqual(['Chapter 1', 'Chapter 2'])
    expect(c.sections[0].blocks.map(b => b.type)).toEqual(['heading', 'p'])
  })
})
