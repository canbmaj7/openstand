import { describe, expect, test } from 'vitest'
import { arrange } from '../src/engine/arrange'
import { buildTimeline } from '../src/engine/timeline'
import { parseChartFile, validateChart } from '../src/formats/chartFile'
import { chartToChordPro } from '../src/formats/chordpro'
import { parseIrealLinks, parseMusic } from '../src/formats/ireal'
import { chartToMusic, irealLink } from '../src/formats/irealWrite'
import { chartToMusicXml } from '../src/formats/musicxml'
import { chartFromMeasures, type Chart } from '../src/music/chart'
import { switchMode } from '../src/music/mode'
import { parseBarInput, preserveSmall } from '../src/music/notation'
import { transposeChart } from '../src/music/transposeChart'
import { getStyle } from '../src/styles'

function makeChart(bars: Chart['bars']): Chart {
  return {
    format: 'openstand-chart',
    version: 1,
    title: 'Small Chords Test',
    style: 'medium-swing',
    key: 0,
    bpm: 120,
    time: [4, 4],
    bars,
  }
}

describe('iReal Pro small chords (#153)', () => {
  test('parseMusic tracks s/l across bars without misreading sus chords', () => {
    const { bars } = parseMusic('{*AT44sC7,B7,Bb7,A7|N1lD9,   |Bb^7/D  sDbo,|lC-7   |Csus Dsus |sC7sus   Z', [4, 4])
    expect(bars[0].chords).toEqual([
      { symbol: 'C7', beats: 1, small: true },
      { symbol: 'B7', beats: 1, small: true },
      { symbol: 'Bb7', beats: 1, small: true },
      { symbol: 'A7', beats: 1, small: true },
    ])
    expect(bars[1].chords).toEqual([{ symbol: 'D9', beats: 4 }])
    expect('small' in bars[1].chords[0]).toBe(false)

    expect(bars[2].chords).toEqual([
      { symbol: 'Bb^7/D', beats: 3 },
      { symbol: 'Dbo', beats: 1, small: true },
    ])
    expect(bars[3].chords).toEqual([{ symbol: 'C-7', beats: 4 }])
    expect(bars[4].chords).toEqual([
      { symbol: 'Csus', beats: 2 },
      { symbol: 'Dsus', beats: 2 },
    ])
    expect(bars[5].chords).toEqual([{ symbol: 'C7sus', beats: 4, small: true }])
  })

  test('applies small to p, W, and bar repeats (x, r), but never to N.C. (n)', () => {
    // r repeats two bars (bars[3] and bars[4] into bars[5] and bars[6]); |s n starts bar 7
    const { bars } = parseMusic('[T44sC7  p |W/G   |x   |lF7   |G7   |r   |    |s n   |A7   Z', [4, 4])
    expect(bars[0].chords).toEqual([
      { symbol: 'C7', beats: 2, small: true },
      { symbol: 'C7', beats: 2, small: true },
    ])
    expect(bars[1].chords).toEqual([{ symbol: 'C7/G', beats: 4, small: true }])
    expect(bars[2].chords).toEqual([{ symbol: 'C7/G', beats: 4, small: true }])
    expect(bars[3].chords).toEqual([{ symbol: 'F7', beats: 4 }])
    expect(bars[5].chords).toEqual([{ symbol: 'F7', beats: 4 }])
    expect(bars[6].chords).toEqual([{ symbol: 'G7', beats: 4 }])
    expect(bars[7].chords).toEqual([{ symbol: null, beats: 4 }])
    expect('small' in bars[7].chords[0]).toBe(false)
    expect(bars[8].chords).toEqual([{ symbol: 'A7', beats: 4, small: true }])
  })

  test('irealLink round-trips small flags and keeps bar comments attached', () => {
    const chart = makeChart([
      {
        chords: [
          { symbol: 'C7', beats: 1, small: true },
          { symbol: 'B7', beats: 1, small: true },
          { symbol: 'Bb7', beats: 1, small: true },
          { symbol: 'A7', beats: 1, small: true },
        ],
        cells: 4,
        rowStart: true,
        comment: 'Turnaround',
      },
      {
        chords: [
          { symbol: 'D9', beats: 2 },
          { symbol: 'Dbo', beats: 2, small: true },
        ],
        cells: 4,
      },
      { chords: [{ symbol: 'C-7', beats: 4 }], cells: 4 },
      { chords: [{ symbol: 'C7', alt: 'Gb7', beats: 4, small: true }], cells: 4, barline: 'final' },
    ])

    const music = chartToMusic(chart)
    expect(music).toContain('sC7,<Turnaround>B7,Bb7,A7')
    expect(music).toContain('lD9 sDbo')

    const [list] = parseIrealLinks(irealLink([chart]))
    const back = list.charts[0]
    expect(back.bars.map((b) => b.chords)).toEqual(chart.bars.map((b) => b.chords))
    expect(back.bars[0].comment).toBe('Turnaround')
  })

  test('charts without small chords emit identical iReal music without s or l', () => {
    const chart = chartFromMeasures(
      { title: 'Normal', style: 'medium-swing', key: 0, bpm: 120 },
      [['C^7'], ['A-7'], ['D-7', 'G7'], ['C6']],
    )
    expect(chartToMusic(chart)).toBe('[T44C^7   |A-7   |D-7 G7 |C6   Z')
  })

  test('editor preserveSmall keeps small when symbol matches at index and drops it on change', () => {
    const prev = [
      { symbol: 'C7', beats: 2, small: true as const },
      { symbol: 'B7', beats: 2, small: true as const },
    ]
    const sameRes = parseBarInput('C7:3 B7:1', [4, 4])
    expect(sameRes.ok).toBe(true)
    if (sameRes.ok) {
      expect(preserveSmall(sameRes.chords, prev)).toEqual([
        { symbol: 'C7', beats: 3, small: true },
        { symbol: 'B7', beats: 1, small: true },
      ])
    }

    const changedRes = parseBarInput('C7 Bb7', [4, 4])
    expect(changedRes.ok).toBe(true)
    if (changedRes.ok) {
      const merged = preserveSmall(changedRes.chords, prev)
      expect(merged).toEqual([
        { symbol: 'C7', beats: 2, small: true },
        { symbol: 'Bb7', beats: 2 },
      ])
      expect('small' in merged[1]).toBe(false)
    }
  })

  test('.openstand.json validation accepts small: true, drops small: false, and rejects non-booleans', () => {
    const valid = makeChart([{ chords: [{ symbol: 'C7', beats: 4, small: true }], cells: 4 }])
    expect(parseChartFile(JSON.stringify(valid))).toEqual(valid)

    const withFalse = makeChart([{ chords: [{ symbol: 'C7', beats: 4, small: false as unknown as true }], cells: 4 }])
    const parsedFalse = parseChartFile(JSON.stringify(withFalse))
    expect('small' in parsedFalse.bars[0].chords[0]).toBe(false)

    const invalid = { ...valid, bars: [{ chords: [{ symbol: 'C7', beats: 4, small: 'yes' }], cells: 4 }] }
    expect(() => validateChart(invalid)).toThrow(/"small" must be a boolean/)
  })

  test('transpose, mode switch, ChordPro, MusicXML, and audio arrangement preserve or ignore small cleanly', () => {
    const chart = makeChart([
      { chords: [{ symbol: 'C^7', beats: 2 }, { symbol: 'D-7', beats: 2, small: true }], cells: 4, rowStart: true },
      { chords: [{ symbol: 'G7', beats: 4 }], cells: 4, barline: 'final' },
    ])
    expect(transposeChart(chart, 2).bars[0].chords[1]).toEqual({ symbol: 'E-7', beats: 2, small: true })
    expect(switchMode(chart, 'minor').bars[0].chords[1]).toEqual({ symbol: 'Dh7', beats: 2, small: true })

    const plain = makeChart([
      { chords: [{ symbol: 'C^7', beats: 2 }, { symbol: 'D-7', beats: 2 }], cells: 4, rowStart: true },
      { chords: [{ symbol: 'G7', beats: 4 }], cells: 4, barline: 'final' },
    ])
    expect(chartToChordPro(chart)).toBe(chartToChordPro(plain))
    expect(chartToMusicXml(chart)).toBe(chartToMusicXml(plain))
    expect(buildTimeline(chart, 0, 1)).toEqual(buildTimeline(plain, 0, 1))
    expect(String.fromCharCode(...arrange(chart, getStyle('medium-swing'), 0, 1).midi.slice(0, 4))).toBe('MThd')
  })
})
