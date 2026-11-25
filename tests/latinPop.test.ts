import { describe, expect, test } from 'vitest'
import { arrange } from '../src/engine/arrange'
import { BASS_CHANNEL, generateBass } from '../src/engine/bass'
import { DRUM_CHANNEL, generateDrums } from '../src/engine/drums'
import { PPQ } from '../src/engine/events'
import { buildTimeline } from '../src/engine/timeline'
import { mapStyle } from '../src/formats/ireal'
import { chartFromMeasures } from '../src/music/chart'
import { getStyle } from '../src/styles'
import { DRUM_NOTES } from '../src/styles/drums'

const chart = chartFromMeasures({ title: 'Latin Pop Check', style: 'bachata', key: 0, bpm: 128 }, [
  ['C-7'],
  ['Ab^7'],
  ['Eb^7'],
  ['G7'],
])

const hasMidiProgram = (midi: Uint8Array, channel: number, program: number) =>
  midi.some((b, i) => b === (0xc0 | channel) && midi[i + 1] === program)

describe('bachata, merengue, and cumbia styles', () => {
  test('registers all three styles with expected metadata and comp programs', () => {
    const expected: Array<[string, string, number[]]> = [
      ['bachata', 'Bachata', [24, 25]],
      ['merengue', 'Merengue', [0]],
      ['cumbia', 'Cumbia', [21]],
    ]
    for (const [id, name, programs] of expected) {
      const style = getStyle(id)
      expect(style.id).toBe(id)
      expect(style.name).toBe(name)
      expect(style.family).toBe('latin')
      expect(style.swing).toBe(0.5)
      expect(programs).toContain(style.comp.program)
      expect(hasMidiProgram(arrange(chart, style, 0, 1).midi, 1, style.comp.program)).toBe(true)
    }
  })

  test('plays the chord root on beat 1 of the first chord in bass for all three styles', () => {
    const timeline = buildTimeline(chart, 0, 1)
    const firstSlot = timeline.slots.find((s) => s.measure >= 0)!
    expect(firstSlot).toBeDefined()

    for (const id of ['bachata', 'merengue', 'cumbia']) {
      const style = getStyle(id)
      const bass = generateBass(timeline.slots, style.bass, style.swing)
      expect(bass.every((e) => e.channel === BASS_CHANNEL), id).toBe(true)
      const beat1 = bass.find((e) => Math.abs(e.tick / PPQ - firstSlot.start) < 0.08)
      expect(beat1, `${id} beat 1`).toBeDefined()
      expect(beat1!.note % 12, id).toBe(firstSlot.chord.root)
    }
  })

  test('bachata percussion plays bongo high and low martillo hits', () => {
    const style = getStyle('bachata')
    const timeline = buildTimeline(chart, 0, 2)
    const drums = generateDrums(timeline.bars, style.drums, style.swing, timeline.clicks)
    expect(drums.every((e) => e.channel === DRUM_CHANNEL)).toBe(true)

    const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)
    const notes = new Set(grooveHits.map((e) => e.note))
    expect(notes.has(DRUM_NOTES.bongoHigh)).toBe(true)
    expect(notes.has(DRUM_NOTES.bongoLow)).toBe(true)
  })

  test('merengue güira hits on every eighth note of middle bars', () => {
    const style = getStyle('merengue')
    const timeline = buildTimeline(chart, 0, 2)
    const drums = generateDrums(timeline.bars, style.drums, style.swing, timeline.clicks)
    const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)

    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isLast)
    const guiroNotes = new Set<number>([DRUM_NOTES.guiroShort, DRUM_NOTES.guiroLong])
    for (const bar of middleBars) {
      for (let i = 0; i < 8; i++) {
        const beat = bar.start + i * 0.5
        const hit = grooveHits.find((e) => guiroNotes.has(e.note) && Math.abs(e.tick / PPQ - beat) < 0.08)
        expect(hit, `merengue güira at bar ${bar.start} eighth ${i}`).toBeDefined()
      }
    }
  })

  test('cumbia güiro plays long-short-short on beats 1-1&-2 and 3-3&-4', () => {
    const style = getStyle('cumbia')
    const timeline = buildTimeline(chart, 0, 2)
    const drums = generateDrums(timeline.bars, style.drums, style.swing, timeline.clicks)
    const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)

    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isLast)
    for (const bar of middleBars) {
      for (const offset of [0, 2]) {
        const longHit = grooveHits.find(
          (e) => e.note === DRUM_NOTES.guiroLong && Math.abs(e.tick / PPQ - (bar.start + offset)) < 0.08,
        )
        const short1 = grooveHits.find(
          (e) => e.note === DRUM_NOTES.guiroShort && Math.abs(e.tick / PPQ - (bar.start + offset + 0.5)) < 0.08,
        )
        const short2 = grooveHits.find(
          (e) => e.note === DRUM_NOTES.guiroShort && Math.abs(e.tick / PPQ - (bar.start + offset + 1)) < 0.08,
        )
        expect(longHit, `cumbia guiroLong at bar ${bar.start} + ${offset}`).toBeDefined()
        expect(short1, `cumbia guiroShort at bar ${bar.start} + ${offset + 0.5}`).toBeDefined()
        expect(short2, `cumbia guiroShort at bar ${bar.start} + ${offset + 1}`).toBeDefined()
      }
    }
  })

  test('maps iReal Pro style names for Bachata, Merengue, and Cumbia without breaking Salsa or Cha Cha', () => {
    expect(mapStyle('Bachata')).toBe('bachata')
    expect(mapStyle('Latin-Dominican: Merengue')).toBe('merengue')
    expect(mapStyle('Cumbia')).toBe('cumbia')
    expect(mapStyle('Vallenato')).toBe('cumbia')
    expect(mapStyle('Salsa')).toBe('afro-cuban')
    expect(mapStyle('Cha Cha Cha')).toBe('cha-cha')
  })
})
