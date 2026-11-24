import { describe, expect, test } from 'vitest'
import { arrange } from '../src/engine/arrange'
import { generateBass } from '../src/engine/bass'
import { generateComp } from '../src/engine/comp'
import { generateDrums } from '../src/engine/drums'
import { PPQ, type NoteEvent } from '../src/engine/events'
import { buildTimeline } from '../src/engine/timeline'
import { parseChartFile, validateChart } from '../src/formats/chartFile'
import { parseIrealLinks } from '../src/formats/ireal'
import { chartFromMeasures, isCompound, type TimeSignature } from '../src/music/chart'
import { groupsAt, setBarGroups, setBarTime, setGroups, setTime } from '../src/music/edit'
import { groupsFor } from '../src/music/meter'
import { EXAMPLES } from '../src/music/songs'
import { getStyle, STYLES } from '../src/styles'
import { DRUM_NOTES } from '../src/styles/drums'

const chart98 = (groups?: number[], style = 'aksak') =>
  chartFromMeasures({ title: 'Test 9/8', style, key: 9, minor: true, bpm: 200, time: [9, 8], groups }, [
    ['A-'],
    ['D-'],
    ['E7'],
    ['A-'],
  ])

const nearAny = (val: number, targets: number[], tol = 0.05) => targets.some((t) => Math.abs(val - t) < tol)

describe('groupsFor', () => {
  test('returns defaults for odd / non-compound eighth meters', () => {
    expect(groupsFor([5, 8])).toEqual([3, 2])
    expect(groupsFor([7, 8])).toEqual([3, 2, 2])
    expect(groupsFor([10, 8])).toEqual([3, 2, 2, 3])
    expect(groupsFor([11, 8])).toEqual([2, 2, 3, 2, 2])
    expect(groupsFor([13, 8])).toEqual([2, 2, 2, 3, 2, 2])
  })

  test('returns undefined for compound and quarter meters unless explicit n/8 groups given', () => {
    expect(groupsFor([9, 8])).toBeUndefined()
    expect(groupsFor([6, 8])).toBeUndefined()
    expect(groupsFor([12, 8])).toBeUndefined()
    expect(groupsFor([4, 4])).toBeUndefined()
    expect(groupsFor([3, 4])).toBeUndefined()
    expect(groupsFor([5, 4])).toBeUndefined()
    expect(groupsFor([4, 4], [3, 3, 2])).toBeUndefined()
  })

  test('accepts valid explicit n/8 groups and ignores invalid sums', () => {
    expect(groupsFor([9, 8], [2, 2, 2, 3])).toEqual([2, 2, 2, 3])
    expect(groupsFor([7, 8], [2, 2, 3])).toEqual([2, 2, 3])
    expect(groupsFor([7, 8], [3, 3])).toEqual([3, 2, 2])
    expect(groupsFor([9, 8], [2, 2, 3])).toBeUndefined()
    expect(groupsFor([9, 8], [0, 9])).toBeUndefined()
    expect(groupsFor([5, 8], [])).toEqual([3, 2])
  })
})

describe('buildTimeline with grouped meters', () => {
  test('7/8 has 3.5 beats, [3,2,2] groups, and compound=undefined', () => {
    const c = chartFromMeasures({ title: '7/8', style: 'aksak', key: 2, bpm: 200, time: [7, 8] }, [['D-'], ['A7']])
    const tl = buildTimeline(c, 0, 1)
    for (const bar of tl.bars) {
      expect(bar.groups).toEqual([3, 2, 2])
      expect(bar.compound).toBeUndefined()
    }
    expect(tl.bars.filter((b) => b.measure >= 0).map((b) => b.beats)).toEqual([3.5, 3.5])
    // Two-bar count-in (3.5 <= 4) with clicks on group starts 0, 1.5, 2.5
    expect(tl.countIn).toBe(7)
    expect(tl.clicks.map((x) => x.at)).toEqual([0, 1.5, 2.5, 3.5, 5, 6])
  })

  test('9/8 with explicit groups has compound=undefined; without groups uses compound=true', () => {
    expect(isCompound([9, 8])).toBe(true)
    const aksakTl = buildTimeline(chart98([2, 2, 2, 3]), 0, 1)
    expect(aksakTl.bars[0].beats).toBe(4.5)
    expect(aksakTl.bars[0].groups).toEqual([2, 2, 2, 3])
    expect(aksakTl.bars[0].compound).toBeUndefined()
    expect(aksakTl.clicks.map((x) => x.at)).toEqual([0, 1, 2, 3])

    const compoundTl = buildTimeline(chart98(undefined, 'medium-swing'), 0, 1)
    expect(compoundTl.bars[0].beats).toBe(4.5)
    expect(compoundTl.bars[0].groups).toBeUndefined()
    expect(compoundTl.bars[0].compound).toBe(true)
  })
})

