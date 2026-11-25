import { describe, expect, test } from 'vitest'
import { addTune, createSetlist, move, nextTuneId, removeAt, type Setlist } from '../src/music/setlist'

const sample = (tuneIds: string[] = ['a', 'b', 'c']): Setlist => ({
  id: 'set-1',
  name: 'Jazz Night',
  tuneIds,
  updatedAt: 1000,
})

describe('setlist helpers', () => {
  test('createSetlist trims the name and falls back when blank', () => {
    expect(createSetlist('  Gig Set  ', 'id-1', 42)).toEqual({
      id: 'id-1',
      name: 'Gig Set',
      tuneIds: [],
      updatedAt: 42,
    })
    expect(createSetlist('   ', 'id-2', 43).name).toBe('Untitled setlist')
  })

  test('addTune appends a tune id and ignores duplicates', () => {
    const s = sample(['a', 'b'])
    const added = addTune(s, 'c')
    expect(added.tuneIds).toEqual(['a', 'b', 'c'])
    expect(s.tuneIds).toEqual(['a', 'b'])

    const duplicate = addTune(added, 'b')
    expect(duplicate).toBe(added)
  })

  test('removeAt removes an item by index and ignores invalid indices', () => {
    const s = sample(['a', 'b', 'c'])
    expect(removeAt(s, 1).tuneIds).toEqual(['a', 'c'])
    expect(removeAt(s, -1)).toBe(s)
    expect(removeAt(s, 3)).toBe(s)
  })

  test('move reorders tunes and ignores out-of-bounds or no-op moves', () => {
    const s = sample(['a', 'b', 'c'])
    expect(move(s, 0, 2).tuneIds).toEqual(['b', 'c', 'a'])
    expect(move(s, 2, 0).tuneIds).toEqual(['c', 'a', 'b'])
    expect(move(s, 1, 1)).toBe(s)
    expect(move(s, -1, 1)).toBe(s)
    expect(move(s, 0, 5)).toBe(s)
  })

  test('nextTuneId returns the following tune id or null at the end', () => {
    const s = sample(['a', 'b', 'c'])
    expect(nextTuneId(s, 'a')).toBe('b')
    expect(nextTuneId(s, 'b')).toBe('c')
    expect(nextTuneId(s, 'c')).toBeNull()
    expect(nextTuneId(s, 'missing')).toBeNull()
    expect(nextTuneId(sample([]), 'a')).toBeNull()
  })

  test('nextTuneId with repeat goes back to the first tune after the last', () => {
    const s = sample(['a', 'b', 'c'])
    expect(nextTuneId(s, 'b', true)).toBe('c')
    expect(nextTuneId(s, 'c', true)).toBe('a')
    expect(nextTuneId(sample(['a']), 'a', true)).toBe('a')
    expect(nextTuneId(s, 'missing', true)).toBeNull()
  })
})
