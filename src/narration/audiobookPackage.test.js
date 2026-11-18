import { describe, it, expect, beforeEach } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { openAudiobookPackage, validateManifest, audiobookIdFor, readZipDirectory } from './audiobookPackage.js'
import {
  saveAudiobook, listAudiobooks, getAudioBlob, deleteAudiobook, getAudiobook,
  saveContent, getContentMeta, getSectionBlocks, getFullContent, deleteContent, _setIndexedDBFactory,
} from '../content/contentRepository.js'
import { parseEpubContent } from '../utils/epubParser.js'
import { buildSampleEpub } from '../test/sampleEpub.js'
import { IDBFactory } from 'fake-indexeddb'

export function manifestFor(contentId = 'sha256:abc', overrides = {}) {
  return {
    format: 'lantern-audiobook',
    version: 1,
    book: { contentId, title: 'Pride and Prejudice', author: 'Jane Austen' },
    narration: { engine: 'kokoro', engineLabel: 'Kokoro-82M', voice: 'af_heart', speed: 1 },
    complete: true,
    totalDurationSec: 20,
    sections: [
      { id: 'ch1', title: 'Chapter I', file: 'audio/001-ch1.m4a', mime: 'audio/mp4', durationSec: 12,
        segments: [{ id: 'b0.0', blockId: 'b0', t0: 0.35, t1: 1.2 }, { id: 'b1.0', blockId: 'b1', t0: 2.2, t1: 9 }] },
      { id: 'ch2-3', title: 'Chapter II', file: 'audio/002-ch2-3.m4a', mime: 'audio/mp4', durationSec: 8,
        segments: [{ id: 'b0.0', blockId: 'b0', t0: 0.35, t1: 2 }] },
    ],
    ...overrides,
  }
}

function packageBlob(manifest, { level = 0, omit } = {}) {
  const files = { 'manifest.json': strToU8(JSON.stringify(manifest)) }
  for (const s of manifest.sections) if (s.file !== omit) files[s.file] = new Uint8Array(1000).fill(s.id.length)
  const zipped = zipSync(files, { level })
  return new Blob([zipped])
}

describe('.lantern-audio package', () => {
  it('reads the ZIP directory and slices stored audio without inflating', async () => {
    const blob = packageBlob(manifestFor())
    const entries = await readZipDirectory(blob)
    expect(entries.map(e => e.name)).toContain('audio/001-ch1.m4a')
    const pkg = await openAudiobookPackage(blob)
    const audio = await pkg.getBlob(pkg.manifest.sections[0])
    expect(audio.size).toBe(1000)
    expect(audio.type).toBe('audio/mp4')
    expect(new Uint8Array(await audio.arrayBuffer())[0]).toBe(3)
  })

  it('also accepts a deflated package (e.g. re-zipped by Finder)', async () => {
    const pkg = await openAudiobookPackage(packageBlob(manifestFor(), { level: 6 }))
    expect((await pkg.getBlob(pkg.manifest.sections[1])).size).toBe(1000)
  })

  it('rejects missing audio, bad manifests and non-zips with readable errors', async () => {
    await expect(openAudiobookPackage(packageBlob(manifestFor(), { omit: 'audio/002-ch2-3.m4a' }))).rejects.toThrow(/missing/)
    await expect(openAudiobookPackage(new Blob(['not a zip']))).rejects.toThrow(/not a Lantern narration package/)
    expect(validateManifest({ format: 'other' })).toEqual(['Not a Lantern narration package.'])
    const bad = manifestFor()
    bad.sections[0].segments = [{ t0: 5, t1: 6 }, { t0: 1, t1: 2 }]
    expect(validateManifest(bad).join()).toMatch(/out-of-order/)
    expect(validateManifest(manifestFor('sha256:x', { version: 99 })).join()).toMatch(/newer/)
  })

  it('derives a stable id so re-importing the same narration replaces it', () => {
    expect(audiobookIdFor(manifestFor())).toBe(audiobookIdFor(manifestFor()))
    expect(audiobookIdFor(manifestFor())).not.toBe(audiobookIdFor(manifestFor('sha256:other')))
  })
})