describe('aksak arrangement and patterns', () => {
  test('Aksak 9/8 Vamp puts strong drum hits and bass notes on group starts [0, 1, 2, 3] within bar bounds', () => {
    const vamp = EXAMPLES.find((t) => t.id === 'aksak-98-a')!
    const style = getStyle(vamp.chart.style)
    const { timeline } = arrange(vamp.chart, style, 0, 2)
    const drums = generateDrums(timeline.bars, style.drums, style.swing, timeline.clicks, style.drums, style.family)
    const bass = generateBass(timeline.slots, style.bass, style.swing, style.bass, style.family)
    const starts = [0, 1, 2, 3]

    const barEnd = (timeline.bars.at(-1)!.start + timeline.bars.at(-1)!.beats) * PPQ
    for (const e of [...drums, ...bass]) {
      expect(e.tick).toBeGreaterThanOrEqual(0)
      expect(e.tick).toBeLessThan(barEnd + 10)
    }

    for (const bar of timeline.bars.filter((b) => b.measure >= 0)) {
      const inBarDrums = drums.filter((e) => {
        const rel = e.tick / PPQ - bar.start
        return rel > -0.1 && rel < bar.beats - 0.1
      })
      for (const e of inBarDrums) {
        const rel = e.tick / PPQ - bar.start
        expect(rel).toBeGreaterThanOrEqual(-0.02)
        expect(rel).toBeLessThan(bar.beats)
        if (e.note === DRUM_NOTES.congaLow || e.note === DRUM_NOTES.kick) {
          expect(nearAny(rel, starts)).toBe(true)
        }
      }
      const inBarBass = bass.filter((e) => {
        const rel = e.tick / PPQ - bar.start
        return rel > -0.1 && rel < bar.beats - 0.1
      })
      expect(inBarBass.length).toBeGreaterThan(0)
      for (const e of inBarBass) {
        const rel = e.tick / PPQ - bar.start
        expect(nearAny(rel, starts)).toBe(true)
        expect(rel + e.duration / PPQ).toBeLessThanOrEqual(bar.beats + 0.02)
      }
    }
  })

  test('Balkan 7/8 puts strong hits and bass notes on [0, 1.5, 2.5], including multi-chord bars', () => {
    const balkan = EXAMPLES.find((t) => t.id === 'balkan-78-d')!
    const style = getStyle(balkan.chart.style)
    const timeline = buildTimeline(balkan.chart, 0, 1)
    const drums = generateDrums(timeline.bars, style.drums, style.swing, timeline.clicks, style.drums, style.family)
    const bass = generateBass(timeline.slots, style.bass, style.swing, style.bass, style.family)
    const comp = generateComp(timeline.slots, style.comp, style.swing, timeline.countIn, style.comp, style.family)
    const starts = [0, 1.5, 2.5]

    for (const bar of timeline.bars.filter((b) => b.measure >= 0)) {
      const inRange = (e: NoteEvent) => {
        const rel = e.tick / PPQ - bar.start
        return rel > -0.1 && rel < bar.beats - 0.1
      }
      for (const e of drums.filter(inRange)) {
        const rel = e.tick / PPQ - bar.start
        expect(rel).toBeLessThan(bar.beats)
        if (e.note === DRUM_NOTES.congaLow || e.note === DRUM_NOTES.kick) {
          expect(nearAny(rel, starts)).toBe(true)
        }
      }
      for (const e of bass.filter(inRange)) {
        expect(nearAny(e.tick / PPQ - bar.start, starts)).toBe(true)
      }
      for (const e of comp.filter(inRange)) {
        expect(nearAny(e.tick / PPQ - bar.start, starts)).toBe(true)
      }
    }
  })

  test('every style arranges 5/8, 7/8, 9/8+groups, and 11/8 cleanly with straight eighths', () => {
    const meters: [TimeSignature, number[] | undefined][] = [
      [[5, 8], undefined],
      [[7, 8], undefined],
      [[9, 8], [2, 2, 2, 3]],
      [[11, 8], undefined],
    ]
    for (const style of STYLES) {
      for (const [time, groups] of meters) {
        const chart = chartFromMeasures({ title: 'Odd', style: style.id, key: 0, bpm: 180, time, groups }, [
          ['C-7'],
          ['F7'],
          ['Bb^7'],
          ['G7'],
        ])
        const { midi, timeline } = arrange(chart, style, 0, 1)
        expect(String.fromCharCode(...midi.slice(0, 4)), `${style.id} ${time.join('/')}`).toBe('MThd')
        expect(midi.length, `${style.id} ${time.join('/')}`).toBeGreaterThan(200)
        // Verify straight eighth grid (no swing offset)
        const checkGrid = (events: NoteEvent[]) => {
          for (const e of events) {
            const eighths = e.tick / (PPQ / 2)
            expect(Math.abs(eighths - Math.round(eighths)), `${style.id}`).toBeLessThan(0.05)
          }
        }
        checkGrid(generateDrums(timeline.bars, style.drums, style.swing, timeline.clicks, style.drums, style.family))
        checkGrid(generateBass(timeline.slots, style.bass, style.swing, style.bass, style.family))
        checkGrid(generateComp(timeline.slots, style.comp, style.swing, timeline.countIn, style.comp, style.family))
      }
    }
  })
})

