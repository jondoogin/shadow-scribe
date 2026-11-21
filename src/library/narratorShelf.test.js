import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { listShelf, shelfPath, narratorHome } from '../../scripts/narrator-shelf.mjs'

describe('narrator shelf', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'shelf-'))
  fs.mkdirSync(path.join(home, 'output', 'archive'), { recursive: true })
  fs.writeFileSync(path.join(home, 'book.epub'), 'x')
  fs.writeFileSync(path.join(home, 'output', 'a.lantern-audio'), 'xx')
  fs.writeFileSync(path.join(home, 'output', 'p.lantern-visuals'), 'xxx')
  fs.writeFileSync(path.join(home, 'output', 'archive', 'old.lantern-visuals'), 'x')
  fs.writeFileSync(path.join(home, 'output', 'notes.txt'), 'x')
  fs.writeFileSync(path.join(home, 'books.json'), '{}')

  it('lists only top-level EPUBs and finished packages', () => {
    const names = listShelf(home).map(f => `${f.kind}:${f.name}`).sort()
    expect(names).toEqual(['audio:a.lantern-audio', 'epub:book.epub', 'visuals:p.lantern-visuals'])
  })
  it('serves listed files only', () => {
    expect(shelfPath(home, 'a.lantern-audio')).toBe(path.join(home, 'output', 'a.lantern-audio'))
    expect(shelfPath(home, 'archive/old.lantern-visuals')).toBe(null)
    expect(shelfPath(home, '../book.epub')).toBe(null)
    expect(shelfPath(home, 'books.json')).toBe(null)
    expect(shelfPath(home, 'missing.epub')).toBe(null)
  })
  it('honours LANTERN_NARRATOR_HOME', () => {
    expect(narratorHome('/x', { LANTERN_NARRATOR_HOME: home })).toBe(home)
  })
})
