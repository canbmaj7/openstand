// Practice settings: loop part of a tune, go round the keys, speed up each chorus

import type { CountInMode, PracticeOptions, SubMode } from '../engine/timeline'
import { clampBpm } from '../library/tuneSettings'
import type { Chart } from './chart'

export interface PracticeSettings {
  loop: [number, number] | null // written bar indices
  keyStep: number // semitones per chorus
  randomKeys?: { seed: number } // deterministic shuffled keys per 12-chorus block
  keyEvery: number // choruses in each key before changing (1–4)
  ramp: number // bpm added per speed-up step
  rampEvery: number // choruses between speed-up steps (1–4)
  subs: SubMode // play optional chord substitutions
  countIn: CountInMode // count-in bars: 'auto', 'off', 1, or 2
}

export const NO_PRACTICE: PracticeSettings = { loop: null, keyStep: 0, keyEvery: 1, ramp: 0, rampEvery: 1, subs: 'off', countIn: 'auto' }

export function practiceOptions(settings: PracticeSettings): PracticeOptions {
  return {
    loop: settings.loop,
    keyStep: settings.keyStep,
    ...(settings.randomKeys ? { randomKeys: settings.randomKeys } : {}),
    ...(settings.keyEvery > 1 ? { keyEvery: settings.keyEvery } : {}),
    subs: settings.subs,
    countIn: settings.countIn,
  }
}

export function newRandomKeySeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}

export function chorusBpm(bpm: number, ramp: number, rampEvery: number, chorus: number): number {
  const every = Math.max(1, Math.min(4, Math.floor(rampEvery || 1)))
  const step = Math.floor(Math.max(0, chorus) / every)
  return clampBpm(bpm + ramp * step)
}

export const COUNT_IN_KEY = 'openstand:count-in'

export function parseCountIn(value: unknown): CountInMode {
  if (value === 'off') return 'off'
  if (value === '1' || value === 1) return 1
  if (value === '2' || value === 2) return 2
  return 'auto'
}

export function loadCountIn(): CountInMode {
  try {
    if (typeof localStorage === 'undefined') return 'auto'
    return parseCountIn(localStorage.getItem(COUNT_IN_KEY))
  } catch {
    return 'auto'
  }
}

export function saveCountIn(mode: CountInMode): void {
  try {
    localStorage.setItem(COUNT_IN_KEY, String(mode))
  } catch {
    // Storage may be disabled in private browsing
  }
}

export const KEY_STEPS: { step: number | 'random'; label: string }[] = [
  { step: 0, label: 'Stay in the written key' },
  { step: 5, label: 'Up a fourth' },
  { step: 7, label: 'Up a fifth' },
  { step: 1, label: 'Up a half step' },
  { step: 11, label: 'Down a half step' },
  { step: 2, label: 'Up a whole step' },
  { step: 3, label: 'Up a minor third' },
  { step: 4, label: 'Up a major third' },
  { step: 'random', label: 'Random keys' },
]

export const RAMP_INTERVALS: { every: number; label: string }[] = [
  { every: 1, label: 'every chorus' },
  { every: 2, label: 'every 2 choruses' },
  { every: 3, label: 'every 3 choruses' },
  { every: 4, label: 'every 4 choruses' },
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
