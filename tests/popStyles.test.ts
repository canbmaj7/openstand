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

const popChart = chartFromMeasures({ title: 'Pop Four', style: 'disco', key: 0, bpm: 118 }, [
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

describe('disco, rock-12-8, and soul styles', () => {
  test('registers all three styles with pop family, straight feel, and expected comp programs', () => {
    const disco = getStyle('disco')
    expect(disco.id).toBe('disco')
    expect(disco.name).toBe('Disco')
    expect(disco.family).toBe('pop')
    expect(disco.swing).toBe(0.5)
    expect(disco.comp.program).toBe(27)

    const rock128 = getStyle('rock-12-8')
    expect(rock128.id).toBe('rock-12-8')
    expect(rock128.name).toBe('Rock 12/8')
    expect(rock128.family).toBe('pop')
    expect(rock128.swing).toBe(0.5)
    expect(rock128.comp.program).toBe(0)
    expect(rock128.comp.pedal).toBe(true)

    const soul = getStyle('soul')
    expect(soul.id).toBe('soul')
    expect(soul.name).toBe('Soul')
    expect(soul.family).toBe('pop')
    expect(soul.swing).toBe(0.5)
    expect(soul.comp.program).toBe(4)

    expect(hasMidiProgram(arrange(popChart, disco, 0, 1).midi, 1, 27)).toBe(true)
    expect(hasMidiProgram(arrange(popChart, rock128, 0, 1).midi, 1, 0)).toBe(true)
    expect(hasMidiProgram(arrange(popChart, soul, 0, 1).midi, 1, 4)).toBe(true)
  })

  test('disco drums put kick on every beat and open hi-hat on every "&"', () => {
    const disco = getStyle('disco')
    const timeline = buildTimeline(popChart, 0, 2)
    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isFirst && !b.isLast)
    expect(middleBars.length).toBeGreaterThanOrEqual(2)

    for (const randomValue of [0.49, 0.5]) {
      vi.spyOn(Math, 'random').mockReturnValue(randomValue)
      const drums = generateDrums(timeline.bars, disco.drums, disco.swing, timeline.clicks)
      expect(drums.every((e) => e.channel === DRUM_CHANNEL)).toBe(true)

      for (const bar of middleBars) {
        for (const beat of [0, 1, 2, 3]) {
          const kick = drums.find(
            (e) => e.note === DRUM_NOTES.kick && Math.abs(e.tick / PPQ - (bar.start + beat)) < 0.08,
          )
          const openHat = drums.find(
            (e) => e.note === DRUM_NOTES.hhOpen && Math.abs(e.tick / PPQ - (bar.start + beat + 0.5)) < 0.08,
          )
          expect(kick, `kick bar ${bar.start} beat ${beat + 1}`).toBeDefined()
          expect(openHat, `open hat bar ${bar.start} beat ${beat + 1}&`).toBeDefined()
        }
      }
      vi.restoreAllMocks()
    }
  })

  test('disco bass plays octave jumps using root and upper octave', () => {
    const disco = getStyle('disco')
    const timeline = buildTimeline(popChart, 0, 1)
    const firstSlot = timeline.slots.find((s) => s.measure === 0)!
    const bass = generateBass([firstSlot], disco.bass, disco.swing)
    expect(bass.every((e) => e.channel === BASS_CHANNEL)).toBe(true)

    const rootNote = bass.find((e) => Math.abs(e.tick / PPQ - firstSlot.start) < 0.08)!
    expect(rootNote).toBeDefined()
    expect(rootNote.note % 12).toBe(firstSlot.chord.root)
    expect(bass.some((e) => e.note === rootNote.note + 12)).toBe(true)
  })

  test('rock-12-8 drums play 3 evenly spaced hat/ride triplets per beat and snare on 2 and 4', () => {
    const rock128 = getStyle('rock-12-8')
    const timeline = buildTimeline(popChart, 0, 2)
    const middleBars = timeline.bars.filter((b) => b.measure >= 0 && !b.isFirst && !b.isLast)
    expect(middleBars.length).toBeGreaterThanOrEqual(2)

    // Mock random=0.49 (Groove A) and 0.5 (Groove B) so humanize jitter rounds to 0
    for (const randomValue of [0.49, 0.5]) {
      vi.spyOn(Math, 'random').mockReturnValue(randomValue)
      const drums = generateDrums(timeline.bars, rock128.drums, rock128.swing, timeline.clicks)
      expect(drums.every((e) => e.channel === DRUM_CHANNEL)).toBe(true)

      const cymbalNotes = new Set<number>([DRUM_NOTES.hhClosed, DRUM_NOTES.ride])
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

  test('soul drums put snare strictly on beats 2 and 4 and include tambourine notes', () => {
    const soul = getStyle('soul')
    const timeline = buildTimeline(popChart, 0, 2)
    const drums = generateDrums(timeline.bars, soul.drums, soul.swing, timeline.clicks)
    const grooveHits = drums.filter((e) => e.tick >= timeline.countIn * PPQ - 20)

    const playedBars = timeline.bars.filter((b) => b.measure >= 0)
    for (const bar of playedBars) {
      const barStartTick = toTicks(bar.start)
      const barEndTick = toTicks(bar.start + bar.beats)
      const snares = grooveHits.filter((e) => e.note === DRUM_NOTES.snare && e.tick >= barStartTick && e.tick < barEndTick)
      expect(snares, `snare count at bar ${bar.start}`).toHaveLength(2)
      expect(snares.some((e) => Math.abs(e.tick / PPQ - (bar.start + 1)) < 0.08)).toBe(true)
      expect(snares.some((e) => Math.abs(e.tick / PPQ - (bar.start + 3)) < 0.08)).toBe(true)
    }

    const tambourines = grooveHits.filter((e) => e.note === DRUM_NOTES.tambourine)
    expect(tambourines.length).toBeGreaterThan(0)
  })

  test('maps iReal Pro Pop-Disco, Rock 12/8, and Soul names without breaking Blues, Funk, RnB, or compound 12/8', () => {
    expect(mapStyle('Pop-Disco')).toBe('disco')
    expect(mapStyle('Disco')).toBe('disco')
    expect(mapStyle('Rock 12/8')).toBe('rock-12-8')
    expect(mapStyle('Pop-Rock 12/8')).toBe('rock-12-8')
    expect(mapStyle('Slow Blues')).toBe('slow-blues')
    expect(mapStyle('12/8 Blues')).toBe('slow-blues')
    expect(mapStyle('Soul')).toBe('soul')
    expect(mapStyle('Pop-Soul')).toBe('soul')
    expect(mapStyle('Soul Ballad')).toBe('pop-rock')
    expect(mapStyle('Funk')).toBe('funk')
    expect(mapStyle('Pop-RnB')).toBe('funk')
    expect(mapStyle('Pop-Rock')).toBe('pop-rock')
    expect(mapStyle('Rock 12/8', [12, 8])).toBe('pop-rock')
    expect(mapStyle('Pop', [12, 8])).toBe('pop-rock')
  })
})
