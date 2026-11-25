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

const chart = chartFromMeasures({ title: 'Straight & Street', style: 'even-eighths', key: 0, bpm: 120 }, [
  ['C^7'],
  ['A-7'],
  ['D-7'],
  ['G7'],
])

const hasMidiProgram = (midi: Uint8Array, channel: number, program: number) =>
  midi.some((b, i) => b === (0xc0 | channel) && midi[i + 1] === program)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('second-line, even-eighths, and smooth-jazz styles', () => {
  test('registers all three styles with expected families, feel, and comp programs', () => {
    const secondLine = getStyle('second-line')
    expect(secondLine.id).toBe('second-line')
    expect(secondLine.name).toBe('Second Line')
    expect(secondLine.family).toBe('jazz')
    expect(secondLine.swing).toBeGreaterThan(0.5)
    expect(secondLine.swing).toBeLessThan(getStyle('medium-swing').swing)
    expect(secondLine.comp.program).toBe(0)

    const evenEighths = getStyle('even-eighths')
    expect(evenEighths.id).toBe('even-eighths')
    expect(evenEighths.name).toBe('Even 8ths')
    expect(evenEighths.family).toBe('jazz')
    expect(evenEighths.swing).toBe(0.5)
    expect(evenEighths.comp.program).toBe(0)

    const smoothJazz = getStyle('smooth-jazz')
    expect(smoothJazz.id).toBe('smooth-jazz')
    expect(smoothJazz.name).toBe('Smooth Jazz')
    expect(smoothJazz.family).toBe('pop')
    expect(smoothJazz.swing).toBe(0.5)
    expect(smoothJazz.comp.program).toBe(4)

    expect(hasMidiProgram(arrange(chart, secondLine, 0, 1).midi, 1, 0)).toBe(true)
    expect(hasMidiProgram(arrange(chart, evenEighths, 0, 1).midi, 1, 0)).toBe(true)
    expect(hasMidiProgram(arrange(chart, smoothJazz, 0, 1).midi, 1, 4)).toBe(true)
  })

  test('even-eighths plays evenly spaced straight eighth-note ride hits', () => {
    const evenEighths = getStyle('even-eighths')
    const timeline = buildTimeline(chart, 0, 2)
    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isFirst && !b.isLast)
    expect(middleBars.length).toBeGreaterThanOrEqual(2)

    // Mock random=0.49 (Groove A) and 0.5 (Groove B) so humanize jitter rounds to 0
    for (const randomValue of [0.49, 0.5]) {
      vi.spyOn(Math, 'random').mockReturnValue(randomValue)
      const drums = generateDrums(timeline.bars, evenEighths.drums, evenEighths.swing, timeline.clicks)
      expect(drums.every((e) => e.channel === DRUM_CHANNEL)).toBe(true)

      const expectedOffsets = Array.from({ length: 8 }, (_, i) => (i * PPQ) / 2)
      for (const bar of middleBars) {
        const barStartTick = toTicks(bar.start)
        const barEndTick = toTicks(bar.start + bar.beats)
        const rideOffsets = drums
          .filter((e) => e.note === DRUM_NOTES.ride && e.tick >= barStartTick && e.tick < barEndTick)
          .map((e) => e.tick - barStartTick)
          .sort((a, b) => a - b)

        expect(rideOffsets, `bar ${bar.start}`).toEqual(expectedOffsets)
      }
      vi.restoreAllMocks()
    }
  })

  test('second-line drums include both low-velocity snare ghosts and snare accents', () => {
    const secondLine = getStyle('second-line')
    const timeline = buildTimeline(chart, 0, 2)
    const drums = generateDrums(timeline.bars, secondLine.drums, secondLine.swing, timeline.clicks)
    const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)

    const snareHits = grooveHits.filter((e) => e.note === DRUM_NOTES.snare)
    const ghosts = snareHits.filter((e) => e.velocity < 50)
    const accents = snareHits.filter((e) => e.velocity >= 85)
    expect(ghosts.length).toBeGreaterThan(0)
    expect(accents.length).toBeGreaterThan(0)
  })

  test('smooth-jazz drums play straight 16th-note closed hi-hat patterns', () => {
    const smoothJazz = getStyle('smooth-jazz')
    const timeline = buildTimeline(chart, 0, 2)
    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isFirst && !b.isLast)
    expect(middleBars.length).toBeGreaterThanOrEqual(2)

    for (const randomValue of [0.49, 0.5]) {
      vi.spyOn(Math, 'random').mockReturnValue(randomValue)
      const drums = generateDrums(timeline.bars, smoothJazz.drums, smoothJazz.swing, timeline.clicks)
      const expectedOffsets = Array.from({ length: 16 }, (_, i) => (i * PPQ) / 4)

      for (const bar of middleBars) {
        const barStartTick = toTicks(bar.start)
        const barEndTick = toTicks(bar.start + bar.beats)
        const hatOffsets = drums
          .filter((e) => e.note === DRUM_NOTES.hhClosed && e.tick >= barStartTick && e.tick < barEndTick)
          .map((e) => e.tick - barStartTick)
          .sort((a, b) => a - b)

        expect(hatOffsets, `bar ${bar.start}`).toEqual(expectedOffsets)
      }
      vi.restoreAllMocks()
    }
  })

  test('plays the chord root on beat 1 of the first chord in bass for all three styles', () => {
    const timeline = buildTimeline(chart, 0, 1)
    const firstSlot = timeline.slots.find((s) => s.measure >= 0)!
    expect(firstSlot).toBeDefined()

    for (const id of ['second-line', 'even-eighths', 'smooth-jazz']) {
      const style = getStyle(id)
      const bass = generateBass(timeline.slots, style.bass, style.swing)
      expect(bass.every((e) => e.channel === BASS_CHANNEL), id).toBe(true)
      const beat1 = bass.find((e) => Math.abs(e.tick / PPQ - firstSlot.start) < 0.08)
      expect(beat1, `${id} beat 1`).toBeDefined()
      expect(beat1!.note % 12, id).toBe(firstSlot.chord.root)
    }
  })

  test('maps iReal Pro Second Line, Even 8ths, and Smooth names without breaking Swing, New Orleans, or Pop-Rock', () => {
    expect(mapStyle('Jazz-Second Line')).toBe('second-line')
    expect(mapStyle('Second Line')).toBe('second-line')
    expect(mapStyle('New Orleans')).toBe('medium-swing')
    expect(mapStyle('Jazz-Even 8ths')).toBe('even-eighths')
    expect(mapStyle('Even 8ths')).toBe('even-eighths')
    expect(mapStyle('Pop-Even 8ths')).toBe('pop-rock')
    expect(mapStyle('Rock-Even 8ths')).toBe('pop-rock')
    expect(mapStyle('Jazz-Smooth')).toBe('smooth-jazz')
    expect(mapStyle('Pop-Smooth')).toBe('smooth-jazz')
    expect(mapStyle('Smooth Jazz')).toBe('smooth-jazz')
    expect(mapStyle('Medium Swing')).toBe('medium-swing')
    expect(mapStyle('Pop-Rock')).toBe('pop-rock')
  })
})
