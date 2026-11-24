import { describe, expect, test } from 'vitest'
import { buildTimeline } from '../src/engine/timeline'
import { parseIrealLinks } from '../src/formats/ireal'
import { irealLink } from '../src/formats/irealWrite'
import { chartFromMeasures } from '../src/music/chart'
import { setBarTime, timeAt } from '../src/music/edit'

const tune = chartFromMeasures({ title: 'Bar Time Tune', composer: 'Test Writer', style: 'medium-swing', key: 0, bpm: 120 }, [
  ['D-7'],
  ['G7'],
  ['C^7', 'A-7'],
  ['D-7', 'G7', 'C^7'],
  ['F^7'],
  ['Bb7'],
  ['E-7', 'A7'],
  [],
])

describe('per-bar time signature (setBarTime)', () => {
  test('onlyThisBar=true changes one bar and restores the previous meter on the next bar', () => {
    const c = setBarTime(tune, 2, [3, 4], true)
    expect(c.time).toEqual([4, 4])
    expect(c.bars[2].time).toEqual([3, 4])
    expect(c.bars[3].time).toEqual([4, 4])
    expect(c.bars[4].time).toBeUndefined()
    expect(timeAt(c, 1)).toEqual([4, 4])
    expect(timeAt(c, 2)).toEqual([3, 4])
    expect(timeAt(c, 3)).toEqual([4, 4])
    expect(c.bars[2].chords.map((x) => x.beats)).toEqual([2, 1])
    expect(c.bars[3].chords.map((x) => x.beats)).toEqual([2, 1, 1])
  })

  test('onlyThisBar=true preserves an explicit time signature on the following bar', () => {
    let c = setBarTime(tune, 3, [5, 4], false)
    c = setBarTime(c, 2, [3, 4], true)
    expect(c.bars[2].time).toEqual([3, 4])
    expect(c.bars[3].time).toEqual([5, 4])
    expect(timeAt(c, 3)).toEqual([5, 4])
  })

  test('onlyThisBar=false changes from the selected bar onward until a later change', () => {
    let c = setBarTime(tune, 5, [6, 8], false)
    c = setBarTime(c, 2, [3, 4], false)
    expect(c.bars[2].time).toEqual([3, 4])
    expect(c.bars[3].time).toBeUndefined()
    expect(c.bars[4].time).toBeUndefined()
    expect(c.bars[5].time).toEqual([6, 8])
    expect(timeAt(c, 1)).toEqual([4, 4])
    expect(timeAt(c, 2)).toEqual([3, 4])
    expect(timeAt(c, 4)).toEqual([3, 4])
    expect(timeAt(c, 5)).toEqual([6, 8])
    expect(c.bars[2].chords.map((x) => x.beats)).toEqual([2, 1])
    expect(c.bars[3].chords.map((x) => x.beats)).toEqual([1, 1, 1])
    expect(c.bars[4].chords.map((x) => x.beats)).toEqual([3])
    expect(c.bars[7].chords).toEqual([])
  })

  test('time=null removes the bar time change and cleans up redundant restore markers', () => {
    const single = setBarTime(tune, 2, [3, 4], true)
    const cleared = setBarTime(single, 2, null, true)
    expect(cleared.bars[2].time).toBeUndefined()
    expect(cleared.bars[3].time).toBeUndefined()
    expect(timeAt(cleared, 2)).toEqual([4, 4])
    expect(cleared.bars[2].chords.map((x) => x.beats)).toEqual([2, 2])
  })

  test('setting a bar to the already-active meter removes redundant bar.time', () => {
    const c = setBarTime(tune, 2, [4, 4], false)
    expect(c.bars[2].time).toBeUndefined()
  })

  test('works on the first bar with onlyThisBar true and false', () => {
    const firstOnly = setBarTime(tune, 0, [3, 4], true)
    expect(firstOnly.time).toEqual([3, 4])
    expect(firstOnly.bars[0].time).toBeUndefined()
    expect(firstOnly.bars[1].time).toEqual([4, 4])
    expect(firstOnly.bars[0].chords.map((x) => x.beats)).toEqual([3])
    expect(firstOnly.bars[1].chords.map((x) => x.beats)).toEqual([4])

    const fromFirst = setBarTime(firstOnly, 0, [4, 4], false)
    expect(fromFirst.time).toEqual([4, 4])
    expect(fromFirst.bars[0].time).toBeUndefined()
    expect(fromFirst.bars[1].time).toBeUndefined()
    expect(fromFirst.bars[0].chords.map((x) => x.beats)).toEqual([4])
  })

  test('works on the last bar without creating an extra bar', () => {
    const last = tune.bars.length - 1
    const c = setBarTime(tune, last, [3, 4], true)
    expect(c.bars).toHaveLength(tune.bars.length)
    expect(c.bars[last].time).toEqual([3, 4])
    expect(timeAt(c, last)).toEqual([3, 4])
  })

  test('buildTimeline uses the changed beat count for that bar', () => {
    const c = setBarTime(tune, 2, [3, 4], true)
    const tl = buildTimeline(c, 0, 1)
    expect(tl.bars.filter((b) => b.measure >= 0).map((b) => b.beats)).toEqual([4, 4, 3, 4, 4, 4, 4, 4])
    const bar2Slots = tl.slots.filter((s) => s.measure === 2)
    expect(bar2Slots.reduce((sum, s) => sum + s.beats, 0)).toBe(3)
  })

  test('iReal export and re-import preserves per-bar time signatures', () => {
    const c = setBarTime(tune, 2, [3, 4], true)
    const [playlist] = parseIrealLinks(irealLink([c]))
    const back = playlist.charts[0]
    expect(back.time).toEqual([4, 4])
    expect(back.bars[2].time).toEqual([3, 4])
    expect(back.bars[3].time).toEqual([4, 4])
    expect(back.bars[2].chords).toEqual(c.bars[2].chords)
  })
})
