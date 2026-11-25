import { describe, expect, test } from 'vitest'
import { arrange } from '../src/engine/arrange'
import { makeBackup, parseBackup } from '../src/formats/backup'
import { irealLink } from '../src/formats/irealWrite'
import { parseChord } from '../src/music/chords'
import { cycleOfFourths, EXERCISES, halfStepsDown } from '../src/music/exercises'
import { NO_PRACTICE } from '../src/music/practice'
import { EXAMPLES } from '../src/music/songs'
import { getStyle } from '../src/styles'

const byId = (id: string) => {
  const found = EXERCISES.find((t) => t.id === id)
  if (!found) throw new Error(`Missing exercise ${id}`)
  return found
}

describe('built-in exercises', () => {
  test('have expected measure counts, row breaks, final barline, and metadata', () => {
    expect(EXERCISES.map((t) => [t.id, t.chart.bars.length])).toEqual([
      ['ex-ii-v-i-major-fourths', 48],
      ['ex-ii-v-i-major-half-steps', 48],
      ['ex-ii-v-i-minor-fourths', 48],
      ['ex-blues-all-keys', 144],
      ['ex-turnarounds-all-keys', 48],
      ['ex-dominant-cycle', 12],
    ])

    for (const tune of EXERCISES) {
      expect(tune.id).toMatch(/^ex-/)
      expect(tune.source).toBe('example')
      expect(tune.playlist).toBe('Exercises')
      expect(tune.chart.key).toBe(0)
      expect(tune.chart.bpm).toBeGreaterThanOrEqual(120)
      expect(tune.chart.bpm).toBeLessThanOrEqual(160)
      expect(tune.chart.bars.at(-1)?.barline).toBe('final')
      tune.chart.bars.forEach((bar, i) => {
        expect(bar.rowStart).toBe(i % 4 === 0 ? true : undefined)
      })
    }
  })

  test('all chord symbols parse cleanly and have unique ids distinct from EXAMPLES', () => {
    const exampleIds = new Set(EXAMPLES.map((t) => t.id))
    const exerciseIds = new Set(EXERCISES.map((t) => t.id))
    expect(exerciseIds.size).toBe(EXERCISES.length)

    for (const tune of EXERCISES) {
      expect(exampleIds.has(tune.id)).toBe(false)
      for (const bar of tune.chart.bars) {
        expect(bar.chords.length).toBeGreaterThan(0)
        for (const c of bar.chords) {
          expect(c.symbol).toBeTruthy()
          expect(parseChord(c.symbol!)).not.toBeNull()
        }
      }
    }
  })

  test('ii–V–I major cycle of fourths has correct roots and qualities in all 12 groups', () => {
    const fourths = cycleOfFourths()
    expect(fourths).toEqual([0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7])
    const bars = byId('ex-ii-v-i-major-fourths').chart.bars

    fourths.forEach((tonic, g) => {
      const group = bars.slice(g * 4, g * 4 + 4)
      const [ii, v, i1, i2] = group.map((b) => parseChord(b.chords[0].symbol!)!)
      expect(ii).toMatchObject({ root: (tonic + 2) % 12, quality: 'min7' })
      expect(v).toMatchObject({ root: (tonic + 7) % 12, quality: 'dom7' })
      expect(i1).toMatchObject({ root: tonic, quality: 'maj7' })
      expect(i2).toMatchObject({ root: tonic, quality: 'maj7' })
    })

    // 2nd group in F: G-7 | C7 | F^7 | F^7
    expect(bars.slice(4, 8).map((b) => b.chords[0].symbol)).toEqual(['G-7', 'C7', 'F^7', 'F^7'])
  })

  test('ii–V–I major down in half steps and ii–V–i minor cycle of fourths have correct roots and qualities', () => {
    const chromaticDown = halfStepsDown()
    expect(chromaticDown).toEqual([0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
    const halfStepBars = byId('ex-ii-v-i-major-half-steps').chart.bars

    chromaticDown.forEach((tonic, g) => {
      const group = halfStepBars.slice(g * 4, g * 4 + 4)
      const [ii, v, i1, i2] = group.map((b) => parseChord(b.chords[0].symbol!)!)
      expect(ii).toMatchObject({ root: (tonic + 2) % 12, quality: 'min7' })
      expect(v).toMatchObject({ root: (tonic + 7) % 12, quality: 'dom7' })
      expect(i1).toMatchObject({ root: tonic, quality: 'maj7' })
      expect(i2).toMatchObject({ root: tonic, quality: 'maj7' })
    })

    const minorBars = byId('ex-ii-v-i-minor-fourths').chart.bars
    cycleOfFourths().forEach((tonic, g) => {
      const group = minorBars.slice(g * 4, g * 4 + 4)
      const [ii, v, i1, i2] = group.map((b) => parseChord(b.chords[0].symbol!)!)
      expect(ii).toMatchObject({ root: (tonic + 2) % 12, quality: 'half' })
      expect(v).toMatchObject({ root: (tonic + 7) % 12, quality: 'dom7', tensions: ['b9'] })
      expect(i1).toMatchObject({ root: tonic, quality: 'min6' })
      expect(i2).toMatchObject({ root: tonic, quality: 'min6' })
    })
  })

  test('blues in all keys starts with C jazz blues and marks all 12 key sections', () => {
    const blues = byId('ex-blues-all-keys').chart
    expect(blues.bars.slice(0, 12).map((b) => b.chords.map((c) => c.symbol))).toEqual([
      ['C7'],
      ['F7'],
      ['C7'],
      ['C7'],
      ['F7'],
      ['F7'],
      ['C7'],
      ['A7'],
      ['D-7'],
      ['G7'],
      ['C7', 'A7'],
      ['D-7', 'G7'],
    ])
    const sections = blues.bars.map((b, i) => (b.section ? [i, b.section] : null)).filter(Boolean)
    expect(sections).toEqual([
      [0, 'C'],
      [12, 'F'],
      [24, 'Bb'],
      [36, 'Eb'],
      [48, 'Ab'],
      [60, 'Db'],
      [72, 'Gb'],
      [84, 'B'],
      [96, 'E'],
      [108, 'A'],
      [120, 'D'],
      [132, 'G'],
    ])
  })

  test('turnarounds and dominant cycle follow the cycle of fourths', () => {
    const turnarounds = byId('ex-turnarounds-all-keys').chart.bars
    cycleOfFourths().forEach((tonic, g) => {
      const block = turnarounds.slice(g * 4, g * 4 + 4)
      for (const rep of [0, 2]) {
        const b1 = block[rep].chords.map((c) => parseChord(c.symbol!)!)
        const b2 = block[rep + 1].chords.map((c) => parseChord(c.symbol!)!)
        expect(b1[0]).toMatchObject({ root: tonic, quality: 'maj7' })
        expect(b1[1]).toMatchObject({ root: (tonic + 9) % 12, quality: 'min7' })
        expect(b2[0]).toMatchObject({ root: (tonic + 2) % 12, quality: 'min7' })
        expect(b2[1]).toMatchObject({ root: (tonic + 7) % 12, quality: 'dom7' })
      }
    })

    const dominant = byId('ex-dominant-cycle').chart.bars
    expect(dominant.map((b) => b.chords[0].symbol)).toEqual([
      'C7', 'F7', 'Bb7', 'Eb7', 'Ab7', 'Db7', 'Gb7', 'B7', 'E7', 'A7', 'D7', 'G7',
    ])
  })

  test('arrange generates MIDI, backup excludes exercises, and iReal export succeeds', () => {
    for (const tune of EXERCISES) {
      const { midi, timeline } = arrange(tune.chart, getStyle(tune.chart.style), 0, 1, NO_PRACTICE)
      expect(midi.length).toBeGreaterThan(0)
      expect(timeline.bars.length).toBeGreaterThanOrEqual(tune.chart.bars.length)
      expect(irealLink([tune.chart])).toMatch(/^irealb:\/\//)
    }

    const parsed = parseBackup(makeBackup(EXERCISES, [], [], '2026-11-25T00:00:00.000Z'))
    expect(parsed.tunes).toEqual([])
  })
})
