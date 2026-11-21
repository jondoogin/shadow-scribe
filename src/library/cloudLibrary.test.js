/* global Buffer */
import { describe, it, expect } from 'vitest'
import { memoryLibraryBackend } from './libraryBackend.js'
import {
  createLibrary, unlockLibrary, libraryState, uploadToLibrary, downloadFromLibrary, listLibrary,
  removeFromLibrary, readPresets, writePresets,
} from './cloudLibrary.js'
import { CHUNK_SIZE, WrongPassphraseError, createLibraryKey, unlockLibraryKey } from './libraryCrypto.js'

const ITER = 1000 // fast tests; the app uses PBKDF2_ITERATIONS

async function setup() {
  const backend = memoryLibraryBackend()
  const { record, keys } = await createLibraryKey('correct horse battery', ITER)
  await backend.insertKeyRecord(record)
  return { backend, keys }
}

function bytes(n, seed = 7) {
  const u8 = new Uint8Array(n)
  for (let i = 0; i < n; i++) u8[i] = (i * 31 + seed) & 0xff
  return u8
}

describe('library key', () => {
  it('unlocks with the right passphrase and refuses a wrong one', async () => {
    const { record } = await createLibraryKey('correct horse battery', ITER)
    await expect(unlockLibraryKey('wrong horse battery', record)).rejects.toBeInstanceOf(WrongPassphraseError)
    const keys = await unlockLibraryKey('correct horse battery', record)
    expect(keys.fileKey.extractable).toBe(false)
  })

  it('rejects short passphrases', async () => {
    await expect(createLibraryKey('short', ITER)).rejects.toThrow(/8 characters/)
  })

  it('stores only the wrapped key on the server', async () => {
    const backend = memoryLibraryBackend()
    expect(await libraryState(backend)).toBe('none')
    // createLibrary uses the full iteration count; a single call is fine.
    await createLibrary(backend, 'a long enough passphrase')
    expect(await libraryState(backend)).toBe('locked')
    const rec = backend._state.key
    expect(Object.keys(rec).sort()).toEqual(['iterations', 'kdf', 'salt', 'user_id', 'wrapped_key'])
    await expect(unlockLibrary(backend, 'not the passphrase')).rejects.toBeInstanceOf(WrongPassphraseError)
  }, 30000)
})

describe('files', () => {
  it('round-trips a multi-chunk file and keeps only ciphertext on the server', async () => {
    const { backend, keys } = await setup()
    const data = bytes(CHUNK_SIZE * 2 + 1234)
    const file = new Blob([data])
    const progress = []
    const { skipped } = await uploadToLibrary(backend, keys, {
      kind: 'audio', naturalId: 'abc~kokoro~af_heart~1', contentId: 'sha256:abc', file,
      meta: { title: 'Pride and Prejudice', filename: 'pp.lantern-audio' },
    }, p => progress.push(p.done))
    expect(skipped).toBe(false)
    expect(progress).toEqual([1, 2, 3])

    const [item] = await listLibrary(backend, keys)
    expect(item).toMatchObject({ kind: 'audio', contentId: 'sha256:abc', status: 'ready', chunkCount: 3, bytes: data.length })
    expect(item.meta.title).toBe('Pride and Prejudice')
    // The server row holds no readable title.
    expect(JSON.stringify(backend._state.items.get(item.id))).not.toContain('Pride')
    // Stored chunks are not the plaintext.
    const first = backend._state.objects.get(`${item.id}/00000`)
    expect(first.length).toBe(CHUNK_SIZE + 12 + 16)
    expect(Buffer.from(first.subarray(12, 76)).equals(Buffer.from(data.subarray(0, 64)))).toBe(false)

    const back = await downloadFromLibrary(backend, keys, item)
    expect(back.name).toBe('pp.lantern-audio')
    expect(Buffer.from(await back.arrayBuffer()).equals(Buffer.from(data))).toBe(true)
  }, 30000)

  it('skips a file that is already stored', async () => {
    const { backend, keys } = await setup()
    const entry = { kind: 'epub', naturalId: 'sha256:abc', contentId: 'sha256:abc', file: new Blob([bytes(100)]), meta: {} }
    await uploadToLibrary(backend, keys, entry)
    const again = await uploadToLibrary(backend, keys, entry)
    expect(again.skipped).toBe(true)
    expect((await listLibrary(backend, keys)).length).toBe(1)
  })

  it('replaces an interrupted upload instead of adding a second copy', async () => {
    const { backend, keys } = await setup()
    const entry = { kind: 'epub', naturalId: 'sha256:abc', contentId: 'sha256:abc', file: new Blob([bytes(100)]), meta: {} }
    const put = backend.putObject
    backend.putObject = async () => { throw new Error('network down') }
    await expect(uploadToLibrary(backend, keys, entry)).rejects.toThrow('network down')
    expect((await listLibrary(backend, keys))[0].status).toBe('uploading')
    backend.putObject = put
    const res = await uploadToLibrary(backend, keys, entry)
    expect(res.skipped).toBe(false)
    const items = await listLibrary(backend, keys)
    expect(items).toHaveLength(1)
    expect(items[0].status).toBe('ready')
    await expect(downloadFromLibrary(backend, keys, { ...items[0], status: 'uploading' })).rejects.toThrow(/didn’t finish/)
  })

  it('detects swapped or altered chunks', async () => {
    const { backend, keys } = await setup()
    const file = new Blob([bytes(CHUNK_SIZE + 10)])
    await uploadToLibrary(backend, keys, { kind: 'visuals', naturalId: 'v~1', contentId: 'sha256:abc', file, meta: {} })
    const [item] = await listLibrary(backend, keys)
    const o = backend._state.objects
    const a = o.get(`${item.id}/00000`), b = o.get(`${item.id}/00001`)
    o.set(`${item.id}/00000`, b); o.set(`${item.id}/00001`, a)
    await expect(downloadFromLibrary(backend, keys, item)).rejects.toThrow(/damaged/)
  }, 30000)

  it('cannot be read with another library’s key', async () => {
    const { backend, keys } = await setup()
    await uploadToLibrary(backend, keys, { kind: 'epub', naturalId: 'sha256:abc', contentId: 'sha256:abc', file: new Blob([bytes(50)]), meta: { title: 'X' } })
    const other = (await createLibraryKey('another passphrase', ITER)).keys
    const [item] = await listLibrary(backend, other)
    expect(item.meta.title).toBe('Unreadable item')
    await expect(downloadFromLibrary(backend, other, item)).rejects.toThrow(/damaged/)
  })

  it('removes the file and its parts', async () => {
    const { backend, keys } = await setup()
    await uploadToLibrary(backend, keys, { kind: 'epub', naturalId: 'sha256:abc', contentId: 'sha256:abc', file: new Blob([bytes(50)]), meta: {} })
    const [item] = await listLibrary(backend, keys)
    await removeFromLibrary(backend, item)
    expect(backend._state.objects.size).toBe(0)
    expect(await listLibrary(backend, keys)).toEqual([])
  })
})

describe('presets', () => {
  it('round-trips encrypted', async () => {
    const { backend, keys } = await setup()
    expect(await readPresets(backend, keys)).toBeNull()
    await writePresets(backend, keys, { books: { b1: { at: 1, prefs: { rate: 1.2 } } } })
    expect(backend._state.presets.data_enc).not.toContain('rate')
    expect(await readPresets(backend, keys)).toEqual({ books: { b1: { at: 1, prefs: { rate: 1.2 } } } })
  })
})
