import { describe, it, expect } from 'vitest'
import { sanitizeBook, parseImport, createExportEnvelope } from './storage.js'

// Regression coverage for existing companion persistence: the narration work
// adds only `book.contentId` to companion records.
const legacy = {
  id: 'book_1', title: 'Emma', author: 'Jane Austen', currentChapter: 4, totalChapters: 55,
  chapters: [{ num: 1, title: 'One' }, { num: 2, title: 'Two', completed: true }],
  notes: [{ id: 'n1', text: 'A note' }], spoilerMode: 'strict',
}

describe('companion storage regressions', () => {
  it('loads old records unchanged (no content required)', () => {
    const b = sanitizeBook(legacy)
    expect(b.currentChapter).toBe(4)
    expect(b.notes).toHaveLength(1)
    expect(b.spoilerMode).toBe('strict')
    expect(b.contentId).toBeUndefined()
  })

  it('keeps the small contentId link and never carries book text', () => {
    const b = sanitizeBook({ ...legacy, contentId: 'sha256:abc' })
    expect(b.contentId).toBe('sha256:abc')
    expect(JSON.stringify(b).length).toBeLessThan(2000)
  })

  it('round-trips through library export/import', () => {
    const env = createExportEnvelope([{ ...legacy, contentId: 'sha256:abc' }])
    const { books, warnings } = parseImport(JSON.stringify(env))
    expect(warnings).toEqual([])
    expect(books[0]).toMatchObject({ id: 'book_1', contentId: 'sha256:abc', currentChapter: 4 })
  })
})
