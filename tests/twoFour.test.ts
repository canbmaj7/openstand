import { describe, expect, test } from 'vitest'
import { arrange, CHANNELS } from '../src/engine/arrange'
import { generateBass } from '../src/engine/bass'
import { PPQ } from '../src/engine/events'
import { buildTimeline, type Bar } from '../src/engine/timeline'
import { mapStyle } from '../src/formats/ireal'
import { chartFromMeasures } from '../src/music/chart'
import { getStyle } from '../src/styles'
import { DRUM_NOTES } from '../src/styles/drums'
import { labFromStyle, styleFromLab } from '../src/styles/lab'
import { withSounds } from '../src/styles/sounds'

interface MidiNote {
  channel: number
  note: number
  velocity: number
  tick: number
}

function readVarLen(bytes: Uint8Array, pos: number): [number, number] {
  let value = 0
  let p = pos
  for (;;) {
    const b = bytes[p++]
    value = (value << 7) | (b & 0x7f)
    if ((b & 0x80) === 0) return [value, p]
  }
}

function midiNotes(midi: Uint8Array): MidiNote[] {
  const view = new DataView(midi.buffer, midi.byteOffset, midi.byteLength)
  const notes: MidiNote[] = []
  let offset = 14
  while (offset < midi.length) {
    const type = String.fromCharCode(...midi.slice(offset, offset + 4))
    const len = view.getUint32(offset + 4)
    offset += 8
    const end = offset + len
    if (type !== 'MTrk') {
      offset = end
      continue
    }
    let tick = 0
    let p = offset
    while (p < end) {
      const [delta, nextP] = readVarLen(midi, p)
      tick += delta
      p = nextP
      const status = midi[p++]
      if (status === 0xff) {
        p++
        const [metaLen, afterLen] = readVarLen(midi, p)
        p = afterLen + metaLen
      } else if (status === 0xf0 || status === 0xf7) {
        const [sysLen, afterLen] = readVarLen(midi, p)
        p = afterLen + sysLen
      } else {
        const cmd = status & 0xf0
        const channel = status & 0x0f
        if (cmd === 0xc0 || cmd === 0xd0) {
          p += 1
        } else {
          const d1 = midi[p++]
          const d2 = midi[p++]
          if (cmd === 0x90 && d2 > 0) notes.push({ channel, note: d1, velocity: d2, tick })
        }
      }
    }
    offset = end
  }
  return notes
}

// Tolerance keeps beat-1 hits humanized slightly early inside their own bar
const inBar = (bar: Bar, tick: number) => tick >= bar.start * PPQ - 30 && tick < (bar.start + bar.beats) * PPQ - 30

const chart = chartFromMeasures({ title: 'Autumn Test', style: 'swing-two-four', key: 0, bpm: 140 }, [
  ['D-7'],
  ['G7'],
  ['C^7'],
  ['E-7', 'A7'],
])

