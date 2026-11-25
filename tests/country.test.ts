import { describe, expect, test } from 'vitest'
import { arrange } from '../src/engine/arrange'
import { BASS_CHANNEL, generateBass } from '../src/engine/bass'
import { DRUM_CHANNEL, generateDrums } from '../src/engine/drums'
import { PPQ } from '../src/engine/events'
import { buildTimeline } from '../src/engine/timeline'
import { mapStyle } from '../src/formats/ireal'
import { chartFromMeasures } from '../src/music/chart'
import { EXAMPLES } from '../src/music/songs'
import { getStyle } from '../src/styles'
import { DRUM_NOTES } from '../src/styles/drums'

const fourFourCountry = chartFromMeasures({ title: 'Test Two-Step', style: 'country', key: 7, bpm: 132 }, [
  ['G'],
  ['G'],
  ['C'],
  ['G'],
  ['G'],
  ['D7'],
  ['C'],
  ['D7'],
])

describe('country style', () => {
  test('uses straight eighths, steel-string guitar (GM 25) with guitar voicing, and expected tempo range', () => {
    const style = getStyle('country')
    expect(style.id).toBe('country')
    expect(style.name).toBe('Country')
    expect(style.swing).toBe(0.5)
    expect(style.tempo).toEqual({ default: 120, min: 90, max: 180 })
    expect(style.comp.program).toBe(25)
    expect(style.comp.voicing).toBe('guitar')

    const { midi } = arrange(fourFourCountry, style, 0, 1)
    const hasCompProgram25 = midi.some((b, i) => b === 0xc1 && midi[i + 1] === 25)
    expect(hasCompProgram25).toBe(true)
  })

  test('plays root on beat 1 and fifth on beat 3 in 4-beat bass bars', () => {
    const style = getStyle('country')
    const timeline = buildTimeline(fourFourCountry, 0, 2)
    const events = generateBass(timeline.slots, style.bass, style.swing)
    expect(events.every((e) => e.channel === BASS_CHANNEL)).toBe(true)

    const fourBeatSlots = timeline.slots.filter((s) => s.measure >= 0 && s.beats === 4)
    expect(fourBeatSlots.length).toBeGreaterThan(0)

    for (const slot of fourBeatSlots) {
      const barNotes = events.filter((e) => {
        const beat = e.tick / PPQ - slot.start
        return beat > -0.1 && beat < 3.9
      })
      const beat1 = barNotes.find((e) => Math.abs(e.tick / PPQ - slot.start) < 0.1)
      const beat3 = barNotes.find((e) => Math.abs(e.tick / PPQ - (slot.start + 2)) < 0.1)

      expect(beat1, `beat 1 at slot ${slot.start}`).toBeDefined()
      expect(beat3, `beat 3 at slot ${slot.start}`).toBeDefined()
      expect(beat1!.note % 12).toBe(slot.chord.root)
      expect(beat3!.note % 12).toBe((slot.chord.root + 7) % 12)
    }
  })

  test('drums play train-beat snare eighths with accents on beats 2 and 4', () => {
    const style = getStyle('country')
    const timeline = buildTimeline(fourFourCountry, 0, 2)
    // Run the train-beat groove deterministically through generateDrums
    const trainOnlyDrums = {
      ...style.drums,
      grooves: { ...style.drums.grooves, middle: [style.drums.grooves.middle[0]] },
    }
    const events = generateDrums(timeline.bars, trainOnlyDrums, style.swing, timeline.clicks)
    expect(events.every((e) => e.channel === DRUM_CHANNEL)).toBe(true)

    const middleBars = timeline.bars.filter((b) => !b.isFirst && !b.isLast && b.measure >= 0)
    expect(middleBars.length).toBeGreaterThan(0)

    for (const bar of middleBars) {
      const snares = events
        .filter((e) => e.note === DRUM_NOTES.snare)
        .map((e) => ({ at: Math.round((e.tick / PPQ - bar.start) * 4) / 4, vel: e.velocity }))
        .filter((h) => h.at >= 0 && h.at < 4)

      const eighths = new Set(snares.filter((h) => Number.isInteger(h.at * 2)).map((h) => h.at))
      expect(eighths).toEqual(new Set([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]))

      const backbeats = snares.filter((h) => h.at === 1 || h.at === 3)
      const others = snares.filter((h) => h.at !== 1 && h.at !== 3)
      expect(Math.min(...backbeats.map((h) => h.vel))).toBeGreaterThan(Math.max(...others.map((h) => h.vel)))
    }
  })

  test('maps iReal Pro Country, Bluegrass, Folk, Western, Two-Step and Train names to country', () => {
    expect(mapStyle('Country')).toBe('country')
    expect(mapStyle('Bluegrass')).toBe('country')
    expect(mapStyle('Western Swing')).toBe('medium-swing')
    expect(mapStyle('Folk')).toBe('country')
    expect(mapStyle('Western')).toBe('country')
    expect(mapStyle('Two-Step')).toBe('country')
    expect(mapStyle('Train Beat')).toBe('country')
    expect(mapStyle('Country Waltz', [3, 4])).toBe('country')
    expect(mapStyle('Country Ballad')).toBe('pop-rock')
    expect(mapStyle('Country Ballad', [3, 4])).toBe('pop-rock')
  })

  test('includes the Country Two-Step 16-bar example tune in G', () => {
    const tune = EXAMPLES.find((t) => t.id === 'country-g')
    expect(tune).toBeDefined()
    expect(tune!.chart.title).toBe('Country Two-Step')
    expect(tune!.chart.style).toBe('country')
    expect(tune!.chart.key).toBe(7)
    expect(tune!.chart.bars).toHaveLength(16)
    expect(arrange(tune!.chart, getStyle('country'), 0, 2).midi.length).toBeGreaterThan(200)
  })
})
