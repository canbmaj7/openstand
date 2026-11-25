import { describe, expect, test } from 'vitest'
import { chartFromMeasures } from '../src/music/chart'
import { transposeChart, transposeSymbol } from '../src/music/transposeChart'

describe('transposeSymbol', () => {
  test('moves the root and keeps the suffix text', () => {
    expect(transposeSymbol('C^7', 2, 2)).toBe('D^7')
    expect(transposeSymbol('D-7', 5, 5)).toBe('G-7')
    expect(transposeSymbol('G7b9#11', 3, 3)).toBe('Bb7b9#11')
  })

  test('spells roots for the new key', () => {
    // F major uses flats; E major sharps
    expect(transposeSymbol('A7', 1, 5)).toBe('Bb7')
    expect(transposeSymbol('G7', 1, 4)).toBe('G#7')
    expect(transposeSymbol('Eb^7', 1, 4)).toBe('E^7')
  })

  test('moves a slash bass but not 6/9', () => {
    expect(transposeSymbol('C^7/E', 5, 5)).toBe('F^7/A')
    expect(transposeSymbol('C6/9', 2, 2)).toBe('D6/9')
    expect(transposeSymbol('C-6/9/Eb', 2, 2)).toBe('D-6/9/F')
  })

  test('leaves non-chords alone and handles zero or octave shifts', () => {
    expect(transposeSymbol('W/C', 2, 2)).toBe('W/C')
    expect(transposeSymbol('x', 2, 2)).toBe('x')
    expect(transposeSymbol('C7', 0, 0)).toBe('C7')
    expect(transposeSymbol('C7', 12, 0)).toBe('C7')
    expect(transposeSymbol('C7', -2, 10)).toBe('Bb7')
  })

  test('minor keys spell from the relative major', () => {
    // E minor (relative G major): F# not Gb
    expect(transposeSymbol('E-7b5', 2, 6, true)).toBe('F#-7b5')
  })
})

describe('transposeChart', () => {
  const chart = chartFromMeasures({ title: 'T', composer: 'X', style: 'medium-swing', key: 0, bpm: 120 }, [
    ['D-7', 'G7'],
    ['C^7'],
  ])

  test('moves every chord and sets the key', () => {
    const moved = transposeChart(chart, 5)
    expect(moved.key).toBe(5)
    expect(moved.bars.flatMap((b) => b.chords.map((c) => c.symbol))).toEqual(['G-7', 'C7', 'F^7'])
    // The original is untouched
    expect(chart.bars[0].chords[0].symbol).toBe('D-7')
  })

  test('moves substitutions and keeps N.C.', () => {
    const withAlt = {
      ...chart,
      bars: [{ ...chart.bars[0], chords: [{ ...chart.bars[0].chords[0], alt: 'Ab7' }, { symbol: null, beats: 2 }] }],
    }
    const moved = transposeChart(withAlt as typeof chart, 2)
    expect(moved.bars[0].chords[0].alt).toBe('Bb7')
    expect(moved.bars[0].chords[1].symbol).toBeNull()
  })

  test('same key only sets the key', () => {
    expect(transposeChart(chart, 0).bars).toEqual(chart.bars)
  })
})