describe('Swing Two/Four', () => {
  test('reuses Medium Swing defaults without modifying Medium Swing itself', () => {
    const twoFour = getStyle('swing-two-four')
    const medium = getStyle('medium-swing')

    expect(medium.firstChorus).toBeUndefined()
    expect(twoFour.id).toBe('swing-two-four')
    expect(twoFour.name).toBe('Swing Two/Four')
    expect(twoFour.family).toBe(medium.family)
    expect(twoFour.swing).toBe(medium.swing)
    expect(twoFour.tempo).toEqual(medium.tempo)
    expect(twoFour.bass).toEqual(medium.bass)
    expect(twoFour.comp).toEqual(medium.comp)
    expect(twoFour.drums).toEqual(medium.drums)
    expect(twoFour.firstChorus).toBeDefined()
  })

  test('plays half-note two-feel with no kick in chorus 1, then walks in four in choruses 2 and 3', () => {
    const style = getStyle('swing-two-four')
    const { midi, timeline } = arrange(chart, style, 0, 3)
    const notes = midiNotes(midi)
    const bassNotes = notes.filter((n) => n.channel === CHANNELS.bass)
    const drumNotes = notes.filter((n) => n.channel === CHANNELS.drums)

    const chorus0Bars = timeline.bars.filter((b) => b.chorus === 0 && b.measure >= 0)
    const chorus1Bars = timeline.bars.filter((b) => b.chorus === 1 && b.measure >= 0)
    const chorus2Bars = timeline.bars.filter((b) => b.chorus === 2 && b.measure >= 0)

    expect(chorus0Bars).toHaveLength(4)
    expect(chorus1Bars).toHaveLength(4)
    expect(chorus2Bars).toHaveLength(4)

    for (const bar of chorus0Bars) {
      const barBass = bassNotes.filter((n) => inBar(bar, n.tick))
      expect(barBass.length, `chorus 0 bar ${bar.measure}`).toBeGreaterThan(0)
      expect(barBass.length, `chorus 0 bar ${bar.measure}`).toBeLessThanOrEqual(2)

      const barKicks = drumNotes.filter((n) => n.note === DRUM_NOTES.kick && inBar(bar, n.tick))
      expect(barKicks, `no kick in chorus 0 bar ${bar.measure}`).toHaveLength(0)

      const barHats = drumNotes.filter((n) => n.note === DRUM_NOTES.hhPedal && inBar(bar, n.tick))
      expect(barHats.length, `hi-hat on 2 & 4 in bar ${bar.measure}`).toBe(2)
    }

    for (const bar of [...chorus1Bars, ...chorus2Bars]) {
      const barBass = bassNotes.filter((n) => inBar(bar, n.tick))
      expect(barBass, `chorus ${bar.chorus} bar ${bar.measure} walks in 4`).toHaveLength(4)
    }

    // Count-in remains unaffected before bar 0
    const countInHits = drumNotes.filter((n) => n.tick < timeline.countIn * PPQ - 30)
    expect(countInHits).toHaveLength(timeline.clicks.length)
    expect(countInHits.every((n) => n.note === DRUM_NOTES.sidestick)).toBe(true)
  })

  test('plays the whole tune in two-feel when choruses = 1', () => {
    const style = getStyle('swing-two-four')
    const { midi, timeline } = arrange(chart, style, 0, 1)
    const notes = midiNotes(midi)
    const bassNotes = notes.filter((n) => n.channel === CHANNELS.bass)
    const drumNotes = notes.filter((n) => n.channel === CHANNELS.drums)

    const playedBars = timeline.bars.filter((b) => b.measure >= 0)
    expect(playedBars).toHaveLength(4)
    for (const bar of playedBars) {
      expect(bassNotes.filter((n) => inBar(bar, n.tick)).length).toBeLessThanOrEqual(2)
      expect(drumNotes.filter((n) => n.note === DRUM_NOTES.kick && inBar(bar, n.tick))).toHaveLength(0)
    }
  })

  test('practice loop plays pass 1 in two-feel and pass 2+ in walking four', () => {
    const style = getStyle('swing-two-four')
    const { midi, timeline } = arrange(chart, style, 0, 2, { loop: [0, 1] })
    const bassNotes = midiNotes(midi).filter((n) => n.channel === CHANNELS.bass)

    for (const bar of timeline.bars.filter((b) => b.chorus === 0 && b.measure >= 0)) {
      expect(bassNotes.filter((n) => inBar(bar, n.tick)).length).toBeLessThanOrEqual(2)
    }
    for (const bar of timeline.bars.filter((b) => b.chorus === 1 && b.measure >= 0)) {
      expect(bassNotes.filter((n) => inBar(bar, n.tick))).toHaveLength(4)
    }
  })

  test('maintains smooth bass register continuity across chorus 1 -> chorus 2 transition', () => {
    const style = getStyle('swing-two-four')
    const timeline = buildTimeline(chart, 0, 2)
    const bassEvents = generateBass(
      timeline.slots,
      style.bass,
      style.swing,
      style.bass,
      style.family,
      style.firstChorus?.bass,
    )

    const chorus0End = timeline.bars.filter((b) => b.chorus === 0 && b.measure >= 0).at(-1)!
    const chorus1Start = timeline.bars.find((b) => b.chorus === 1 && b.measure >= 0)!
    const lastTwoFeel = bassEvents.filter((e) => inBar(chorus0End, e.tick)).at(-1)!
    const firstWalk = bassEvents.filter((e) => inBar(chorus1Start, e.tick))[0]!

    const [low, high] = style.bass.range ?? [28, 55]
    expect(lastTwoFeel.note).toBeGreaterThanOrEqual(low)
    expect(lastTwoFeel.note).toBeLessThanOrEqual(high)
    expect(firstWalk.note).toBeGreaterThanOrEqual(low)
    expect(firstWalk.note).toBeLessThanOrEqual(high)
    expect(Math.abs(firstWalk.note - lastTwoFeel.note)).toBeLessThanOrEqual(12)
  })

  test('maps iReal Pro Swing Two/Four names without breaking Medium Swing, Jazz Waltz, or Country Two-Step', () => {
    expect(mapStyle('Swing Two/Four')).toBe('swing-two-four')
    expect(mapStyle('Two/Four Swing')).toBe('swing-two-four')
    expect(mapStyle('2/4 Swing')).toBe('swing-two-four')
    expect(mapStyle('Swing Two/Four', [3, 4])).toBe('jazz-waltz')
    expect(mapStyle('Medium Swing')).toBe('medium-swing')
    expect(mapStyle('Country Two-Step')).toBe('country')
  })

  test('round-trips through Style Lab and withSounds without errors', () => {
    const style = getStyle('swing-two-four')
    const lab = labFromStyle(style)
    const fromLab = styleFromLab(lab)

    expect(fromLab.firstChorus).toBeUndefined()
    expect(arrange(chart, fromLab, 0, 2).midi.length).toBeGreaterThan(200)

    const guitar = withSounds(style, { bass: 33, comp: 26, drums: 40 })
    expect(guitar.bass.program).toBe(33)
    expect(guitar.firstChorus?.bass?.program).toBe(33)
    expect(guitar.firstChorus?.drums?.kit).toBe(40)
    expect(guitar.comp.voicing).toBe('guitar')
    expect(arrange(chart, guitar, 0, 2).midi.length).toBeGreaterThan(200)
  })
})
