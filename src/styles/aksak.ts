// Rhythm-section patterns for odd / aksak meters (5/8, 7/8, 9/8, 10/8, 11/8…).
// Every position is in quarter-note beats (one eighth note = 0.5), with straight feel (0.5).

import { chance } from '../engine/events'
import type { BassNote, BassTone, CompHit, DrumHit, StyleFamily } from './types'

/** Group start positions within a bar, in quarter-note beats. */
export function groupStarts(groups: readonly number[]): number[] {
  const starts: number[] = []
  let eighth = 0
  for (const g of groups) {
    starts.push(eighth * 0.5)
    eighth += g
  }
  return starts
}

function eighthGroupMap(groups: readonly number[]): number[] {
  const map: number[] = []
  groups.forEach((g, idx) => {
    for (let k = 0; k < g; k++) map.push(idx)
  })
  return map
}

function aksakFill(lastStart: number, lastLen: number, family: StyleFamily): DrumHit[] {
  const hits: DrumHit[] = []
  const seq =
    family === 'world' || family === 'latin'
      ? (['tomHigh', 'tomMid', 'congaHigh'] as const)
      : (['tomHigh', 'tomMid', 'snare'] as const)
  for (let k = 0; k < lastLen; k++) {
    const at = lastStart + k * 0.5
    const drum = seq[Math.min(k, seq.length - 1)]
    hits.push([at, drum, 80 + k * 4])
  }
  return hits
}

/** Drum pattern for a grouped bar, keyed by style family and bar position. */
export function aksakDrums(
  groups: readonly number[],
  family: StyleFamily,
  pos: { isFirst?: boolean; isLast?: boolean } = {},
): DrumHit[] {
  const totalEighths = groups.reduce((a, b) => a + b, 0)
  const starts = groupStarts(groups)
  const lastIdx = groups.length - 1
  const groupOf = eighthGroupMap(groups)
  const hits: DrumHit[] = []

  const isStartAt = (e: number) => e === 0 || groupOf[e] !== groupOf[e - 1]
  const isThirdOfLong = (e: number) => e >= 2 && groupOf[e] === groupOf[e - 2] && groups[groupOf[e]] >= 3

  for (let e = 0; e < totalEighths; e++) {
    const at = e * 0.5
    const g = groupOf[e]
    const isStart = isStartAt(e)
    const isLong = groups[g] >= 3
    const isFinal = g === lastIdx && groups.length > 1

    if (family === 'world' || family === 'latin') {
      if (isStart) {
        if (g === 0 || isLong || isFinal) {
          hits.push([at, 'congaLow', g === 0 ? 100 : 88])
          hits.push([at, 'kick', g === 0 ? 74 : 62])
        } else {
          hits.push([at, 'congaHigh', 82])
        }
        if (family === 'world') hits.push([at, 'tambourine', g === 0 ? 68 : 56])
        else {
          hits.push([at, 'shaker', 60])
          hits.push([at, 'claves', 68, 0.7])
        }
      } else {
        hits.push([at, 'congaMute', 54, 0.85])
        hits.push([at, family === 'world' ? 'tambourine' : 'shaker', 46, 0.78])
        if (isThirdOfLong(e)) hits.push([at, 'congaHigh', 58, 0.4])
      }
    } else if (family === 'jazz') {
      if (isStart) {
        hits.push([at, 'ride', g === 0 ? 88 : isLong || isFinal ? 80 : 72])
        hits.push([at, 'hhPedal', g === 0 ? 66 : 58])
        if (g === 0) hits.push([at, 'kick', 52])
        else if (isLong || isFinal) hits.push([at, 'kick', 42, 0.65])
      } else {
        hits.push([at, 'ride', 52])
        if (e === totalEighths - 1) hits.push([at, 'snare', 40, 0.25])
      }
    } else {
      // 'pop' | 'funk'
      if (isStart) {
        if (!(pos.isFirst && g === 0)) hits.push([at, 'hhClosed', g === 0 ? 84 : 74])
        if (g === 0 || isLong) hits.push([at, 'kick', g === 0 ? 96 : 84])
        if (isFinal) hits.push([at, 'snare', 88])
        else if (family === 'funk' && g > 0) hits.push([at, 'snare', 44, 0.35])
      } else {
        hits.push([at, 'hhClosed', 54])
        if (family === 'funk') hits.push([at, 'snare', 40, 0.2])
      }
    }
  }

  let out = hits
  if (pos.isLast && groups.length > 0) {
    const lastStart = starts[lastIdx]
    out = [...out.filter(([at]) => at < lastStart - 1e-9), ...aksakFill(lastStart, groups[lastIdx], family)]
  }
  if (pos.isFirst) {
    out.push([0, 'crash', family === 'jazz' ? 86 : 90, 1, 1.5])
  }
  return out
}

/** Bass line on group starts, clipped to [barOffset, barOffset + spanBeats). */
export function aksakBass(
  groups: readonly number[],
  _family: StyleFamily,
  barOffset = 0,
  spanBeats = Infinity,
): BassNote[] {
  const starts = groupStarts(groups)
  const lastIdx = groups.length - 1
  const barNotes: BassNote[] = starts.map((at, i) => {
    const dur = groups[i] * 0.5 * 0.9
    let tone: BassTone = 'R'
    let vel = 80
    if (i === 0) {
      tone = 'R'
      vel = 98
    } else if (i === lastIdx) {
      tone = chance(0.4) ? 'app' : '5'
      vel = 88
    } else if (groups[i] >= 3) {
      tone = '5'
      vel = 90
    } else {
      tone = i % 2 === 1 ? 'R' : '5'
      vel = 78
    }
    return { at, dur, tone, vel }
  })

  const end = barOffset + spanBeats
  return barNotes
    .filter((n) => n.at >= barOffset - 1e-9 && n.at < end - 1e-9)
    .map((n) => ({
      ...n,
      at: n.at - barOffset,
      dur: Math.max(0.1, Math.min(n.dur, end - n.at)),
    }))
}

/** Short comping chords on group starts, clipped to [barOffset, barOffset + spanBeats). */
export function aksakComp(
  groups: readonly number[],
  family: StyleFamily,
  barOffset = 0,
  spanBeats = Infinity,
): CompHit[] {
  const starts = groupStarts(groups)
  const lastIdx = groups.length - 1
  const skipFirst = groups.length > 1 && family === 'jazz' && barOffset === 0 && spanBeats >= starts[lastIdx] && chance(0.4)
  const barHits: CompHit[] = []

  starts.forEach((at, i) => {
    if (i === 0 && skipFirst) return
    const maxDur = Math.min(0.42, groups[i] * 0.5 * 0.55)
    let vel = 68
    if (groups.length === 1) vel = 84
    else if (i === 0) vel = family === 'world' ? 60 : 54
    else if (i === lastIdx) vel = 90
    else if (groups[i] >= 3) vel = 78
    barHits.push([at, i === 0 ? Math.min(0.35, maxDur) : maxDur, vel])
  })

  const end = barOffset + spanBeats
  return barHits
    .filter(([at]) => at >= barOffset - 1e-9 && at < end - 1e-9)
    .map(([at, dur, vel]): CompHit => [at - barOffset, Math.max(0.1, Math.min(dur, end - at)), vel])
}
