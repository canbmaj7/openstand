import { describe, expect, test } from 'vitest'
import { arrange } from '../src/engine/arrange'
import { BASS_CHANNEL, generateBass } from '../src/engine/bass'
import { generateComp } from '../src/engine/comp'
import { DRUM_CHANNEL, generateDrums } from '../src/engine/drums'
import { PPQ } from '../src/engine/events'
import { buildTimeline } from '../src/engine/timeline'
import { mapStyle } from '../src/formats/ireal'
import { chartFromMeasures } from '../src/music/chart'
import { getStyle, STYLES } from '../src/styles'
import { DRUM_NOTES } from '../src/styles/drums'

const fourFourChart = chartFromMeasures({ title: 'Standard', style: 'gypsy-jazz', key: 0, bpm: 140 }, [
  ['C-7'],
  ['F-7'],
  ['D-7', 'G7'],
  ['C-7'],
])

const hasMidiProgram = (midi: Uint8Array, channel: number, program: number) =>
  midi.some((b, i) => b === (0xc0 | channel) && midi[i + 1] === program)

describe('new styles (gypsy-jazz, bolero, tango)', () => {
  test('all 27 styles are registered with expected comp programs and arrange cleanly', () => {
    expect(STYLES).toHaveLength(27)
    const expectedPrograms: Record<string, number> = {
      'gypsy-jazz': 25,
      bolero: 24,
      tango: 0,
      bachata: 25,
      merengue: 0,
      cumbia: 21,
      gospel: 0,
      'slow-blues': 0,
      disco: 27,
      'rock-12-8': 0,
      soul: 4,
    }
    for (const [id, program] of Object.entries(expectedPrograms)) {
      const style = getStyle(id)
      expect(style.id).toBe(id)
      expect(style.comp.program).toBe(program)
      const { midi } = arrange(fourFourChart, style, 0, 1)
      expect(hasMidiProgram(midi, 1, program), id).toBe(true)
    }
  })

  test('plays the chord root on beat 1 of the first chord in bass for all three styles', () => {
    const timeline = buildTimeline(fourFourChart, 0, 1)
    const firstSlot = timeline.slots.find((s) => s.measure >= 0)!
    expect(firstSlot).toBeDefined()

    for (const id of ['gypsy-jazz', 'bolero', 'tango']) {
      const style = getStyle(id)
      const bass = generateBass(timeline.slots, style.bass, style.swing)
      expect(bass.every((e) => e.channel === BASS_CHANNEL), id).toBe(true)
      const beat1 = bass.find((e) => Math.abs(e.tick / PPQ - firstSlot.start) < 0.08)
      expect(beat1, `${id} beat 1`).toBeDefined()
      expect(beat1!.note % 12, id).toBe(firstSlot.chord.root)
    }
  })

  test('gypsy-jazz la pompe plays shorter staccato hits on beats 2 and 4 than on 1 and 3', () => {
    const style = getStyle('gypsy-jazz')
    expect(style.comp.voicing).toBe('guitar')
    expect(style.swing).toBeGreaterThan(0.5)
    expect(style.swing).toBeLessThan(getStyle('medium-swing').swing)

    const timeline = buildTimeline(fourFourChart, 0, 1)
    const firstSlot = timeline.slots.find((s) => s.measure === 0)!
    const comp = generateComp([firstSlot], style.comp, style.swing, timeline.countIn)

    const durAtBeat = (beat: number) => {
      const note = comp.find((e) => Math.abs(e.tick / PPQ - (firstSlot.start + beat)) < 0.08)
      expect(note, `beat ${beat + 1}`).toBeDefined()
      return note!.duration
    }
    const maxLong = Math.max(durAtBeat(0), durAtBeat(2))
    const minLong = Math.min(durAtBeat(0), durAtBeat(2))
    const maxShort = Math.max(durAtBeat(1), durAtBeat(3))
    expect(maxShort).toBeLessThan(minLong)
    expect(maxLong).toBeGreaterThan(maxShort)

    // Drumless Hot Club groove (count-in sidesticks only)
    const drums = generateDrums(timeline.bars, style.drums, style.swing, timeline.clicks)
    expect(drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)).toHaveLength(0)
  })

  test('bolero percussion channel plays GM bongo high/low notes alongside maracas and claves', () => {
    const style = getStyle('bolero')
    expect(style.comp.voicing).toBe('guitar')
    expect(style.swing).toBe(0.5)

    const timeline = buildTimeline(fourFourChart, 0, 1)
    const drums = generateDrums(timeline.bars, style.drums, style.swing, timeline.clicks)
    expect(drums.every((e) => e.channel === DRUM_CHANNEL)).toBe(true)

    const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ)
    const notes = new Set(grooveHits.map((e) => e.note))
    expect(notes.has(DRUM_NOTES.bongoHigh)).toBe(true)
    expect(notes.has(DRUM_NOTES.bongoLow)).toBe(true)
    expect(notes.has(DRUM_NOTES.shaker)).toBe(true)
    expect(notes.has(DRUM_NOTES.claves)).toBe(true)
  })

  test('tango comp plays accented chords on all 4 beats in marcato mode and has 3-3-2 pattern B', () => {
    const style = getStyle('tango')
    expect(style.comp.voicing).toBe('close')
    expect(style.swing).toBe(0.5)

    const marcatoOnly = {
      ...style.comp,
      rhythms: { ...style.comp.rhythms, '4': [style.comp.rhythms['4']![0]] },
    }
    const timeline = buildTimeline(fourFourChart, 0, 1)
    const firstSlot = timeline.slots.find((s) => s.measure === 0)!
    const comp = generateComp([firstSlot], marcatoOnly, style.swing, timeline.countIn)

    for (const beat of [0, 1, 2, 3]) {
      const hit = comp.find((e) => Math.abs(e.tick / PPQ - (firstSlot.start + beat)) < 0.08)
      expect(hit, `beat ${beat + 1}`).toBeDefined()
    }
    expect(style.comp.rhythms['4']![1].map(([at]) => at)).toEqual([0, 1.5, 3])
  })

  test('maps iReal Pro style names for Gypsy Jazz, Bolero, and Tango without breaking Bossa Nova', () => {
    expect(mapStyle('Gypsy Jazz')).toBe('gypsy-jazz')
    expect(mapStyle('Manouche')).toBe('gypsy-jazz')
    expect(mapStyle('Bolero')).toBe('bolero')
    expect(mapStyle('Latin-Cuba: Bolero')).toBe('bolero')
    expect(mapStyle('Bolero', [3, 4])).toBe('bolero')
    expect(mapStyle('Tango')).toBe('tango')
    expect(mapStyle('Tango', [3, 4])).toBe('tango')
    expect(mapStyle('Bossa Nova')).toBe('bossa-nova')
  })
})
