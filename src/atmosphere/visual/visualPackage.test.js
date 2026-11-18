import { describe, it, expect, beforeEach } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { IDBFactory } from 'fake-indexeddb'
import { openVisualPackage, validateVisualManifest, imagePathMime, holdToSectionEnd } from './visualPackage.js'
import { importVisualPackage } from './visualImport.js'
import { isEligible } from './eligibility.js'
import {
  _setIndexedDBFactory, listVisualSets, getVisualImage, deleteVisualSet, deleteContent, saveContent,
  CONTENT_DB_NAME,
} from '../../content/contentRepository.js'

const CID = 'sha256:' + 'ab'.repeat(32)

function image(n, va, extra = {}) {
  return {
    id: `img-${String(n).padStart(4, '0')}`, sceneId: `s${n}`,
    sourceWindow: { fromSection: va.sectionId, from: 'b1.0', to: va.segmentId },
    visibleAfter: va,
    file: `images/i${n}.webp`, strokes: `strokes/i${n}.webp`, thumb: `thumbs/i${n}.webp`,
    width: 1600, height: 1000, focus: { x: 0.4, y: 0.5 },
    descriptor: { setting: 'harbour', timeOfDay: 'evening', mood: 'calm', secret: 'ignored' },
    prompt: 'A soft gouache painting',
    ...extra,
  }
}

function manifest(overrides = {}) {
  return {
    format: 'lantern-visuals', version: 1, complete: true,
    book: { contentId: CID, title: 'Test', parserVersion: 1 },
    generator: { model: 'fixture' },
    style: { id: 'gouache-v1', preset: 'gouache' },
    images: [
      image(1, { sectionId: 'ch1', blockId: 'b3', segmentId: 'b3.0' }),
      image(2, { sectionId: 'ch2', blockId: 'b4', segmentId: 'b4.1' }),
    ],
    ...overrides,
  }
}

function pkg(m = manifest(), { omit, big } = {}) {
  const files = { 'manifest.json': strToU8(JSON.stringify(m)) }
  for (const img of m.images) {
    for (const p of [img.file, img.strokes, img.thumb]) {
      if (p && p !== omit) files[p] = big === p ? new Uint8Array(3 * 1024 * 1024 + 1) : strToU8(`fake ${p}`)
    }
  }
  return new Blob([zipSync(files, { level: 0 })])
}

const BOOK = { contentId: CID, parserVersion: 1, sectionIds: ['ch1', 'ch2'] }
const ORDER = ['ch1', 'ch2']

beforeEach(() => _setIndexedDBFactory(() => new IDBFactory()))

describe('validateVisualManifest', () => {
  it('accepts a good manifest and keeps only known descriptor fields', () => {
    const { errors, images } = validateVisualManifest(manifest())
    expect(errors).toEqual([])
    expect(images).toHaveLength(2)
    expect(images[0].descriptor).toEqual({ setting: 'harbour', timeOfDay: 'evening', mood: 'calm' })
  })

  it('refuses a painting that could show before its window ends', () => {
    const m = manifest()
    m.images[0].sourceWindow.to = 'b5.0'
    expect(validateVisualManifest(m).errors[0]).toMatch(/before its text is read/)
  })

  it('refuses unsafe paths, SVG and bad locators', () => {
    expect(imagePathMime('images/../../x.webp', 'images')).toBe(null)
    expect(imagePathMime('/images/x.webp', 'images')).toBe(null)
    expect(imagePathMime('images/x.svg', 'images')).toBe(null)
    expect(imagePathMime('thumbs/x.webp', 'images')).toBe(null)
    expect(imagePathMime('images/x.webp', 'images')).toBe('image/webp')
    const m = manifest()
    m.images[1].visibleAfter = { sectionId: 'ch2', blockId: 'b4', segmentId: 'b5.0' }
    expect(validateVisualManifest(m).errors[0]).toMatch(/visible after/)
  })

  it('enforces the image count limit', () => {
    const m = manifest({ images: Array.from({ length: 2001 }, (_, i) => image(i + 1, { sectionId: 'ch1', blockId: 'b1', segmentId: 'b1.0' })) })
    expect(validateVisualManifest(m).errors.some(e => /limit is 2000/.test(e))).toBe(true)
  })
})

