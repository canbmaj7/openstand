import { describe, expect, test } from 'vitest'
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

const chart = chartFromMeasures({ title: 'Brazil Check', style: 'partido-alto', key: 0, bpm: 108 }, [
  ['C^7'],
  ['A7'],
  ['D-7'],
  ['G7'],
])

const hasMidiProgram = (midi: Uint8Array, channel: number, program: number) =>
  midi.some((b, i) => b === (0xc0 | channel) && midi[i + 1] === program)

describe('partido-alto, baiao, and choro styles', () => {
  test('registers all three styles with expected metadata and comp programs', () => {
    const expected: Array<[string, string, number]> = [
      ['partido-alto', 'Partido Alto', 24],
      ['baiao', 'Baião', 21],
      ['choro', 'Choro', 25],
    ]
    for (const [id, name, program] of expected) {
      const style = getStyle(id)
      expect(style.id).toBe(id)
      expect(style.name).toBe(name)
      expect(style.family).toBe('latin')
      expect(style.swing).toBe(0.5)
      expect(style.comp.program).toBe(program)
      expect(hasMidiProgram(arrange(chart, style, 0, 1).midi, 1, program), id).toBe(true)
    }
  })

  test('plays the chord root on beat 1 of the first chord in bass for all three styles', () => {
    const timeline = buildTimeline(chart, 0, 1)
    const firstSlot = timeline.slots.find((s) => s.measure >= 0)!
    expect(firstSlot).toBeDefined()

    for (const id of ['partido-alto', 'baiao', 'choro']) {
      const style = getStyle(id)
      const bass = generateBass(timeline.slots, style.bass, style.swing)
      expect(bass.every((e) => e.channel === BASS_CHANNEL), id).toBe(true)
      const beat1 = bass.find((e) => Math.abs(e.tick / PPQ - firstSlot.start) < 0.08)
      expect(beat1, `${id} beat 1`).toBeDefined()
      expect(beat1!.note % 12, id).toBe(firstSlot.chord.root)
    }
  })

  test('partido-alto comp plays a 2-bar cycle with syncopated 16th-note hits (x.25 or x.75)', () => {
    const style = getStyle('partido-alto')
    expect(style.comp.voicing).toBe('guitar')
    expect(style.comp.twoBar?.length).toBeGreaterThan(0)

    const timeline = buildTimeline(chart, 0, 1)
    const slots = timeline.slots.filter((s) => s.measure >= 0)
    const events = generateComp(slots, style.comp, style.swing, timeline.countIn)
    const playedBars = timeline.bars.filter((b) => b.measure >= 0)

    const sixteenthsInBar = (barStart: number) =>
      events
        .map((e) => Math.round((e.tick / PPQ - barStart) * 4) / 4)
        .filter((pos) => pos >= 0 && pos < 4 && (Math.abs((pos % 1) - 0.25) < 0.05 || Math.abs((pos % 1) - 0.75) < 0.05))

    expect(sixteenthsInBar(playedBars[0].start).length).toBeGreaterThan(0)
    expect(sixteenthsInBar(playedBars[1].start).length).toBeGreaterThan(0)
  })

  test('baiao drums play open and muted triangle 16th notes across middle bars', () => {
    const style = getStyle('baiao')
    const timeline = buildTimeline(chart, 0, 2)
    const drums = generateDrums(timeline.bars, style.drums, style.swing, timeline.clicks)
    expect(drums.every((e) => e.channel === DRUM_CHANNEL)).toBe(true)
    const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)

    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isLast)
    for (const bar of middleBars) {
      for (let i = 0; i < 16; i++) {
        const beat = bar.start + i * 0.25
        const expectedNote = i % 2 === 0 ? DRUM_NOTES.triangleOpen : DRUM_NOTES.triangleMute
        const hit = grooveHits.find((e) => e.note === expectedNote && Math.abs(e.tick / PPQ - beat) < 0.08)
        expect(hit, `baiao triangle at bar ${bar.start} step ${i}`).toBeDefined()
      }
    }
  })

  test('choro drums play tambourine 16th notes across middle bars', () => {
    const style = getStyle('choro')
    const timeline = buildTimeline(chart, 0, 2)
    const drums = generateDrums(timeline.bars, style.drums, style.swing, timeline.clicks)
    const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)

    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isLast)
    for (const bar of middleBars) {
      for (let i = 0; i < 16; i++) {
        const beat = bar.start + i * 0.25
        const hit = grooveHits.find((e) => e.note === DRUM_NOTES.tambourine && Math.abs(e.tick / PPQ - beat) < 0.08)
        expect(hit, `choro tambourine at bar ${bar.start} step ${i}`).toBeDefined()
      }
    }
  })

  test('maps iReal Pro style names for Partido Alto, Baião, and Choro without breaking Samba or Bossa Nova', () => {
    expect(mapStyle('Latin-Brazil: Partido Alto')).toBe('partido-alto')
    expect(mapStyle('Baiao')).toBe('baiao')
    expect(mapStyle('Baião')).toBe('baiao')
    expect(mapStyle('Choro')).toBe('choro')
    expect(mapStyle('Samba')).toBe('samba')
    expect(mapStyle('Samba Funk')).toBe('samba')
    expect(mapStyle('Bossa Nova')).toBe('bossa-nova')
  })
})
