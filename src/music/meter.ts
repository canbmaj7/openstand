// Odd / aksak meter beat groupings in eighth notes (e.g. [2, 2, 2, 3] for 9/8).

import { isCompound, type TimeSignature } from './chart'

const DEFAULT_GROUPS: Record<number, readonly number[]> = {
  5: [3, 2],
  7: [3, 2, 2],
  8: [3, 3, 2],
  10: [3, 2, 2, 3],
  11: [2, 2, 3, 2, 2],
  13: [2, 2, 2, 3, 2, 2],
}

export interface GroupingPreset {
  label: string
  groups?: number[] // undefined = compound feel (e.g. 3+3+3 in 9/8)
}

const PRESETS: Record<string, GroupingPreset[]> = {
  '5/8': [
    { label: '3+2', groups: [3, 2] },
    { label: '2+3', groups: [2, 3] },
  ],
  '7/8': [
    { label: '3+2+2', groups: [3, 2, 2] },
    { label: '2+2+3', groups: [2, 2, 3] },
    { label: '2+3+2', groups: [2, 3, 2] },
  ],
  '9/8': [
    { label: '3+3+3 (compound)' },
    { label: '2+2+2+3', groups: [2, 2, 2, 3] },
    { label: '3+2+2+2', groups: [3, 2, 2, 2] },
    { label: '2+3+2+2', groups: [2, 3, 2, 2] },
  ],
  '10/8': [
    { label: '3+2+2+3', groups: [3, 2, 2, 3] },
    { label: '2+3+2+3', groups: [2, 3, 2, 3] },
  ],
  '11/8': [
    { label: '2+2+3+2+2', groups: [2, 2, 3, 2, 2] },
    { label: '3+2+2+2+2', groups: [3, 2, 2, 2, 2] },
    { label: '3+3+2+3', groups: [3, 3, 2, 3] },
  ],
}

export function isValidGroups(time: TimeSignature, groups: unknown): groups is number[] {
  const [beats, unit] = time
  if (!Array.isArray(groups) || groups.length === 0) return false
  if (!groups.every((g) => typeof g === 'number' && Number.isInteger(g) && g > 0)) return false
  const eighths = unit === 8 ? beats : unit === 4 ? beats * 2 : unit === 2 ? beats * 4 : 0
  return eighths > 0 && groups.reduce((sum, g) => sum + g, 0) === eighths
}

/**
 * Effective eighth-note beat grouping for a meter, or undefined when the meter
 * uses simple or compound (dotted-quarter) feel instead.
 */
export function groupsFor(time: TimeSignature, groups?: readonly number[]): number[] | undefined {
  const [beats, unit] = time
  if (unit !== 8) return undefined
  if (groups !== undefined && isValidGroups(time, groups)) return [...groups]
  if (isCompound(time)) return undefined
  if (DEFAULT_GROUPS[beats]) return [...DEFAULT_GROUPS[beats]]
  if (beats >= 5) {
    return beats % 2 === 1
      ? [3, ...Array.from({ length: (beats - 3) / 2 }, () => 2)]
      : [3, 3, ...Array.from({ length: (beats - 6) / 2 }, () => 2)]
  }
  return undefined
}

export function groupingOptions(time: TimeSignature): GroupingPreset[] {
  return PRESETS[time.join('/')] ?? []
}

export function sameGroups(a?: readonly number[], b?: readonly number[]): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}
