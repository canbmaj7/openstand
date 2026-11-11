import { describe, expect, test } from 'vitest'
import { chartFromMeasures, type Chart } from '../src/music/chart'
import { switchMode, transformChordSymbol } from '../src/music/mode'

function makeChart(key: number, minor: boolean, measures: string[][]): Chart {
  return chartFromMeasures(
    {
      title: 'Test Tune',
      style: 'medium-swing',
      key,
      minor,
      bpm: 120,
    },
    measures,
  )
}

describe('switchMode - Major to Minor', () => {
  test('transforms standard progression C^7 A-7 D-7 G7 and F^7 to minor in C', () => {
    const major = makeChart(0, false, [['C^7', 'A-7'], ['D-7', 'G7'], ['F^7']])
    const minor = switchMode(major, 'minor')

    expect(minor.minor).toBe(true)
    expect(minor.bars[0].chords.map((c) => c.symbol)).toEqual(['C-7', 'Ab^7'])
    expect(minor.bars[1].chords.map((c) => c.symbol)).toEqual(['Dh7', 'G7b9'])
    expect(minor.bars[2].chords.map((c) => c.symbol)).toEqual(['F-7'])
  })

  test('transforms iii (min7) to bIII (maj7) and vii (half) to bVII (dom7)', () => {
    const major = makeChart(0, false, [['E-7', 'Bh7']])
    const minor = switchMode(major, 'minor')

    expect(minor.bars[0].chords.map((c) => c.symbol)).toEqual(['Eb^7', 'Bb7'])
  })

  test('transforms major triads and 6th chords to minor triads and 6th chords', () => {
    const major = makeChart(0, false, [['C', 'C6'], ['F', 'F6']])
    const minor = switchMode(major, 'minor')

    expect(minor.bars[0].chords.map((c) => c.symbol)).toEqual(['C-', 'C-6'])
    expect(minor.bars[1].chords.map((c) => c.symbol)).toEqual(['F-', 'F-6'])
  })

  test('preserves existing tensions on V (e.g. G7alt)', () => {
    const major = makeChart(0, false, [['G7alt', 'G7#9']])
    const minor = switchMode(major, 'minor')

    expect(minor.bars[0].chords.map((c) => c.symbol)).toEqual(['G7alt', 'G7#9'])
  })

  test('keeps ii min triad as min (not dim or half)', () => {
    const major = makeChart(0, false, [['D-']])
    const minor = switchMode(major, 'minor')

    expect(minor.bars[0].chords.map((c) => c.symbol)).toEqual(['D-'])
  })

  test('shifts slash bass along with root', () => {
    // A-7/G in C major: root A (9) -> Ab (8), bass G (7) -> Gb (6)
    const major = makeChart(0, false, [['A-7/G', 'C^7/G']])
    const minor = switchMode(major, 'minor')

    expect(minor.bars[0].chords.map((c) => c.symbol)).toEqual(['Ab^7/Gb', 'C-7/G'])
  })

  test('leaves non-diatonic chords untouched (e.g. Eb7, secondary dominants)', () => {
    const major = makeChart(0, false, [['Eb7', 'A7', 'D7']])
    const minor = switchMode(major, 'minor')

    expect(minor.bars[0].chords.map((c) => c.symbol)).toEqual(['Eb7', 'A7', 'D7'])
  })

  test('leaves blues dom7 on I and IV untouched', () => {
    const major = makeChart(0, false, [['C7', 'F7']])
    const minor = switchMode(major, 'minor')

    expect(minor.bars[0].chords.map((c) => c.symbol)).toEqual(['C7', 'F7'])
  })
})

describe('switchMode - Minor to Major', () => {
  test('transforms C-7, Ab^7, Dh7, G7b9, F-7 back to major in C', () => {
    const minor = makeChart(0, true, [['C-7', 'Ab^7'], ['Dh7', 'G7b9'], ['F-7']])
    const major = switchMode(minor, 'major')

    expect(major.minor).toBe(false)
    expect(major.bars[0].chords.map((c) => c.symbol)).toEqual(['C^7', 'A-7'])
    expect(major.bars[1].chords.map((c) => c.symbol)).toEqual(['D-7', 'G7'])
    expect(major.bars[2].chords.map((c) => c.symbol)).toEqual(['F^7'])
  })

  test('transforms bIII (maj7) to iii (min7) and bVII (dom7) to vii (half)', () => {
    const minor = makeChart(0, true, [['Eb^7', 'Bb7']])
    const major = switchMode(minor, 'major')

    expect(major.bars[0].chords.map((c) => c.symbol)).toEqual(['E-7', 'Bh7'])
  })

  test('removes b9 and b13 tensions on V dom7', () => {
    const minor = makeChart(0, true, [['G7b9', 'G7b9b13']])
    const major = switchMode(minor, 'major')

    expect(major.bars[0].chords.map((c) => c.symbol)).toEqual(['G7', 'G7'])
  })

  test('shifts slash bass along with root back to major', () => {
    const minor = makeChart(0, true, [['Ab^7/Gb', 'C-7/G']])
    const major = switchMode(minor, 'major')

    expect(major.bars[0].chords.map((c) => c.symbol)).toEqual(['A-7/G', 'C^7/G'])
  })
})

