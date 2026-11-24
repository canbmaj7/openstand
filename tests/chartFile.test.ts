import { describe, expect, test } from 'vitest'
import { chartToFile, parseChartFile } from '../src/formats/chartFile'
import { chartFromMeasures } from '../src/music/chart'
import { updateBar } from '../src/music/edit'

const sample = updateBar(
  updateBar(
    chartFromMeasures(
      { title: 'Blues in F', composer: 'Traditional', style: 'medium-swing', key: 5, bpm: 140 },
      [['F7'], ['Bb7', 'Bo7'], [], ['C-7', 'F7']],
    ),
    0,
    { rowStart: true, section: 'A', repeatStart: true },
  ),
  3,
  { repeatEnd: true, repeatTimes: 2 },
)

describe('chartFile (.openstand.json)', () => {
  test('round-trips a chart identically through chartToFile and parseChartFile', () => {
    const json = chartToFile(sample)
    expect(parseChartFile(json)).toEqual(sample)
  })

  test('throws readable errors for non-JSON, wrong format, or missing/invalid bars', () => {
    expect(() => parseChartFile('{ not json')).toThrow(/Invalid JSON/i)

    const wrongFormat = JSON.stringify({ ...sample, format: 'something-else' })
    expect(() => parseChartFile(wrongFormat)).toThrow(/openstand-chart/i)

    const wrongVersion = JSON.stringify({ ...sample, version: 2 })
    expect(() => parseChartFile(wrongVersion)).toThrow(/version 1/i)

    const { bars: _, ...withoutBars } = sample
    expect(() => parseChartFile(JSON.stringify(withoutBars))).toThrow(/bars/i)

    const badBar = JSON.stringify({ ...sample, bars: [{ chords: 'nope', cells: 4 }] })
    expect(() => parseChartFile(badBar)).toThrow(/chords/i)

    const badCells = JSON.stringify({ ...sample, bars: [{ chords: [], cells: 0 }] })
    expect(() => parseChartFile(badCells)).toThrow(/cells/i)
  })
})
