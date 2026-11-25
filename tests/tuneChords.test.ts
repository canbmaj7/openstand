import { describe, expect, test } from 'vitest'
import { chartFromMeasures, type Chart } from '../src/music/chart'
import { chordSpellLabel } from '../src/music/chords'
import { EXAMPLES } from '../src/music/songs'
import { distinctChords } from '../src/music/tuneChords'

describe('distinctChords', () => {
  const jazzBlues = EXAMPLES.find((t) => t.id === 'jazz-blues-f')!

  test('returns Jazz Blues distinct chords in first-appearance order including alternates and deduplicating repeats', () => {
    const chords = distinctChords(jazzBlues.chart, 0)
    const labels = chords.map((c) => chordSpellLabel(c, jazzBlues.chart.key))
    expect(labels).toEqual(['F7', 'Bb7', 'C-7', 'Bo7', 'A-7', 'D7b9', 'Ab7', 'G-7', 'C7', 'Gb7'])
    expect(chords).toHaveLength(10)
  })

  test('transposes roots and bass by the given semitones', () => {
    const base = distinctChords(jazzBlues.chart, 0)
    const transposed = distinctChords(jazzBlues.chart, 2)
    expect(transposed).toHaveLength(base.length)
    expect(transposed.map((c) => c.root)).toEqual(base.map((c) => (c.root + 2) % 12))
    expect(transposed.map((c) => c.bass)).toEqual(base.map((c) => (c.bass + 2) % 12))
  })

  test('skips N.C., empty bars, spacers, and unparseable repeat marks while distinguishing slash bass and tensions', () => {
    const base = chartFromMeasures({ title: 'Test', style: 'medium-swing', key: 0, bpm: 120 }, [
      ['C^7', 'C^7/G'],
      ['D-7(Ab7)'],
      ['G7b9', 'G7'],
    ])
    const chart: Chart = {
      ...base,
      bars: [
        base.bars[0],
        { chords: [{ symbol: null, beats: 4 }], cells: 4 }, // N.C.
        { chords: [], cells: 4 }, // empty repeat-previous bar
        { chords: [{ symbol: '%', beats: 4 }], cells: 4 }, // repeat symbol
        { chords: [{ symbol: 'E-7', beats: 4 }], cells: 4, spacer: true }, // spacer bar
        base.bars[1],
        base.bars[2],
      ],
    }

    const chords = distinctChords(chart, 0)
    expect(chords.map((c) => chordSpellLabel(c, 0))).toEqual(['C^7', 'C^7/G', 'D-7', 'Ab7', 'G7b9', 'G7'])
  })
})
