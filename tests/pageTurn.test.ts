import { describe, expect, test } from 'vitest'
import { prevTuneId, type Setlist } from '../src/music/setlist'
import { pageTurn } from '../src/ui/pageTurn'

describe('pageTurn', () => {
  test('scrolls down and up by 85% of client height clamped to bounds when in the middle', () => {
    expect(pageTurn(1, { top: 0, height: 1000, client: 400 }, { playing: false, hasNext: true, hasPrev: true })).toEqual({
      kind: 'scroll',
      to: 340,
    })

    // Clamps to maxTop (1000 - 400 = 600)
    expect(pageTurn(1, { top: 400, height: 1000, client: 400 }, { playing: false, hasNext: true, hasPrev: true })).toEqual({
      kind: 'scroll',
      to: 600,
    })

    expect(pageTurn(-1, { top: 600, height: 1000, client: 400 }, { playing: false, hasNext: true, hasPrev: true })).toEqual({
      kind: 'scroll',
      to: 260,
    })

    // Clamps to 0
    expect(pageTurn(-1, { top: 100, height: 1000, client: 400 }, { playing: false, hasNext: true, hasPrev: true })).toEqual({
      kind: 'scroll',
      to: 0,
    })
  })

  test('moves to next tune at bottom of chart when stopped and hasNext is true', () => {
    expect(pageTurn(1, { top: 600, height: 1000, client: 400 }, { playing: false, hasNext: true, hasPrev: false })).toEqual({
      kind: 'tune',
      dir: 1,
    })
    // Within 2px tolerance of the bottom
    expect(pageTurn(1, { top: 598, height: 1000, client: 400 }, { playing: false, hasNext: true, hasPrev: false })).toEqual({
      kind: 'tune',
      dir: 1,
    })
    // Single-page chart (fits without scrolling)
    expect(pageTurn(1, { top: 0, height: 350, client: 400 }, { playing: false, hasNext: true, hasPrev: false })).toEqual({
      kind: 'tune',
      dir: 1,
    })
  })

  test('never switches tunes while playing', () => {
    expect(pageTurn(1, { top: 600, height: 1000, client: 400 }, { playing: true, hasNext: true, hasPrev: true })).toEqual({
      kind: 'none',
    })
    expect(pageTurn(-1, { top: 0, height: 1000, client: 400 }, { playing: true, hasNext: true, hasPrev: true })).toEqual({
      kind: 'none',
    })
    // Still scrolls within the current chart while playing
    expect(pageTurn(1, { top: 0, height: 1000, client: 400 }, { playing: true, hasNext: true, hasPrev: true })).toEqual({
      kind: 'scroll',
      to: 340,
    })
  })

  test('moves to previous tune at top of chart when stopped and hasPrev is true', () => {
    expect(pageTurn(-1, { top: 0, height: 1000, client: 400 }, { playing: false, hasNext: false, hasPrev: true })).toEqual({
      kind: 'tune',
      dir: -1,
    })
    expect(pageTurn(-1, { top: 2, height: 1000, client: 400 }, { playing: false, hasNext: false, hasPrev: true })).toEqual({
      kind: 'tune',
      dir: -1,
    })
  })

  test('returns none at boundaries when there is no adjacent tune', () => {
    expect(pageTurn(1, { top: 600, height: 1000, client: 400 }, { playing: false, hasNext: false, hasPrev: true })).toEqual({
      kind: 'none',
    })
    expect(pageTurn(-1, { top: 0, height: 1000, client: 400 }, { playing: false, hasNext: true, hasPrev: false })).toEqual({
      kind: 'none',
    })
  })
})

describe('prevTuneId', () => {
  const sample = (tuneIds: string[]): Setlist => ({
    id: 'set-1',
    name: 'Gig',
    tuneIds,
    updatedAt: 1000,
  })

  test('returns the preceding tune id or null at the start', () => {
    const s = sample(['a', 'b', 'c'])
    expect(prevTuneId(s, 'c')).toBe('b')
    expect(prevTuneId(s, 'b')).toBe('a')
    expect(prevTuneId(s, 'a')).toBeNull()
    expect(prevTuneId(s, 'missing')).toBeNull()
    expect(prevTuneId(sample([]), 'a')).toBeNull()
  })
})