describe('switchMode - Round trip, immutability, and edge cases', () => {
  test('round-trip major -> minor -> major restores at least I, IV, V (and ii, iii, vi, vii)', () => {
    const original = makeChart(0, false, [
      ['C^7', 'D-7'],
      ['E-7', 'F^7'],
      ['G7', 'A-7'],
      ['Bh7', 'C^7'],
    ])

    const toMinor = switchMode(original, 'minor')
    const backToMajor = switchMode(toMinor, 'major')

    expect(backToMajor.minor).toBe(false)
    expect(backToMajor.bars.map((b) => b.chords.map((c) => c.symbol))).toEqual(
      original.bars.map((b) => b.chords.map((c) => c.symbol)),
    )
  })

  test('returns the same chart reference if chart is already in the target mode', () => {
    const major = makeChart(0, false, [['C^7']])
    expect(switchMode(major, 'major')).toBe(major)

    const minor = makeChart(0, true, [['C-7']])
    expect(switchMode(minor, 'minor')).toBe(minor)
  })

  test('does not mutate the original chart (immutability)', () => {
    const original = makeChart(0, false, [['C^7', 'D-7'], ['G7', 'C^7']])
    const clone = JSON.parse(JSON.stringify(original))

    const switched = switchMode(original, 'minor')
    expect(original).toEqual(clone)
    expect(switched).not.toBe(original)
    expect(switched.bars).not.toBe(original.bars)
    expect(switched.bars[0]).not.toBe(original.bars[0])
    expect(switched.bars[0].chords[0]).not.toBe(original.bars[0].chords[0])
  })

  test('handles N.C. and empty bars without corruption', () => {
    const chartWithNC: Chart = {
      format: 'openstand-chart',
      version: 1,
      title: 'NC Test',
      style: 'medium-swing',
      key: 0,
      bpm: 120,
      time: [4, 4],
      bars: [
        { chords: [{ symbol: null, beats: 4 }], cells: 4 },
        { chords: [], cells: 4 },
        { chords: [{ symbol: 'C^7', beats: 4 }], cells: 4 },
      ],
    }

    const minor = switchMode(chartWithNC, 'minor')
    expect(minor.bars[0].chords[0].symbol).toBeNull()
    expect(minor.bars[1].chords).toEqual([])
    expect(minor.bars[2].chords[0].symbol).toBe('C-7')

    const backToMajor = switchMode(minor, 'major')
    expect(backToMajor.bars[0].chords[0].symbol).toBeNull()
    expect(backToMajor.bars[1].chords).toEqual([])
    expect(backToMajor.bars[2].chords[0].symbol).toBe('C^7')
  })

  test('works cleanly across different keys (e.g. F major to F minor)', () => {
    // Key F (5): F^7 (I) -> F-7, G-7 (ii) -> Gh7, C7 (V) -> C7b9, Bb^7 (IV) -> Bb-7
    const fMajor = makeChart(5, false, [['F^7', 'G-7'], ['Bb^7', 'C7']])
    const fMinor = switchMode(fMajor, 'minor')

    expect(fMinor.bars[0].chords.map((c) => c.symbol)).toEqual(['F-7', 'Gh7'])
    expect(fMinor.bars[1].chords.map((c) => c.symbol)).toEqual(['Bb-7', 'C7b9'])

    const fRoundTrip = switchMode(fMinor, 'major')
    expect(fRoundTrip.bars[0].chords.map((c) => c.symbol)).toEqual(['F^7', 'G-7'])
    expect(fRoundTrip.bars[1].chords.map((c) => c.symbol)).toEqual(['Bb^7', 'C7'])
  })

  test('transformChordSymbol returns null for null symbol and unchanged for unparsable', () => {
    expect(transformChordSymbol(null, 0, 'minor')).toBeNull()
    expect(transformChordSymbol('???', 0, 'minor')).toBe('???')
  })
})
