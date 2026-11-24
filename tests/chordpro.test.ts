import { describe, expect, test } from 'vitest'
import { chartToChordPro } from '../src/formats/chordpro'
import { chartFromMeasures, type Chart } from '../src/music/chart'
import { updateBar } from '../src/music/edit'

describe('chartToChordPro', () => {
  test('writes metadata headers and omits composer when absent', () => {
    const basic = chartFromMeasures(
      { title: 'Blues in F', style: 'medium-swing', key: 5, bpm: 140 },
      [['F7'], ['Bb7'], ['F7'], ['C-7', 'F7']],
    )
    const out = chartToChordPro(basic)
    expect(out).toContain('{title: Blues in F}')
    expect(out).toContain('{key: F}')
    expect(out).toContain('{time: 4/4}')
    expect(out).toContain('{tempo: 140}')
    expect(out).not.toContain('{composer:')

    const withComposer = chartToChordPro({ ...basic, composer: 'Miles Davis', minor: true })
    expect(withComposer).toContain('{composer: Miles Davis}')
    expect(withComposer).toContain('{key: Fm}')
  })

  test('converts chart chord symbols to ChordPro spelling, N.C., and % repeat bars', () => {
    const chart: Chart = {
      format: 'openstand-chart',
      version: 1,
      title: 'Chord Spellings',
      style: 'medium-swing',
      key: 0,
      bpm: 120,
      time: [4, 4],
      bars: [
        { chords: [{ symbol: 'D-7', beats: 2 }, { symbol: 'C^7', beats: 2 }], cells: 4, rowStart: true },
        { chords: [{ symbol: 'Bh7', beats: 2 }, { symbol: 'Co7', beats: 2 }], cells: 4 },
        { chords: [{ symbol: 'C7#9', beats: 2 }, { symbol: 'D-7/G', beats: 2 }], cells: 4 },
        { chords: [{ symbol: null, beats: 4 }], cells: 4 },
        { chords: [{ symbol: 'C^7', beats: 4 }], cells: 4, rowStart: true },
        { chords: [], cells: 4, barline: 'final' },
      ],
    }

    const out = chartToChordPro(chart)
    expect(out).toContain('{start_of_grid}')
    expect(out).toContain('| Dm7 . Cmaj7 . | Bm7b5 . Cdim7 . | C7#9 . Dm7/G . | N.C. . . . |')
    expect(out).toContain('| Cmaj7 . . . | % . . . ||')
    expect(out).toContain('{end_of_grid}')
  })

  test('renders sections, repeats, and final barlines', () => {
    let chart = chartFromMeasures(
      { title: 'Form Test', style: 'medium-swing', key: 0, bpm: 120 },
      [['C^7'], ['A-7'], ['D-7'], ['G7'], ['E-7'], ['A7'], ['D-7'], ['G7']],
    )
    chart = updateBar(chart, 0, { section: 'A', repeatStart: true })
    chart = updateBar(chart, 3, { repeatEnd: true })
    chart = updateBar(chart, 4, { section: 'B' })

    const out = chartToChordPro(chart)
    expect(out).toContain('{start_of_grid: A}')
    expect(out).toContain('|: Cmaj7 . . . | Am7 . . . | Dm7 . . . | G7 . . . :|')
    expect(out).toContain('{start_of_grid: B}')
    expect(out).toContain('| Em7 . . . | A7 . . . | Dm7 . . . | G7 . . . ||')
  })

  test('applies transposition to key header and chord roots/bass', () => {
    const chart = chartFromMeasures(
      { title: 'Transpose', style: 'medium-swing', key: 0, bpm: 120 },
      [['D-7'], ['G7/B'], ['C^7'], ['C^7']],
    )
    const out = chartToChordPro(chart, 5) // C -> F
    expect(out).toContain('{key: F}')
    expect(out).toContain('| Gm7 . . . | C7/E . . . | Fmaj7 . . . | Fmaj7 . . . ||')
  })
})
