import { describe, expect, test } from 'vitest'
import { chorusKeyOffset as packageChorusKeyOffset } from '../packages/engine/src/index'
import { buildTimeline, chorusKeyOffset, chorusTranspose } from '../src/engine/timeline'
import { chartFromMeasures } from '../src/music/chart'
import { chorusBpm, KEY_STEPS, NO_PRACTICE, practiceOptions } from '../src/music/practice'

const tune = chartFromMeasures({ title: 'Key Order Tune', composer: 'Test', style: 'medium-swing', key: 0, bpm: 120 }, [
  ['C^7'],
  ['D-7'],
  ['G7'],
  ['C^7'],
])

const pc = (semitones: number) => ((semitones % 12) + 12) % 12

describe('chorusKeyOffset', () => {
  test('keyStep paths match chorusTranspose identically', () => {
    for (const step of [0, 1, 2, 3, 4, 5, 7, 11]) {
      for (const transpose of [-5, 0, 2, 6]) {
        for (let chorus = 0; chorus < 24; chorus++) {
          expect(chorusKeyOffset({ keyStep: step }, chorus, transpose)).toBe(chorusTranspose(transpose, step, chorus))
        }
      }
    }
  })

  test('randomKeys starts at offset 0 and visits all 12 keys per block without consecutive repeats', () => {
    for (const seed of [0, 1, 42, 123456, 987654321]) {
      const practice = { randomKeys: { seed } }
      expect(chorusKeyOffset(practice, 0)).toBe(0)

      const offsets = Array.from({ length: 36 }, (_, c) => chorusKeyOffset(practice, c))
      for (const offset of offsets) {
        expect(offset).toBeGreaterThanOrEqual(-5)
        expect(offset).toBeLessThanOrEqual(6)
      }

      // Every 12-chorus block contains all 12 pitch classes once
      for (let block = 0; block < 3; block++) {
        const blockPcs = offsets.slice(block * 12, (block + 1) * 12).map(pc)
        expect(new Set(blockPcs).size).toBe(12)
      }

      // No consecutive repeats anywhere, including across block boundaries (11->12, 23->24)
      for (let c = 0; c < offsets.length - 1; c++) {
        expect(pc(offsets[c])).not.toBe(pc(offsets[c + 1]))
      }
    }
  })

  test('randomKeys is deterministic for the same seed and varies across seeds', () => {
    const a = Array.from({ length: 24 }, (_, c) => chorusKeyOffset({ randomKeys: { seed: 2026 } }, c))
    const b = Array.from({ length: 24 }, (_, c) => chorusKeyOffset({ randomKeys: { seed: 2026 } }, c))
    const other = Array.from({ length: 24 }, (_, c) => chorusKeyOffset({ randomKeys: { seed: 2027 } }, c))
    expect(a).toEqual(b)
    expect(a).not.toEqual(other)
  })

  test('buildTimeline transposes chorus chords using randomKeys', () => {
    const practice = { randomKeys: { seed: 77 } }
    const timeline = buildTimeline(tune, 0, 3, practice)
    const bar0Slots = timeline.slots.filter((s) => s.measure === 0)
    expect(bar0Slots).toHaveLength(3)
    expect(bar0Slots[0].chord.root).toBe(0) // C
    expect(bar0Slots[1].chord.root).toBe(pc(chorusKeyOffset(practice, 1)))
    expect(bar0Slots[2].chord.root).toBe(pc(chorusKeyOffset(practice, 2)))
  })

  test('engine package re-exports chorusKeyOffset', () => {
    expect(packageChorusKeyOffset({ randomKeys: { seed: 19 } }, 0)).toBe(0)
    expect(packageChorusKeyOffset({ keyStep: 7 }, 1)).toBe(chorusTranspose(0, 7, 1))
  })
})

describe('KEY_STEPS and chorusBpm', () => {
  test('KEY_STEPS includes minor third, major third, fifth, and random', () => {
    expect(KEY_STEPS.map((k) => k.step)).toEqual([0, 5, 7, 1, 11, 2, 3, 4, 'random'])
  })

  test('chorusBpm increments every rampEvery choruses and clamps to transport range', () => {
    expect(Array.from({ length: 6 }, (_, c) => chorusBpm(120, 4, 1, c))).toEqual([120, 124, 128, 132, 136, 140])
    expect(Array.from({ length: 6 }, (_, c) => chorusBpm(120, 6, 2, c))).toEqual([120, 120, 126, 126, 132, 132])
    expect(Array.from({ length: 7 }, (_, c) => chorusBpm(120, 5, 3, c))).toEqual([120, 120, 120, 125, 125, 125, 130])
    expect(Array.from({ length: 9 }, (_, c) => chorusBpm(120, 10, 4, c))).toEqual([120, 120, 120, 120, 130, 130, 130, 130, 140])
    expect(chorusBpm(290, 20, 1, 3)).toBe(300)
  })

  test('practiceOptions forwards randomKeys when present', () => {
    expect(practiceOptions(NO_PRACTICE)).toEqual({
      loop: null,
      keyStep: 0,
      subs: 'off',
      countIn: 'auto',
    })
    expect(practiceOptions({ ...NO_PRACTICE, randomKeys: { seed: 55 } })).toEqual({
      loop: null,
      keyStep: 0,
      randomKeys: { seed: 55 },
      subs: 'off',
      countIn: 'auto',
    })
  })
})