describe('edit helpers and validation for groups', () => {
  test('setTime and setBarTime clear incompatible groups; setGroups/setBarGroups update them', () => {
    let c = chart98([2, 2, 2, 3])
    expect(groupsAt(c, 0)).toEqual([2, 2, 2, 3])

    c = setGroups(c, undefined)
    expect(c.groups).toBeUndefined()
    expect(groupsAt(c, 0)).toBeUndefined()

    c = setGroups(c, [3, 2, 2, 2])
    expect(c.groups).toEqual([3, 2, 2, 2])

    const changed = setTime(c, [7, 8])
    expect(changed.groups).toBeUndefined()
    expect(groupsAt(changed, 0)).toEqual([3, 2, 2])

    // Per-bar change with onlyThisBar=true restores previous grouping on next bar
    const perBar = setBarTime(c, 1, [7, 8], true)
    expect(groupsAt(perBar, 0)).toEqual([3, 2, 2, 2])
    expect(groupsAt(perBar, 1)).toEqual([3, 2, 2])
    expect(groupsAt(perBar, 2)).toEqual([3, 2, 2, 2])

    const barGrouped = setBarGroups(perBar, 1, [2, 2, 3], true)
    expect(groupsAt(barGrouped, 1)).toEqual([2, 2, 3])
    expect(groupsAt(barGrouped, 2)).toEqual([3, 2, 2, 2])
  })

  test('validateChart accepts valid groups and rejects malformed ones', () => {
    const valid = chart98([2, 2, 2, 3])
    expect(parseChartFile(JSON.stringify(valid))).toEqual(valid)

    for (const bad of [[], [0, 9], [-2, 11], [2.5, 6.5], '2+2+2+3']) {
      expect(() => validateChart({ ...valid, groups: bad })).toThrow(/groups/i)
      const bars = valid.bars.map((b, i) => (i === 0 ? { ...b, groups: bad } : b))
      expect(() => validateChart({ ...valid, groups: undefined, bars })).toThrow(/groups/i)
    }
  })

  test('iReal links with T58 and T78 read cleanly and use default groupings', () => {
    const link = `irealbook://${encodeURIComponent(['Balkan', 'Trad', 'Pop', 'D-', 'n', '{*AT78D- |C |Bb |A7 Z'].join('='))}`
    const [playlist] = parseIrealLinks(link)
    const chart = playlist.charts[0]
    expect(chart.time).toEqual([7, 8])
    const tl = buildTimeline(chart, 0, 1)
    expect(tl.bars[0].groups).toEqual([3, 2, 2])
    expect(tl.bars[0].beats).toBe(3.5)
  })
})
