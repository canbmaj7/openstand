import { describe, expect, test } from 'vitest'
import { arrange, BASE_BPM } from '../src/engine/arrange'
import { chartFromMeasures } from '../src/music/chart'
import { getStyle } from '../src/styles'

const tune = chartFromMeasures({ title: 'Blues', style: 'medium-swing', key: 5, bpm: 140 }, [
  ['F7'],
  ['Bb7'],
  ['F7'],
  ['C-7', 'F7'],
])

// Reads the first FF 51 03 <mpqn> Set Tempo meta event from an SMF byte array
function findTempoMicros(midi: Uint8Array): number | null {
  for (let i = 0; i <= midi.length - 6; i++) {
    if (midi[i] === 0xff && midi[i + 1] === 0x51 && midi[i + 2] === 0x03) {
      return (midi[i + 3] << 16) | (midi[i + 4] << 8) | midi[i + 5]
    }
  }
  return null
}

describe('arrange MIDI tempo', () => {
  test('defaults to BASE_BPM when no tempo is given', () => {
    const { midi } = arrange(tune, getStyle('medium-swing'), 0, 1)
    expect(String.fromCharCode(...midi.slice(0, 4))).toBe('MThd')
    expect(findTempoMicros(midi)).toBe(Math.round(60_000_000 / BASE_BPM))
  })

  test('writes the requested tempo meta event (FF 51 03) when bpm is provided', () => {
    for (const bpm of [88, 140, 210]) {
      const { midi } = arrange(tune, getStyle('medium-swing'), 0, 1, {}, bpm)
      expect(findTempoMicros(midi)).toBe(Math.round(60_000_000 / bpm))
    }
  })
})
