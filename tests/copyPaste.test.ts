import { describe, expect, test } from 'vitest'
import { chartFromMeasures, type Chart } from '../src/music/chart'
import { clearBars, copyBars, pasteBars } from '../src/music/edit'

function makeChart(): Chart {
  const c = chartFromMeasures({ title: 'Copy Paste Tune', style: 'medium-swing', key: 0, bpm: 120 }, [
    ['D-7'],
    ['G7'],
    ['C^7', 'A-7'],
    ['D-7', 'G7'],
  ])
  c.bars[0] = { ...c.bars[0], section: 'A', repeatStart: true }
  c.bars[1] = { ...c.bars[1], time: [3, 4], groups: [2, 2, 2], chords: [{ symbol: 'G7', beats: 3 }] }
  c.bars[2] = { ...c.bars[2], time: [4, 4], repeatEnd: true, repeatTimes: 3, ending: 1 }
  c.bars[3] = { ...c.bars[3], ending: 2, barline: 'final' }
  return c
}

describe('copyBars, pasteBars, clearBars', () => {
  test('copyBars copies chords, section marks, repeat/ending marks, and per-bar time/groups', () => {
    const chart = makeChart()
    const copied = copyBars(chart, 0, 2)
    expect(copied).toHaveLength(3)
    expect(copied[0].section).toBe('A')
    expect(copied[0].repeatStart).toBe(true)
    expect(copied[1].time).toEqual([3, 4])
    expect(copied[1].groups).toEqual([2, 2, 2])
    expect(copied[2].repeatEnd).toBe(true)
    expect(copied[2].repeatTimes).toBe(3)
    expect(copied[2].ending).toBe(1)

    // Deep clone: mutating copied bars does not affect source chart
    copied[0].chords[0].symbol = 'Eb7'
    copied[1].groups![0] = 4
    expect(chart.bars[0].chords[0].symbol).toBe('D-7')
    expect(chart.bars[1].groups).toEqual([2, 2, 2])
  })

  test('copyBars handles reversed selection (from > to) and out-of-bounds indices', () => {
    const chart = makeChart()
    const forward = copyBars(chart, 1, 2)
    const reversed = copyBars(chart, 2, 1)
    expect(reversed).toEqual(forward)

    expect(copyBars(chart, -5, 1)).toEqual(copyBars(chart, 0, 1))
    expect(copyBars(chart, 2, 99)).toEqual(copyBars(chart, 2, 3))
    expect(copyBars(chart, -3, -1)).toEqual([])
    expect(copyBars(chart, 10, 12)).toEqual([])
    expect(copyBars({ ...chart, bars: [] }, 0, 0)).toEqual([])
  })

  test('pasteBars ignores an empty clipboard', () => {
    const chart = makeChart()
    expect(pasteBars(chart, 1, [])).toBe(chart)
  })

  test('pasteBars overwrites target bars and preserves destination rowStart', () => {
    const chart = chartFromMeasures({ title: 'Rows', style: 'medium-swing', key: 0, bpm: 120 }, [
      ['F7'],
      ['Bb7'],
      ['C7'],
      ['A7'],
      ['D-7'],
      ['G7'],
      ['C^7'],
      ['F7'],
    ])
    const copied = copyBars(chart, 0, 1)
    const pasted = pasteBars(chart, 4, copied)

    expect(pasted.bars).toHaveLength(8)
    expect(pasted.bars[4].chords[0].symbol).toBe('F7')
    expect(pasted.bars[5].chords[0].symbol).toBe('Bb7')
    expect(pasted.bars[4].rowStart).toBe(true)
    expect(pasted.bars[5].rowStart).toBeUndefined()
    expect(pasted.bars[6].chords[0].symbol).toBe('C^7')
  })

  test('pasteBars extends the chart when pasting past the end and moves the final barline', () => {
    const chart = makeChart()
    const copied = copyBars(chart, 0, 2)
    const extended = pasteBars(chart, 3, copied)

    expect(extended.bars).toHaveLength(6)
    expect(extended.bars[3].section).toBe('A')
    expect(extended.bars[3].barline).toBeUndefined()
    expect(extended.bars[4].time).toEqual([3, 4])
    expect(extended.bars[5].repeatEnd).toBe(true)
    expect(extended.bars[2].barline).toBeUndefined()

    const plain = chartFromMeasures({ title: 'Plain', style: 'medium-swing', key: 0, bpm: 120 }, [['C'], ['F'], ['G'], ['C']])
    const extendedPlain = pasteBars(plain, 3, copyBars(plain, 0, 1))
    expect(extendedPlain.bars).toHaveLength(5)
    expect(extendedPlain.bars[3].barline).toBeUndefined()
    expect(extendedPlain.bars[4].barline).toBe('final')
    expect(extendedPlain.bars[4].rowStart).toBe(true)
  })

  test('clearBars empties bars in normal or reversed range while keeping bar count and final barline', () => {
    const chart = makeChart()
    const cleared = clearBars(chart, 3, 1)

    expect(cleared.bars).toHaveLength(4)
    expect(cleared.bars[0].chords[0].symbol).toBe('D-7')
    expect(cleared.bars[1].chords).toEqual([])
    expect(cleared.bars[1].time).toBeUndefined()
    expect(cleared.bars[2].chords).toEqual([])
    expect(cleared.bars[2].repeatEnd).toBeUndefined()
    expect(cleared.bars[3].chords).toEqual([])
    expect(cleared.bars[3].barline).toBe('final')

    expect(clearBars(chart, 10, 12)).toBe(chart)
  })
})