describe('openVisualPackage', () => {
  it('opens a STORED package', async () => {
    const p = await openVisualPackage(pkg(), BOOK)
    expect(p.images.map(i => i.id)).toEqual(['img-0001', 'img-0002'])
    expect(p.warnings).toEqual([])
    expect(await (await p.getBlob('images/i1.webp')).text()).toBe('fake images/i1.webp')
  })

  it('refuses another edition, missing files and oversized images', async () => {
    await expect(openVisualPackage(pkg(), { ...BOOK, contentId: 'sha256:other' })).rejects.toThrow(/different edition/)
    await expect(openVisualPackage(pkg(manifest(), { omit: 'strokes/i2.webp' }), BOOK)).rejects.toThrow(/missing/)
    await expect(openVisualPackage(pkg(manifest(), { big: 'images/i1.webp' }), BOOK)).rejects.toThrow(/larger than 3 MB/)
    await expect(openVisualPackage(new Blob(['not a zip']), BOOK)).rejects.toThrow(/not a Lantern paintings package/)
  })

  it('drops paintings for chapters the book does not have', async () => {
    const p = await openVisualPackage(pkg(), { ...BOOK, sectionIds: ['ch1'] })
    expect(p.images.map(i => i.id)).toEqual(['img-0001'])
    expect(p.warnings[0]).toMatch(/left out/)
  })

  it('holds every painting to the end of its chapter when the parser changed', async () => {
    const p = await openVisualPackage(pkg(), { ...BOOK, parserVersion: 2 })
    expect(p.warnings.join(' ')).toMatch(/finish its chapter/)
    const img = p.images[0]
    expect(isEligible(img, { sectionId: 'ch1', blockId: 'b500', segmentId: 'b500.9' }, ORDER)).toBe(false)
    expect(isEligible(img, { sectionId: 'ch2', blockId: 'b0' }, ORDER)).toBe(true)
    expect(holdToSectionEnd([img])[0].heldToSectionEnd).toBe(true)
  })
})

describe('storage (lantern_content v2)', () => {
  it('imports, lists, reads and removes a set', async () => {
    const meta = { parserVersion: 1, sections: [{ id: 'ch1' }, { id: 'ch2' }] }
    const r = await importVisualPackage(pkg(), { contentId: CID }, meta)
    expect(r.count).toBe(2)
    const sets = await listVisualSets(CID)
    expect(sets).toHaveLength(1)
    expect(sets[0].images[1].visibleAfter.segmentId).toBe('b4.1')
    const row = await getVisualImage(r.id, 'img-0002')
    expect(await row.blob.text()).toBe('fake images/i2.webp')
    expect(await row.strokes.text()).toBe('fake strokes/i2.webp')
    // Re-import replaces rather than duplicates.
    await importVisualPackage(pkg(), { contentId: CID }, meta)
    expect(await listVisualSets(CID)).toHaveLength(1)
    await deleteVisualSet(r.id)
    expect(await listVisualSets(CID)).toHaveLength(0)
    expect(await getVisualImage(r.id, 'img-0002')).toBe(null)
  })

  it('removing a book’s text removes its paintings', async () => {
    await saveContent({ contentId: CID, title: 'T', sections: [{ id: 'ch1', blocks: [] }] })
    await importVisualPackage(pkg(), { contentId: CID }, null)
    await deleteContent(CID)
    expect(await listVisualSets(CID)).toHaveLength(0)
  })

  it('refuses when the book has no linked text', async () => {
    await expect(importVisualPackage(pkg(), { contentId: null }, null)).rejects.toThrow(/Link this book/)
  })

  it('upgrades a v1 database without losing it', async () => {
    const idb = new IDBFactory()
    await new Promise((resolve, reject) => {
      const open = idb.open(CONTENT_DB_NAME, 1)
      open.onupgradeneeded = () => {
        open.result.createObjectStore('contents', { keyPath: 'contentId' })
          .put({ contentId: 'sha256:old', title: 'Old book', sections: [] })
      }
      open.onsuccess = () => { open.result.close(); resolve() }
      open.onerror = () => reject(open.error)
    })
    _setIndexedDBFactory(() => idb)
    const { getContentMeta } = await import('../../content/contentRepository.js')
    expect((await getContentMeta('sha256:old')).title).toBe('Old book')
    expect(await listVisualSets()).toEqual([])
  })
})
