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

const chart = chartFromMeasures({ title: 'Groove Check', style: 'cha-cha', key: 0, bpm: 116 }, [
  ['C-7'],
  ['C-7'],
  ['F-7'],
  ['G7'],
])

const hasMidiProgram = (midi: Uint8Array, channel: number, program: number) =>
  midi.some((b, i) => b === (0xc0 | channel) && midi[i + 1] === program)

const semitoneDistance = (a: number, b: number) => {
  const diff = (((a - b) % 12) + 12) % 12
  return Math.min(diff, 12 - diff)
}

describe('cha-cha and hip-hop styles', () => {
  test('registers both styles with expected metadata and comp programs', () => {
    const cha = getStyle('cha-cha')
    expect(cha.id).toBe('cha-cha')
    expect(cha.name).toBe('Cha-Cha-Chá')
    expect(cha.family).toBe('latin')
    expect(cha.swing).toBe(0.5)
    expect(cha.comp.program).toBe(0)

    const hip = getStyle('hip-hop')
    expect(hip.id).toBe('hip-hop')
    expect(hip.name).toBe('Hip-Hop')
    expect(hip.family).toBe('pop')
    expect(hip.swing).toBe(0.5)
    expect(hip.comp.program).toBe(4)

    expect(hasMidiProgram(arrange(chart, cha, 0, 1).midi, 1, 0)).toBe(true)
    expect(hasMidiProgram(arrange(chart, hip, 0, 1).midi, 1, 4)).toBe(true)
  })

  test('cha-cha percussion has cowbell on every beat and guiro notes', () => {
    const cha = getStyle('cha-cha')
    const timeline = buildTimeline(chart, 0, 2)
    const drums = generateDrums(timeline.bars, cha.drums, cha.swing, timeline.clicks)
    expect(drums.every((e) => e.channel === DRUM_CHANNEL)).toBe(true)

    const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)
    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isLast)
    for (const bar of middleBars) {
      for (const beat of [0, 1, 2, 3]) {
        const bell = grooveHits.find(
          (e) => e.note === DRUM_NOTES.cowbell && Math.abs(e.tick / PPQ - (bar.start + beat)) < 0.08,
        )
        expect(bell, `cowbell bar ${bar.start} beat ${beat + 1}`).toBeDefined()
      }
    }

    const notes = new Set(grooveHits.map((e) => e.note))
    expect(notes.has(DRUM_NOTES.guiroLong)).toBe(true)
    expect(notes.has(DRUM_NOTES.guiroShort)).toBe(true)
    expect(notes.has(DRUM_NOTES.congaHigh)).toBe(true)
    expect(notes.has(DRUM_NOTES.congaLow)).toBe(true)
  })

  test('cha-cha bass anticipates the next chord on beat 4 (tumbao)', () => {
    const cha = getStyle('cha-cha')
    const timeline = buildTimeline(chart, 0, 2)
    const bass = generateBass(timeline.slots, cha.bass, cha.swing)
    expect(bass.every((e) => e.channel === BASS_CHANNEL)).toBe(true)

    const playedSlots = timeline.slots.filter((s) => s.measure >= 0)
    const beat4Anticipations = playedSlots.filter((slot, i) => {
      const next = playedSlots[i + 1]
      if (!next) return false
      const hit = bass.find((e) => Math.abs(e.tick / PPQ - (slot.start + 3)) < 0.08)
      return hit !== undefined && semitoneDistance(hit.note, next.chord.root) <= 1
    })
    expect(beat4Anticipations.length).toBeGreaterThanOrEqual(1)

    // Verify exact next-root anticipation when the repeated-chord root pattern is used
    const rootAnticipationOnly = {
      ...cha.bass,
      patterns: {
        '4': [
          [
            { at: 1.5, dur: 1.4, tone: '5-' as const, vel: 90 },
            { at: 3, dur: 1.4, tone: 'R' as const, vel: 94 },
          ],
        ],
      },
    }
    const repeatedBass = generateBass(timeline.slots, rootAnticipationOnly, cha.swing)
    const firstBarBeat4 = repeatedBass.find((e) => Math.abs(e.tick / PPQ - (playedSlots[0].start + 3)) < 0.08)
    expect(firstBarBeat4).toBeDefined()
    expect(firstBarBeat4!.note % 12).toBe(playedSlots[1].chord.root)
  })

  test('hip-hop drums place snare on 2 and 4 and kick on beat 1', () => {
    const hip = getStyle('hip-hop')
    const timeline = buildTimeline(chart, 0, 2)
    const drums = generateDrums(timeline.bars, hip.drums, hip.swing, timeline.clicks)
    const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)

    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isLast)
    for (const bar of middleBars) {
      const kick1 = grooveHits.find((e) => e.note === DRUM_NOTES.kick && Math.abs(e.tick / PPQ - bar.start) < 0.08)
      const snare2 = grooveHits.find(
        (e) => e.note === DRUM_NOTES.snare && Math.abs(e.tick / PPQ - (bar.start + 1)) < 0.08,
      )
      const snare4 = grooveHits.find(
        (e) => e.note === DRUM_NOTES.snare && Math.abs(e.tick / PPQ - (bar.start + 3)) < 0.08,
      )
      expect(kick1, `kick at bar ${bar.start}`).toBeDefined()
      expect(snare2, `snare 2 at bar ${bar.start}`).toBeDefined()
      expect(snare4, `snare 4 at bar ${bar.start}`).toBeDefined()
    }
  })

  test('maps iReal Pro Cha Cha and Hip Hop style names without breaking Chacarera or RnB', () => {
    expect(mapStyle('Cha Cha Cha')).toBe('cha-cha')
    expect(mapStyle('Latin-Cuba: Cha Cha Cha')).toBe('cha-cha')
    expect(mapStyle('Cha Cha')).toBe('cha-cha')
    expect(mapStyle('Chacarera')).toBe('bossa-nova')
    expect(mapStyle('Hip Hop')).toBe('hip-hop')
    expect(mapStyle('Hip-Hop')).toBe('hip-hop')
    expect(mapStyle('Rap')).toBe('hip-hop')
    expect(mapStyle('Trap')).toBe('hip-hop')
    expect(mapStyle('Boom Bap')).toBe('hip-hop')
    expect(mapStyle('Pop-RnB')).toBe('funk')
    expect(mapStyle('RnB')).toBe('funk')
  })
})
