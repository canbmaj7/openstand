import { describe, expect, test } from 'vitest'
import { nextShuffledTuneId } from '../src/music/setlist'

describe('nextShuffledTuneId', () => {
  test('returns null for empty or single-tune setlists (even with duplicate ids)', () => {
    expect(nextShuffledTuneId([], 'a', new Set(), () => 0)).toEqual({
      nextId: null,
      played: new Set(),
    })
    expect(nextShuffledTuneId(['a'], 'a', new Set(), () => 0)).toEqual({
      nextId: null,
      played: new Set(),
    })
    expect(nextShuffledTuneId(['a', 'a', 'a'], 'a', new Set(), () => 0)).toEqual({
      nextId: null,
      played: new Set(),
    })
  })

  test('visits every tune once without repeats in a round and updates played without mutating input', () => {
    const ids = ['a', 'b', 'c', 'd']
    const initialPlayed = new Set<string>()
    const r1 = nextShuffledTuneId(ids, 'a', initialPlayed, () => 0)
    expect(r1.nextId).toBe('b')
    expect(r1.played).toEqual(new Set(['a', 'b']))
    expect(initialPlayed.size).toBe(0)

    const r2 = nextShuffledTuneId(ids, r1.nextId!, r1.played, () => 0.99)
    expect(r2.nextId).toBe('d')
    expect(r2.played).toEqual(new Set(['a', 'b', 'd']))

    const r3 = nextShuffledTuneId(ids, r2.nextId!, r2.played, () => 0)
    expect(r3.nextId).toBe('c')
    expect(r3.played).toEqual(new Set(['a', 'b', 'c', 'd']))
    expect(new Set(['a', r1.nextId, r2.nextId, r3.nextId])).toEqual(new Set(ids))
  })

  test('starts a new round after all tunes are played and never repeats currentId', () => {
    const ids = ['a', 'b', 'c']
    const nextRound = nextShuffledTuneId(ids, 'c', new Set(['a', 'b', 'c']), () => 0)
    expect(nextRound.nextId).toBe('a')
    expect(nextRound.played).toEqual(new Set(['a']))

    const afterReset = nextShuffledTuneId(ids, 'a', nextRound.played, () => 0.99)
    expect(afterReset.nextId).toBe('c')
    expect(afterReset.played).toEqual(new Set(['a', 'c']))
  })

  test('alternates cleanly on a two-tune setlist without repeating currentId', () => {
    const ids = ['a', 'b']
    const r1 = nextShuffledTuneId(ids, 'a', new Set(), () => 0)
    expect(r1).toEqual({ nextId: 'b', played: new Set(['a', 'b']) })

    const r2 = nextShuffledTuneId(ids, 'b', r1.played, () => 0)
    expect(r2).toEqual({ nextId: 'a', played: new Set(['a']) })

    const r3 = nextShuffledTuneId(ids, 'a', r2.played, () => 0)
    expect(r3).toEqual({ nextId: 'b', played: new Set(['a', 'b']) })
  })

  test('deduplicates repeated ids in tuneIds and ignores stale ids in played', () => {
    const ids = ['a', 'b', 'a', 'c', 'b']
    const r1 = nextShuffledTuneId(ids, 'a', new Set(['removed-tune']), () => 0.5)
    expect(r1.nextId).toBe('c')
    expect(r1.played).toEqual(new Set(['a', 'c']))

    const r2 = nextShuffledTuneId(ids, 'c', r1.played, () => 0)
    expect(r2.nextId).toBe('b')
    expect(r2.played).toEqual(new Set(['a', 'c', 'b']))
  })
})