describe('content repository (IndexedDB)', () => {
  beforeEach(() => _setIndexedDBFactory(() => new IDBFactory()))

  it('persists book content outside localStorage and reads it back by section', async () => {
    const content = await parseEpubContent(buildSampleEpub())
    await saveContent(content)
    const meta = await getContentMeta(content.contentId)
    expect(meta.title).toBe('Pride and Prejudice')
    expect(meta.sections[2]).not.toHaveProperty('blocks')
    expect(meta.sections[2].blockCount).toBe(content.sections[2].blocks.length)
    expect(await getSectionBlocks(content.contentId, 'ch1')).toEqual(content.sections[2].blocks)
    const full = await getFullContent(content.contentId)
    expect(full.sections.map(s => s.blocks.length)).toEqual(content.sections.map(s => s.blocks.length))
    expect(globalThis.localStorage?.getItem?.('shadowscribe_books') ?? null).toBeNull()
  })

  it('imports audio chapter by chapter and cascades deletes', async () => {
    const m = manifestFor()
    const progress = []
    await saveAudiobook('ab1', m, s => Promise.resolve(new Blob([s.id])), p => progress.push(p.done))
    expect(progress).toEqual([1, 2])
    expect((await listAudiobooks('sha256:abc')).map(a => a.id)).toEqual(['ab1'])
    expect(await (await getAudioBlob('ab1', 'ch2-3')).text()).toBe('ch2-3')
    await saveContent({ contentId: 'sha256:abc', title: 't', sections: [{ id: 'ch1', blocks: [] }] })
    await deleteContent('sha256:abc')
    expect(await listAudiobooks('sha256:abc')).toEqual([])
    expect(await getAudioBlob('ab1', 'ch1')).toBeNull()
    expect(await getContentMeta('sha256:abc')).toBeNull()
  })

  it('rolls back a failed import so no half-imported narration appears', async () => {
    const m = manifestFor()
    await expect(saveAudiobook('ab2', m, s => s.id === 'ch2-3' ? Promise.reject(new Error('disk')) : Promise.resolve(new Blob(['x']))))
      .rejects.toThrow('disk')
    expect(await getAudiobook('ab2')).toBeNull()
    expect(await getAudioBlob('ab2', 'ch1')).toBeNull()
  })

  it('deleting one narration leaves others intact', async () => {
    await saveAudiobook('a', manifestFor(), () => Promise.resolve(new Blob(['a'])))
    await saveAudiobook('b', manifestFor(), () => Promise.resolve(new Blob(['b'])))
    await deleteAudiobook('a')
    expect((await listAudiobooks('sha256:abc')).map(x => x.id)).toEqual(['b'])
    expect(await (await getAudioBlob('b', 'ch1')).text()).toBe('b')
  })
})

describe('word timings', () => {
  const sidecar = segments => ({ format: 'lantern-word-timings', version: 1, wordsVersion: 1, aligner: 'x', segments })
  const section = manifestFor().sections[0] // b0.0 0.35–1.2 s, b1.0 2.2–9 s

  it('keeps well-formed segments and drops ones that do not fit their sentence', async () => {
    const { parseWordTimings } = await import('./audiobookPackage.js')
    const parsed = parseWordTimings(sidecar({
      'b0.0': [[0, 7, 350, 700], [8, 9, 700, 1150]],
      'b1.0': [[0, 2, 9000, 9100], [3, 5, 2300, 2400]], // out of order
      'zz.9': [[0, 1, 1, 2]],                            // unknown segment
    }), section)
    expect(Object.keys(parsed)).toEqual(['b0.0'])
    expect(parseWordTimings({ format: 'other' }, section)).toBeNull()
    expect(parseWordTimings(sidecar({ 'b1.0': [[0, 2, 'x', 3]] }), section)).toBeNull()
  })

  it('imports a package sidecar onto the audio record, and a broken one costs only that chapter', async () => {
    _setIndexedDBFactory(() => new IDBFactory())
    const m = manifestFor()
    m.sections[0].wordTimings = 'timings/ch1.words.json'
    m.sections[1].wordTimings = 'timings/ch2-3.words.json'
    const files = { 'manifest.json': strToU8(JSON.stringify(m)) }
    for (const s of m.sections) files[s.file] = new Uint8Array(10)
    files['timings/ch1.words.json'] = strToU8(JSON.stringify(sidecar({ 'b1.0': [[0, 2, 2200, 2500], [3, 6, 2500, 2900]] })))
    files['timings/ch2-3.words.json'] = strToU8('{not json')
    const pkg = await openAudiobookPackage(new Blob([zipSync(files, { level: 0 })]))
    await saveAudiobook(pkg.id, pkg.manifest, pkg.getBlob, null, pkg.getWordTimings)
    const { getWordTimings } = await import('../content/contentRepository.js')
    expect(await getWordTimings(pkg.id, 'ch1')).toEqual({ 'b1.0': [[0, 2, 2200, 2500], [3, 6, 2500, 2900]] })
    expect(await getWordTimings(pkg.id, 'ch2-3')).toBeNull()
    expect(await getAudioBlob(pkg.id, 'ch2-3')).toBeTruthy()
  })
})
