import { BasicMIDI } from 'spessasynth_core'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { arrange, CHANNELS } from '../src/engine/arrange'
import { toTicks } from '../src/engine/events'
import { chartFromMeasures } from '../src/music/chart'
import { closestSwingFeel, SWING_FEELS, swingLabel, swingRatioForId, withSwing } from '../src/music/swingFeel'
import { getStyle } from '../src/styles'
import { DRUM_NOTES } from '../src/styles/drums'

function readDrumNoteOnTicks(midi: Uint8Array, note: number): number[] {
  const parsed = BasicMIDI.fromArrayBuffer(midi.slice().buffer)
  const drumTrack = parsed.tracks.find((t) => t.channels.has(CHANNELS.drums))
  if (!drumTrack) return []
  return drumTrack.events
    .filter((e) => e.statusByte === (0x90 | CHANNELS.drums) && e.data[0] === note && e.data[1] > 0)
    .map((e) => e.ticks)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('swingFeel', () => {
  test('withSwing returns the same style object for undefined and overrides swing while preserving fields', () => {
    const style = getStyle('swing-two-four')
    expect(withSwing(style, undefined)).toBe(style)

    const straight = withSwing(style, 0.5)
    expect(straight).not.toBe(style)
    expect(straight.swing).toBe(0.5)
    expect(straight.id).toBe(style.id)
    expect(straight.firstChorus).toBe(style.firstChorus)
    expect(straight.bass).toBe(style.bass)
    expect(straight.comp).toBe(style.comp)
    expect(straight.drums).toBe(style.drums)
  })

  test('swingLabel formats 0.5 as straight and other ratios as rounded percentages', () => {
    expect(swingLabel(0.5)).toBe('straight')
    expect(swingLabel(0.58)).toBe('58%')
    expect(swingLabel(0.64)).toBe('64%')
    expect(swingLabel(0.66)).toBe('66%')
    expect(swingLabel(0.7)).toBe('70%')
  })

  test('closestSwingFeel and swingRatioForId resolve presets safely', () => {
    expect(SWING_FEELS.map((f) => f.id)).toEqual(['straight', 'light', 'medium', 'heavy'])
    expect(closestSwingFeel(0.5).id).toBe('straight')
    expect(closestSwingFeel(0.66).id).toBe('medium')
    expect(closestSwingFeel(0.72).id).toBe('heavy')
    expect(swingRatioForId('heavy')).toBe(0.7)
    expect(swingRatioForId('')).toBeUndefined()
  })

  test('arrange shifts off-beat eighth ride hits between 0.5 (exact half-beat) and 0.7', () => {
    const chart = chartFromMeasures({ title: 'Swing Test', style: 'medium-swing', key: 0, bpm: 120 }, [
      ['C^7'],
      ['A-7'],
      ['D-7'],
      ['G7'],
    ])
    const style = getStyle('medium-swing')

    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const straight = arrange(chart, withSwing(style, 0.5), 0, 1, { countIn: 'off' })
    const heavy = arrange(chart, withSwing(style, 0.7), 0, 1, { countIn: 'off' })

    const straightRide = readDrumNoteOnTicks(straight.midi, DRUM_NOTES.ride)
    const heavyRide = readDrumNoteOnTicks(heavy.midi, DRUM_NOTES.ride)

    // Measure 1 (bar index 1, starting at beat 4) uses middle groove with ride on beats 0, 1, 1.5, 2, 3, 3.5
    const bar = straight.timeline.bars[1]
    const barStartTick = toTicks(bar.start)
    const barEndTick = toTicks(bar.start + bar.beats)

    const straightOffsets = straightRide.filter((t) => t >= barStartTick && t < barEndTick).map((t) => t - barStartTick)
    const heavyOffsets = heavyRide.filter((t) => t >= barStartTick && t < barEndTick).map((t) => t - barStartTick)

    expect(straightOffsets).toEqual([toTicks(0), toTicks(1), toTicks(1.5), toTicks(2), toTicks(3), toTicks(3.5)])
    expect(heavyOffsets).toEqual([toTicks(0), toTicks(1), toTicks(1.7), toTicks(2), toTicks(3), toTicks(3.7)])
    expect(heavyOffsets).not.toEqual(straightOffsets)
  })
})
