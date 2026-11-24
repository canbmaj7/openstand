import { describe, expect, test } from 'vitest'
import { backingTrack, chartFromMeasures, irealLink } from '../packages/engine/src/index'

function findTempoMicros(midi: Uint8Array): number | null {
  for (let i = 0; i <= midi.length - 6; i++) {
    if (midi[i] === 0xff && midi[i + 1] === 0x51 && midi[i + 2] === 0x03) {
      return (midi[i + 3] << 16) | (midi[i + 4] << 8) | midi[i + 5]
    }
  }
  return null
}

const sampleChart = chartFromMeasures({ title: 'Package Blues', style: 'medium-swing', key: 5, bpm: 132 }, [
  ['F7'],
  ['Bb7'],
  ['F7'],
  ['C-7', 'F7'],
])

const shortIreal = `irealb://${encodeURIComponent(
  ['Test Tune', 'Writer Some', '', 'Bossa Nova', 'C', '', '1r34LbKcu7{*AT44C^7   |A-7   |D-7 G7 |C6   Z', '', '128', '0'].join(
    '=',
  ),
)}`

describe('@openstand/engine package', () => {
  test('generates a valid MIDI backing track from a Chart with defaults', () => {
    const result = backingTrack({ chart: sampleChart })
    expect(String.fromCharCode(...result.midi.slice(0, 4))).toBe('MThd')
    expect(result.timeline.slots.length).toBeGreaterThan(0)
    expect(result.style.id).toBe('medium-swing')
    expect(result.chart.title).toBe('Package Blues')
    expect(findTempoMicros(result.midi)).toBe(Math.round(60_000_000 / 132))
    // Default 3 choruses * 4 bars + 1 ending bar = 13 bars
    expect(result.timeline.bars).toHaveLength(13)
  })

  test('generates a backing track from an irealb:// link with style and bpm overrides', () => {
    const result = backingTrack({ ireal: shortIreal, style: 'funk', bpm: 160, choruses: 2 })
    expect(String.fromCharCode(...result.midi.slice(0, 4))).toBe('MThd')
    expect(result.timeline.slots.length).toBeGreaterThan(0)
    expect(result.chart.title).toBe('Test Tune')
    expect(result.style.id).toBe('funk')
    expect(findTempoMicros(result.midi)).toBe(Math.round(60_000_000 / 160))
  })

  test('round-trips a chart through irealLink into backingTrack', () => {
    const link = irealLink([sampleChart])
    const result = backingTrack({ ireal: link })
    expect(result.chart.title).toBe('Package Blues')
    expect(result.style.id).toBe('medium-swing')
    expect(findTempoMicros(result.midi)).toBe(Math.round(60_000_000 / 132))
  })
})
