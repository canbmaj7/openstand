import { afterEach, describe, expect, test, vi } from 'vitest'
import { arrange } from '../src/engine/arrange'
import { BASS_CHANNEL, generateBass } from '../src/engine/bass'
import { generateComp } from '../src/engine/comp'
import { DRUM_CHANNEL, generateDrums } from '../src/engine/drums'
import { PPQ } from '../src/engine/events'
import { buildTimeline } from '../src/engine/timeline'
import { mapStyle } from '../src/formats/ireal'
import { chartFromMeasures } from '../src/music/chart'
import { getStyle } from '../src/styles'
import { DRUM_NOTES } from '../src/styles/drums'

const chart = chartFromMeasures({ title: 'World Four', style: 'ska', key: 0, bpm: 140 }, [
  ['C'],
  ['F'],
  ['G7'],
  ['C'],
])

const hasMidiProgram = (midi: Uint8Array, channel: number, program: number) =>
  midi.some((b, i) => b === (0xc0 | channel) && midi[i + 1] === program)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('bluegrass, calypso, and ska styles', () => {
  test('register expected families, straight feel, tempo ranges, and comp programs', () => {
    const bluegrass = getStyle('bluegrass')
    expect(bluegrass.id).toBe('bluegrass')
    expect(bluegrass.name).toBe('Bluegrass')
    expect(bluegrass.swing).toBe(0.5)
    expect(bluegrass.comp.program).toBe(25)

    const calypso = getStyle('calypso')
    expect(calypso.id).toBe('calypso')
    expect(calypso.name).toBe('Calypso')
    expect(calypso.family).toBe('latin')
    expect(calypso.swing).toBe(0.5)
    expect(calypso.comp.program).toBe(0)

    const ska = getStyle('ska')
    expect(ska.id).toBe('ska')
    expect(ska.name).toBe('Ska')
    expect(ska.family).toBe('world')
    expect(ska.swing).toBe(0.5)
    expect(ska.comp.program).toBe(0)

    expect(hasMidiProgram(arrange(chart, bluegrass, 0, 1).midi, 1, 25)).toBe(true)
    expect(hasMidiProgram(arrange(chart, calypso, 0, 1).midi, 1, 0)).toBe(true)
    expect(hasMidiProgram(arrange(chart, ska, 0, 1).midi, 1, 0)).toBe(true)
  })

  test('plays the chord root on beat 1 of the first chord in bass for all three styles', () => {
    const timeline = buildTimeline(chart, 0, 1)
    const firstSlot = timeline.slots.find((s) => s.measure >= 0)!
    expect(firstSlot).toBeDefined()

    for (const id of ['bluegrass', 'calypso', 'ska']) {
      const style = getStyle(id)
      const bass = generateBass(timeline.slots, style.bass, style.swing)
      expect(bass.every((e) => e.channel === BASS_CHANNEL), id).toBe(true)
      const beat1 = bass.find((e) => Math.abs(e.tick / PPQ - firstSlot.start) < 0.08)
      expect(beat1, `${id} beat 1`).toBeDefined()
      expect(beat1!.note % 12, id).toBe(firstSlot.chord.root)
    }
  })

  test('bluegrass plays no drum hits after count-in and supports crisp backbeat chops', () => {
    const bluegrass = getStyle('bluegrass')
    const timeline = buildTimeline(chart, 0, 1)
    const drums = generateDrums(timeline.bars, bluegrass.drums, bluegrass.swing, timeline.clicks)
    expect(drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)).toHaveLength(0)

    const chopPattern = bluegrass.comp.rhythms['4']![0]
    expect(chopPattern.map(([at]) => at)).toEqual([1, 3])
    expect(chopPattern.every(([, dur]) => dur <= 0.2)).toBe(true)
  })

  test('ska comp hits land on the "&" off-beats (x.5)', () => {
    const ska = getStyle('ska')
    const timeline = buildTimeline(chart, 0, 1)
    const firstSlot = timeline.slots.find((s) => s.measure === 0)!
    const comp = generateComp([firstSlot], ska.comp, ska.swing, timeline.countIn)
    expect(comp.length).toBeGreaterThan(0)

    const beats = [...new Set(comp.map((e) => Math.round(((e.tick / PPQ - firstSlot.start) * 4)) / 4))]
    expect(beats.every((b) => Math.abs((b % 1) - 0.5) < 0.05)).toBe(true)
    expect(beats).toEqual([0.5, 1.5, 2.5, 3.5])
  })

  test('calypso percussion plays shaker alongside cowbell or claves', () => {
    const calypso = getStyle('calypso')
    const timeline = buildTimeline(chart, 0, 2)

    for (const randomValue of [0.49, 0.5]) {
      vi.spyOn(Math, 'random').mockReturnValue(randomValue)
      const drums = generateDrums(timeline.bars, calypso.drums, calypso.swing, timeline.clicks)
      expect(drums.every((e) => e.channel === DRUM_CHANNEL)).toBe(true)

      const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ)
      const notes = new Set(grooveHits.map((e) => e.note))
      expect(notes.has(DRUM_NOTES.shaker)).toBe(true)
      expect(notes.has(DRUM_NOTES.cowbell) || notes.has(DRUM_NOTES.claves)).toBe(true)
      vi.restoreAllMocks()
    }
  })

  test('maps iReal Pro Bluegrass, Calypso, Soca, and Ska names without breaking existing mappings', () => {
    expect(mapStyle('Bluegrass')).toBe('bluegrass')
    expect(mapStyle('Pop-Bluegrass')).toBe('bluegrass')
    expect(mapStyle('Bluegrass Ballad')).toBe('pop-rock')
    expect(mapStyle('Country')).toBe('country')
    expect(mapStyle('Calypso')).toBe('calypso')
    expect(mapStyle('Latin-Calypso')).toBe('calypso')
    expect(mapStyle('Soca')).toBe('calypso')
    expect(mapStyle('Ska')).toBe('ska')
    expect(mapStyle('Reggae')).toBe('reggae')
    expect(mapStyle('Latin-Salsa')).toBe('afro-cuban')
    expect(mapStyle('Basket')).toBe('medium-swing')
    expect(mapStyle('Medium Swing')).toBe('medium-swing')
  })
})
