import { afterEach, describe, expect, test, vi } from 'vitest'
import { arrange } from '../src/engine/arrange'
import { BASS_CHANNEL, generateBass } from '../src/engine/bass'
import { DRUM_CHANNEL, generateDrums } from '../src/engine/drums'
import { PPQ, toTicks } from '../src/engine/events'
import { buildTimeline } from '../src/engine/timeline'
import { mapStyle } from '../src/formats/ireal'
import { chartFromMeasures } from '../src/music/chart'
import { getStyle } from '../src/styles'
import { DRUM_NOTES } from '../src/styles/drums'

const bluesChart = chartFromMeasures({ title: 'Slow Twelve', style: 'slow-blues', key: 0, bpm: 64 }, [
  ['C7'],
  ['F7'],
  ['C7'],
  ['G7'],
])

const hasMidiProgram = (midi: Uint8Array, channel: number, program: number) =>
  midi.some((b, i) => b === (0xc0 | channel) && midi[i + 1] === program)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('gospel and slow-blues styles', () => {
  test('registers both styles with expected metadata and comp program 0', () => {
    const slow = getStyle('slow-blues')
    expect(slow.id).toBe('slow-blues')
    expect(slow.name).toBe('Slow Blues')
    expect(slow.family).toBe('pop')
    expect(slow.swing).toBe(0.5)
    expect(slow.comp.program).toBe(0)

    const gospel = getStyle('gospel')
    expect(gospel.id).toBe('gospel')
    expect(gospel.name).toBe('Gospel')
    expect(gospel.family).toBe('pop')
    expect(gospel.swing).toBeGreaterThan(0.5)
    expect(gospel.comp.program).toBe(0)

    expect(hasMidiProgram(arrange(bluesChart, slow, 0, 1).midi, 1, 0)).toBe(true)
    expect(hasMidiProgram(arrange(bluesChart, gospel, 0, 1).midi, 1, 0)).toBe(true)
  })

  test('slow-blues drums play 3 evenly spaced ride/hi-hat triplets per beat and snare on 2 and 4', () => {
    const slow = getStyle('slow-blues')
    const timeline = buildTimeline(bluesChart, 0, 2)
    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isFirst && !b.isLast)
    expect(middleBars.length).toBeGreaterThanOrEqual(2)

    // Mock random=0.49 (Groove A) and 0.5 (Groove B) so humanize timing jitter rounds to 0, verifying exact PPQ/3 tick spacing on both grooves
    for (const randomValue of [0.49, 0.5]) {
      vi.spyOn(Math, 'random').mockReturnValue(randomValue)
      const drums = generateDrums(timeline.bars, slow.drums, slow.swing, timeline.clicks)
      expect(drums.every((e) => e.channel === DRUM_CHANNEL)).toBe(true)

      const cymbalNotes = new Set<number>([DRUM_NOTES.ride, DRUM_NOTES.hhClosed])
      const expectedOffsets = [0, PPQ / 3, (2 * PPQ) / 3]

      for (const bar of middleBars) {
        const barStartTick = toTicks(bar.start)
        const barEndTick = toTicks(bar.start + bar.beats)
        const inBar = drums.filter((e) => e.tick >= barStartTick && e.tick < barEndTick)

        for (let beat = 0; beat < 4; beat++) {
          const beatStartTick = barStartTick + beat * PPQ
          const beatEndTick = beatStartTick + PPQ
          const triplets = inBar
            .filter((e) => cymbalNotes.has(e.note) && e.tick >= beatStartTick && e.tick < beatEndTick)
            .map((e) => e.tick - beatStartTick)
            .sort((a, b) => a - b)

          expect(triplets, `bar ${bar.start} beat ${beat + 1}`).toHaveLength(3)
          triplets.forEach((offset, idx) => {
            expect(Math.abs(offset - expectedOffsets[idx]), `beat ${beat + 1} sub ${idx}`).toBeLessThanOrEqual(1)
          })
        }

        const snare2 = inBar.find((e) => e.note === DRUM_NOTES.snare && Math.abs(e.tick / PPQ - (bar.start + 1)) < 0.08)
        const snare4 = inBar.find((e) => e.note === DRUM_NOTES.snare && Math.abs(e.tick / PPQ - (bar.start + 3)) < 0.08)
        expect(snare2, `snare 2 at bar ${bar.start}`).toBeDefined()
        expect(snare4, `snare 4 at bar ${bar.start}`).toBeDefined()
      }
      vi.restoreAllMocks()
    }
  })

  test('slow-blues bass plays the chord root on beat 1', () => {
    const slow = getStyle('slow-blues')
    const timeline = buildTimeline(bluesChart, 0, 1)
    const playedSlots = timeline.slots.filter((s) => s.measure >= 0)
    const bass = generateBass(timeline.slots, slow.bass, slow.swing)
    expect(bass.every((e) => e.channel === BASS_CHANNEL)).toBe(true)

    for (const slot of playedSlots) {
      const beat1 = bass.find((e) => Math.abs(e.tick / PPQ - slot.start) < 0.08)
      expect(beat1, `bass beat 1 at ${slot.start}`).toBeDefined()
      expect(beat1!.note % 12).toBe(slot.chord.root)
    }
  })

  test('gospel drums have backbeat snare on 2 and 4 and ghost snare notes below velocity 50', () => {
    const gospel = getStyle('gospel')
    const timeline = buildTimeline(bluesChart, 0, 2)
    const drums = generateDrums(timeline.bars, gospel.drums, gospel.swing, timeline.clicks)
    const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)

    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isLast)
    for (const bar of middleBars) {
      const snare2 = grooveHits.find((e) => e.note === DRUM_NOTES.snare && Math.abs(e.tick / PPQ - (bar.start + 1)) < 0.08)
      const snare4 = grooveHits.find((e) => e.note === DRUM_NOTES.snare && Math.abs(e.tick / PPQ - (bar.start + 3)) < 0.08)
      expect(snare2, `snare 2 at bar ${bar.start}`).toBeDefined()
      expect(snare4, `snare 4 at bar ${bar.start}`).toBeDefined()
    }

    const ghostSnares = grooveHits.filter((e) => e.note === DRUM_NOTES.snare && e.velocity < 50)
    expect(ghostSnares.length).toBeGreaterThan(0)
  })

  test('maps iReal Pro Gospel and Slow Blues names without breaking Shuffle or Swing', () => {
    expect(mapStyle('Slow Blues')).toBe('slow-blues')
    expect(mapStyle('Blues-Slow Blues')).toBe('slow-blues')
    expect(mapStyle('Blues Slow')).toBe('slow-blues')
    expect(mapStyle('12/8 Blues')).toBe('slow-blues')
    expect(mapStyle('Blues-Shuffle')).toBe('shuffle')
    expect(mapStyle('Blues')).toBe('shuffle')
    expect(mapStyle('Medium Blues')).toBe('shuffle')
    expect(mapStyle('Gospel')).toBe('gospel')
    expect(mapStyle('Gospel Ballad')).toBe('gospel')
    expect(mapStyle('Medium Swing')).toBe('medium-swing')
    expect(mapStyle('Jazz-Medium Swing')).toBe('medium-swing')
  })
})
