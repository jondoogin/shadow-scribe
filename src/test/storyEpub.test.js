import { describe, it, expect } from 'vitest'
import { buildStoryEpub } from './storyEpub.js'

describe('buildStoryEpub', () => {
  it('builds byte-identical files every time (one edition, one hash)', async () => {
    const a = buildStoryEpub()
    await new Promise(r => setTimeout(r, 2100))   // zip times have 2-second resolution
    const b = buildStoryEpub()
    expect(a).toEqual(b)
  })
})
