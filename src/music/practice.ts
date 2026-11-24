// Practice settings: loop part of a tune, go round the keys, speed up each chorus

import type { SubMode } from '../engine/timeline'
import type { Chart } from './chart'

export interface PracticeSettings {
  loop: [number, number] | null // written bar indices
  keyStep: number // semitones per chorus
  ramp: number // bpm added per chorus
  subs: SubMode // play optional chord substitutions
}

export const NO_PRACTICE: PracticeSettings = { loop: null, keyStep: 0, ramp: 0, subs: 'off' }

export const KEY_STEPS: { step: number; label: string }[] = [
  { step: 0, label: 'Stay in the written key' },
  { step: 5, label: 'Up a fourth each chorus (all 12 keys)' },
  { step: 1, label: 'Up a half step each chorus' },
  { step: 2, label: 'Up a whole step each chorus' },
  { step: 11, label: 'Down a half step each chorus' },
]

// Rehearsal sections as bar ranges: from each mark to the bar before the next one
export function sections(chart: Chart): { name: string; from: number; to: number }[] {
  const starts = chart.bars.flatMap((b, i) => (b.section ? [i] : []))
  return starts.map((from, n) => {
    let to = (starts[n + 1] ?? chart.bars.length) - 1
    while (to > from && chart.bars[to].spacer) to--
    const mark = chart.bars[from].section!
    return { name: mark === 'i' ? 'Intro' : mark === 'v' ? 'Verse' : mark, from, to }
  })
}

// Find the beat on the timeline where a selected chord starts in chorus 0.
// If not found or if chord offset cannot be determined, falls back to the bar start.
export function startBeatFor(
  timeline: { bars: { start: number; beats: number; measure: number }[]; slots: { chorus: number; measure: number; start: number }[]; countIn: number },
  barIndex: number,
  chordIndex: number,
  chart?: Chart,
): number {
  const firstBar = timeline.bars.find((b) => b.measure === barIndex)
  if (!firstBar) return timeline.countIn

  if (chart && chart.bars[barIndex]) {
    const bar = chart.bars[barIndex]
    if (chordIndex >= 0 && chordIndex < bar.chords.length) {
      const offset = bar.chords.slice(0, chordIndex).reduce((sum, c) => sum + c.beats, 0)
      if (offset < firstBar.beats) {
        return firstBar.start + offset
      }
    }
    return firstBar.start
  }

  const barSlots = timeline.slots.filter(
    (s) => s.chorus === 0 && s.measure === barIndex && s.start >= firstBar.start && s.start < firstBar.start + firstBar.beats,
  )
  if (chordIndex >= 0 && chordIndex < barSlots.length) {
    return barSlots[chordIndex].start
  }

  return firstBar.start
}
