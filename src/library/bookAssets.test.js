import { describe, it, expect } from 'vitest'
import { buildAssetOptions, sameWork, pickDeviceVoices, preferredOption } from './bookAssets.js'

const book = { id: 'b1', title: 'The Lamp at Gull Point', contentId: 'sha256:aaa' }
const audio = (id, voice, style = '', contentId = 'sha256:aaa') => ({
  id, contentId, totalBytes: 5e6,
  manifest: { book: { contentId, title: 'The Lamp at Gull Point' }, totalDurationSec: 600, narration: { voice, style, engine: 'qwen3-1.7b' } },
})
const item = (kind, naturalId, extra = {}, contentId = 'sha256:aaa') => ({
  id: `it-${naturalId}`, kind, contentId, status: 'ready', bytes: 4e6,
  meta: { naturalId, title: 'The Lamp at Gull Point', ...extra },
})

describe('buildAssetOptions', () => {
  it('merges device and library narrators in the curated order, without duplicates', () => {
    const { narrators } = buildAssetOptions(book,
      [audio('a-walter', 'Walter')],
      [],
      [item('audio', 'a-walter', { voice: 'Walter' }), item('audio', 'a-aiden', { voice: 'Aiden', style: 'warm, unhurried audiobook narration' }), item('audio', 'a-zed', { voice: 'Zed' })])
    expect(narrators.map(n => n.id)).toEqual(['a-aiden', 'a-walter', 'a-zed'])
    expect(narrators.find(n => n.id === 'a-walter')).toMatchObject({ onDevice: true, label: 'Walter' })
    expect(narrators.find(n => n.id === 'a-walter').item).toBeTruthy()
    expect(narrators.find(n => n.id === 'a-aiden')).toMatchObject({ onDevice: false, label: 'Aiden' })
  })

  it('adds the style only when two narrations share a voice', () => {
    const { narrators } = buildAssetOptions(book, [audio('x', 'Aiden'), audio('y', 'Aiden', 'warm, unhurried')], [], [])
    expect(narrators.map(n => n.label)).toEqual(['Aiden', 'Aiden (warm)'])
  })

  it('offers assets made from another copy of the same book (no edition error)', () => {
    const { narrators, paintings, epubs } = buildAssetOptions(book, [], [], [
      item('epub', 'sha256:bbb', {}, 'sha256:bbb'),
      item('audio', 'n1', { voice: 'Margaret' }, 'sha256:bbb'),
      item('visuals', 'v1', { preset: 'ink-and-wash', count: 24 }, 'sha256:bbb'),
      item('visuals', 'v2', { label: '24 paintings · ink-and-gouache' }, 'sha256:bbb'),
    ])
    expect(narrators[0]).toMatchObject({ id: 'n1', contentId: 'sha256:bbb' })
    expect(paintings.map(p => p.label)).toEqual(['Ink and gouache', 'Ink and wash'])
    expect(epubs.get('sha256:bbb')).toBeTruthy()
  })

  it('ignores other books and unfinished uploads', () => {
    const other = { ...item('audio', 'z', { voice: 'Aiden' }, 'sha256:zzz'), meta: { naturalId: 'z', title: 'Another Book' } }
    const { narrators } = buildAssetOptions(book, [], [], [other, { ...item('audio', 'u'), status: 'uploading' }])
    expect(narrators).toEqual([])
  })
})

describe('helpers', () => {
  it('sameWork matches by EPUB or by title', () => {
    expect(sameWork(book, 'sha256:aaa', 'x')).toBe(true)
    expect(sameWork(book, 'sha256:b', 'the lamp at gull-point')).toBe(true)
    expect(sameWork(book, 'sha256:b', 'Other')).toBe(false)
  })
  it('preferredOption falls back to the first', () => {
    expect(preferredOption([{ id: 'a' }, { id: 'b' }], 'b').id).toBe('b')
    expect(preferredOption([{ id: 'a' }], 'missing').id).toBe('a')
    expect(preferredOption([], 'x')).toBe(null)
  })
  it('pickDeviceVoices keeps a few good English voices', () => {
    const vs = [
      { name: 'Albert', lang: 'en-US', localService: true },
      { name: 'Ava (Premium)', lang: 'en-US', localService: true },
      { name: 'Ava (Enhanced)', lang: 'en-US', localService: true },
      { name: 'Thomas', lang: 'fr-FR', localService: true },
      { name: 'Daniel', lang: 'en-GB', localService: true },
      { name: 'Google UK', lang: 'en-GB', localService: false },
      { name: 'Fred', lang: 'en-US', localService: true },
    ]
    const picked = pickDeviceVoices(vs)
    expect(picked).toHaveLength(4)
    expect(picked[0].name).toBe('Ava (Premium)')
    expect(picked.some(v => v.lang.startsWith('fr'))).toBe(false)
  })
})
