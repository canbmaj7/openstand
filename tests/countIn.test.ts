import { describe, expect, test } from 'vitest'
import { backingTrack } from '../packages/engine/src/index'
import { arrange } from '../src/engine/arrange'
import { generateBass } from '../src/engine/bass'
import { generateComp } from '../src/engine/comp'
import { generateDrums } from '../src/engine/drums'
import { PPQ } from '../src/engine/events'
import { buildTimeline, countInBeats, countInClicks, type CountInMode } from '../src/engine/timeline'
import { chartFromMeasures, type TimeSignature } from '../src/music/chart'
import { getStyle } from '../src/styles'

const chartFor = (time: TimeSignature = [4, 4]) =>
  chartFromMeasures(
    { title: 'Count-in Test', style: 'medium-swing', key: 0, bpm: 120, time },
    [['C^7'], ['A-7'], ['D-7'], ['G7']],
  )

describe('count-in setting', () => {
  test.each<[TimeSignature, CountInMode, number, number]>([
    [[4, 4], 'auto', 8, 6],
    [[4, 4], 'off', 0, 0],
    [[4, 4], 1, 4, 4],
    [[4, 4], 2, 8, 6],
    [[3, 4], 'auto', 6, 4],
    [[3, 4], 'off', 0, 0],
    [[3, 4], 1, 3, 3],
    [[3, 4], 2, 6, 4],
    [[5, 4], 'auto', 5, 5],
    [[5, 4], 'off', 0, 0],
    [[5, 4], 1, 5, 5],
    [[5, 4], 2, 10, 10],
    [[6, 8], 'auto', 6, 8],
    [[6, 8], 'off', 0, 0],
    [[6, 8], 1, 3, 6],
    [[6, 8], 2, 6, 8],
  ])('time %j with mode %s -> %i beats, %i clicks, first slot at %i', (time, mode, expectedBeats, expectedClicks) => {
    const chart = chartFor(time)
    expect(countInBeats(chart, mode)).toBe(expectedBeats)
    expect(countInClicks(chart, mode)).toHaveLength(expectedClicks)

    const tl = buildTimeline(chart, 0, 1, { countIn: mode })
    expect(tl.countIn).toBe(expectedBeats)
    expect(tl.clicks).toHaveLength(expectedClicks)
    expect(tl.bars[0].start).toBe(expectedBeats)
    expect(tl.slots[0].start).toBe(expectedBeats)
    for (const click of tl.clicks) {
      expect(click.at).toBeGreaterThanOrEqual(0)
      expect(click.at).toBeLessThan(expectedBeats)
    }
  })

  test('off mode starts drums, comp and bass immediately at beat 0 with no count-in clicks', () => {
    const chart = chartFor([4, 4])
    const style = getStyle('medium-swing')
    const tl = buildTimeline(chart, 0, 1, { countIn: 'off' })
    expect(tl.countIn).toBe(0)
    expect(tl.clicks).toEqual([])
    expect(tl.slots[0].start).toBe(0)

    const drums = generateDrums(tl.bars, style.drums, style.swing, tl.clicks)
    const comp = generateComp(tl.slots, style.comp, style.swing, tl.countIn)
    const bass = generateBass(tl.slots, style.bass, style.swing)

    expect(drums.length).toBeGreaterThan(0)
    expect(comp.length).toBeGreaterThan(0)
    expect(bass.length).toBeGreaterThan(0)
    expect(Math.min(...drums.map((e) => e.tick))).toBeGreaterThanOrEqual(0)
    expect(Math.min(...comp.map((e) => e.tick))).toBeGreaterThanOrEqual(0)
    expect(Math.min(...bass.map((e) => e.tick))).toBeGreaterThanOrEqual(0)
    // First bass note lands near beat 0 (within humanize tolerance)
    expect(Math.min(...bass.map((e) => e.tick))).toBeLessThan(PPQ / 4)

    const { midi, timeline } = arrange(chart, style, 0, 1, { countIn: 'off' })
    expect(timeline.countIn).toBe(0)
    expect(String.fromCharCode(...midi.slice(0, 4))).toBe('MThd')
  })

  test('backingTrack forwards countIn option through @openstand/engine', () => {
    const chart = chartFor([4, 4])
    expect(backingTrack({ chart, practice: { countIn: 'off' } }).timeline.countIn).toBe(0)
    expect(backingTrack({ chart, practice: { countIn: 1 } }).timeline.countIn).toBe(4)
    expect(backingTrack({ chart, practice: { countIn: 2 } }).timeline.countIn).toBe(8)
  })
})
