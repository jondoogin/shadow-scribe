import { describe, it, expect } from 'vitest'
import { presetsFromListenState, mergePresets, applyPresets } from './presets.js'

describe('presets', () => {
  it('takes only narration and painting preferences, never positions', () => {
    const state = { books: {
      b1: { listen: { sectionId: 's1' }, read: { sectionId: 's2' }, prefs: { source: { type: 'audio', audiobookId: 'a' } }, visuals: { mode: 'both' } },
      b2: { listen: { sectionId: 's1' } },
    } }
    expect(presetsFromListenState({ ...state, prefs: { rate: 1.1 } }).__global).toEqual({ prefs: { rate: 1.1 } })
    expect(presetsFromListenState(state)).toEqual({ b1: { prefs: { source: { type: 'audio', audiobookId: 'a' } }, visuals: { mode: 'both' } } })
  })

  it('local edits since the last sync win; otherwise the cloud wins', () => {
    const base = { b1: { visuals: { mode: 'listen' } }, b2: { visuals: { mode: 'listen' } } }
    const local = { b1: { visuals: { mode: 'both' } }, b2: { visuals: { mode: 'listen' } } }
    const remote = { b1: { visuals: { mode: 'off' } }, b2: { visuals: { mode: 'off' } }, b3: { prefs: { source: null } } }
    const { merged, localChanged, remoteChanged } = mergePresets(local, base, remote)
    expect(merged).toEqual({ b1: { visuals: { mode: 'both' } }, b2: { visuals: { mode: 'off' } }, b3: { prefs: { source: null } } })
    expect(localChanged).toBe(true)
    expect(remoteChanged).toBe(true)
  })

  it('first sync on a new device adopts the cloud and keeps local-only books', () => {
    const { merged } = mergePresets({ b9: { visuals: { mode: 'off' } } }, {}, { b1: { visuals: { mode: 'both' } } })
    expect(merged).toEqual({ b9: { visuals: { mode: 'off' } }, b1: { visuals: { mode: 'both' } } })
    const fresh = mergePresets({ __global: { prefs: { rate: 1 } } }, {}, { __global: { prefs: { rate: 1.4 } } })
    expect(fresh.merged.__global.prefs.rate).toBe(1.4)
  })

  it('applies presets without touching positions', () => {
    const state = { version: 1, prefs: {}, books: { b1: { listen: { sectionId: 's3' }, visuals: { mode: 'off' } } } }
    const next = applyPresets(state, { b1: { visuals: { mode: 'both' } }, b2: { prefs: { source: null } } })
    expect(next.books.b1).toEqual({ listen: { sectionId: 's3' }, visuals: { mode: 'both' } })
    expect(next.books.b2).toEqual({ prefs: { source: null } })
    expect(applyPresets({ prefs: { rate: 1, duck: true }, books: {} }, { __global: { prefs: { rate: 1.3 } } }).prefs).toEqual({ rate: 1.3, duck: true })
  })
})
