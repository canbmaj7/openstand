import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BasicMIDI } from 'spessasynth_core'
import { describe, expect, test, vi } from 'vitest'
import { masterGainFor } from '../src/audio/player'
import { renderWav } from '../src/audio/renderWav'
import { arrange, CHANNELS } from '../src/engine/arrange'
import { PPQ, toTicks } from '../src/engine/events'
import { writeMidi, type TrackSpec } from '../src/engine/midiWriter'
import { chartFromMeasures } from '../src/music/chart'
import { getStyle } from '../src/styles'

const tune = chartFromMeasures(
  { title: 'Ramp Blues', style: 'medium-swing', key: 5, bpm: 120, time: [4, 4] },
  [['F7'], ['Bb7'], ['F7'], ['C-7', 'F7']],
)

const style = getStyle('medium-swing')

function mpqn(bpm: number): number {
  return Math.round(60_000_000 / bpm)
}

function readTempoTrackEvents(midi: Uint8Array): { tick: number; mpqn: number }[] {
  const view = new DataView(midi.buffer, midi.byteOffset, midi.byteLength)
  const headerLen = view.getUint32(4)
  const track0Start = 8 + headerLen
  expect(String.fromCharCode(...midi.subarray(track0Start, track0Start + 4))).toBe('MTrk')
  const trackLen = view.getUint32(track0Start + 4)
  let pos = track0Start + 8
  const trackEnd = pos + trackLen

  const readVarLen = () => {
    let value = 0
    while (pos < trackEnd) {
      const b = midi[pos++]
      value = (value << 7) | (b & 0x7f)
      if ((b & 0x80) === 0) break
    }
    return value
  }

  let tick = 0
  const tempos: { tick: number; mpqn: number }[] = []
  while (pos < trackEnd) {
    tick += readVarLen()
    const status = midi[pos++]
    if (status === 0xff) {
      const metaType = midi[pos++]
      const len = readVarLen()
      if (metaType === 0x51 && len === 3) {
        tempos.push({ tick, mpqn: (midi[pos] << 16) | (midi[pos + 1] << 8) | midi[pos + 2] })
      }
      pos += len
    } else if (status === 0xf0 || status === 0xf7) {
      pos += readVarLen()
    }
  }
  return tempos
}

function loadSoundBank(): ArrayBuffer {
  const bytes = readFileSync(resolve(process.cwd(), 'public/soundfonts/openstand.sf3'))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('export tempo ramp', () => {
  test('writes FF 51 tempo changes at chorus starts when ramp every=1 across 3 choruses', () => {
    const { midi, timeline } = arrange(tune, style, 0, 3, { countIn: 'off' }, 120, {
      ramp: { bpm: 10, every: 1 },
    })
    const chorusStarts = timeline.bars.filter((b) => b.isFirst && b.measure >= 0).map((b) => toTicks(b.start))
    expect(chorusStarts).toEqual([0, 16 * PPQ, 32 * PPQ])
    expect(readTempoTrackEvents(midi)).toEqual([
      { tick: 0, mpqn: mpqn(120) },
      { tick: 16 * PPQ, mpqn: mpqn(130) },
      { tick: 32 * PPQ, mpqn: mpqn(140) },
    ])
  })

  test('writes only 2 FF 51 events for every=2 across 4 choruses and clamps at 300 bpm', () => {
    const { midi } = arrange(tune, style, 0, 4, { countIn: 'off' }, 120, {
      ramp: { bpm: 10, every: 2 },
    })
    expect(readTempoTrackEvents(midi)).toEqual([
      { tick: 0, mpqn: mpqn(120) },
      { tick: 32 * PPQ, mpqn: mpqn(130) },
    ])

    const clamped = arrange(tune, style, 0, 3, { countIn: 'off' }, 290, {
      ramp: { bpm: 20, every: 1 },
    })
    expect(readTempoTrackEvents(clamped.midi)).toEqual([
      { tick: 0, mpqn: mpqn(290) },
      { tick: 16 * PPQ, mpqn: mpqn(300) },
    ])
  })

  test('keeps a single tempo and identical MIDI bytes when ramp is omitted or disabled', () => {
    const tracks: TrackSpec[] = [
      {
        name: 'Bass',
        channel: 0,
        program: 32,
        events: [{ tick: 0, channel: 0, note: 41, velocity: 90, duration: 240 }],
      },
    ]
    const baseline = writeMidi(120, tracks)
    expect(writeMidi(120, tracks, undefined)).toEqual(baseline)
    expect(writeMidi(120, tracks, [])).toEqual(baseline)
    expect(writeMidi(120, tracks, [{ tick: 0, bpm: 200 }])).toEqual(baseline)

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    try {
      const noOpt = arrange(tune, style, 0, 3, { countIn: 'off' }, 120)
      const emptyOpt = arrange(tune, style, 0, 3, { countIn: 'off' }, 120, {})
      const zeroRamp = arrange(tune, style, 0, 3, { countIn: 'off' }, 120, { ramp: { bpm: 0, every: 1 } })
      expect(readTempoTrackEvents(noOpt.midi)).toEqual([{ tick: 0, mpqn: mpqn(120) }])
      expect(emptyOpt.midi).toEqual(noOpt.midi)
      expect(zeroRamp.midi).toEqual(noOpt.midi)
    } finally {
      randomSpy.mockRestore()
    }
  })

  test('keeps initial tempo at tick 0 when count-in is present and shifts chorus changes after count-in', () => {
    const { midi, timeline } = arrange(tune, style, 0, 3, { countIn: 2 }, 120, {
      ramp: { bpm: 10, every: 1 },
    })
    expect(timeline.countIn).toBe(8)
    expect(readTempoTrackEvents(midi)).toEqual([
      { tick: 0, mpqn: mpqn(120) },
      { tick: (8 + 16) * PPQ, mpqn: mpqn(130) },
      { tick: (8 + 32) * PPQ, mpqn: mpqn(140) },
    ])
  })

  test('renders shorter MIDI and WAV durations with spessasynth_core when ramp is active', { timeout: 60_000 }, async () => {
    const flat = arrange(tune, style, 0, 3, { countIn: 'off' }, 120)
    const ramped = arrange(tune, style, 0, 3, { countIn: 'off' }, 120, { ramp: { bpm: 30, every: 1 } })

    const flatMidi = BasicMIDI.fromArrayBuffer(flat.midi.slice().buffer)
    const rampedMidi = BasicMIDI.fromArrayBuffer(ramped.midi.slice().buffer)
    // 16 beats @120 (8s) + 16 @150 (6.4s) + 16 beats + 4-beat ending @180 (6.67s) ≈ 21.07s vs 26s flat
    expect(rampedMidi.duration).toBeLessThan(flatMidi.duration - 4)

    const options = {
      volumes: { [CHANNELS.bass]: 110, [CHANNELS.comp]: 85, [CHANNELS.drums]: 95 },
      masterGain: masterGainFor(100),
    }
    const soundBank = loadSoundBank()
    const [flatWav, rampedWav] = await Promise.all([
      renderWav(flat.midi, soundBank, options),
      renderWav(ramped.midi, soundBank, options),
    ])

    const wavSeconds = (wav: Uint8Array) => new DataView(wav.buffer, wav.byteOffset, wav.byteLength).getUint32(40, true) / (44100 * 2 * 2)
    expect(wavSeconds(rampedWav)).toBeLessThan(wavSeconds(flatWav) - 4)
    expect(Math.abs(wavSeconds(rampedWav) - (rampedMidi.duration + 2))).toBeLessThan(0.1)
  })
})
