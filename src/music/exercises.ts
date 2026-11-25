// Built-in practice exercises generated programmatically across all 12 keys.

import { chartFromMeasures, type Chart } from './chart'
import { keyPrefersFlats, noteName, spellRoot } from './chords'
import type { Tune } from './songs'

/** Pitch classes ordered up in fourths from the starting key. */
export function cycleOfFourths(start = 0): number[] {
  return Array.from({ length: 12 }, (_, i) => (start + i * 5) % 12)
}

/** Pitch classes ordered down in half steps from the starting key. */
export function halfStepsDown(start = 0): number[] {
  return Array.from({ length: 12 }, (_, i) => (start - i + 12) % 12)
}

function chordAt(keyPc: number, semitones: number, suffix: string): string {
  return `${spellRoot((keyPc + semitones) % 12, keyPc)}${suffix}`
}

function iiViMeasures(keys: readonly number[], minor = false): string[][] {
  return keys.flatMap((k) => {
    const ii = chordAt(k, 2, minor ? 'h7' : '-7')
    const v = chordAt(k, 7, minor ? '7b9' : '7')
    const i = chordAt(k, 0, minor ? '-6' : '^7')
    return [[ii], [v], [i], [i]]
  })
}

function bluesTune(id: string, title: string, bpm: number): Tune {
  const keys = cycleOfFourths()
  const measures = keys.flatMap((k) => {
    const I7 = chordAt(k, 0, '7')
    const IV7 = chordAt(k, 5, '7')
    const VI7 = chordAt(k, 9, '7')
    const ii7 = chordAt(k, 2, '-7')
    const V7 = chordAt(k, 7, '7')
    return [
      [I7],
      [IV7],
      [I7],
      [I7],
      [IV7],
      [IV7],
      [I7],
      [VI7],
      [ii7],
      [V7],
      [I7, VI7],
      [ii7, V7],
    ]
  })
  const chart = chartFromMeasures({ title, style: 'medium-swing', key: 0, bpm }, measures)
  keys.forEach((k, idx) => {
    chart.bars[idx * 12].section = noteName(k, keyPrefersFlats(k))
  })
  return makeExercise(id, chart)
}

function turnaroundMeasures(keys: readonly number[]): string[][] {
  return keys.flatMap((k) => {
    const bar1 = [chordAt(k, 0, '^7'), chordAt(k, 9, '-7')]
    const bar2 = [chordAt(k, 2, '-7'), chordAt(k, 7, '7')]
    return [bar1, bar2, [...bar1], [...bar2]]
  })
}

function dominantCycleMeasures(keys: readonly number[]): string[][] {
  return keys.map((k) => [chordAt(k, 0, '7')])
}

function makeExercise(id: string, chart: Chart): Tune {
  return {
    id,
    chart,
    source: 'example',
    playlist: 'Exercises',
    addedAt: 0,
  }
}

export const EXERCISES: Tune[] = [
  makeExercise(
    'ex-ii-v-i-major-fourths',
    chartFromMeasures(
      { title: 'ii–V–I Major (Cycle of Fourths)', style: 'medium-swing', key: 0, bpm: 140 },
      iiViMeasures(cycleOfFourths()),
    ),
  ),
  makeExercise(
    'ex-ii-v-i-major-half-steps',
    chartFromMeasures(
      { title: 'ii–V–I Major (Half Steps Down)', style: 'medium-swing', key: 0, bpm: 140 },
      iiViMeasures(halfStepsDown()),
    ),
  ),
  makeExercise(
    'ex-ii-v-i-minor-fourths',
    chartFromMeasures(
      { title: 'ii–V–i Minor (Cycle of Fourths)', style: 'medium-swing', key: 0, minor: true, bpm: 130 },
      iiViMeasures(cycleOfFourths(), true),
    ),
  ),
  bluesTune('ex-blues-all-keys', 'Blues in All Keys', 132),
  makeExercise(
    'ex-turnarounds-all-keys',
    chartFromMeasures(
      { title: 'Turnarounds in All Keys', style: 'medium-swing', key: 0, bpm: 140 },
      turnaroundMeasures(cycleOfFourths()),
    ),
  ),
  makeExercise(
    'ex-dominant-cycle',
    chartFromMeasures(
      { title: 'Dominant Cycle', style: 'medium-swing', key: 0, bpm: 140 },
      dominantCycleMeasures(cycleOfFourths()),
    ),
  ),
]
