export const DEFAULT_A4 = 440
export const A4_RANGE = [430, 450] as const
export const TUNING_KEY = 'openstand:tuning'

export interface TuningSynthTarget {
  setSystemParameter(parameter: 'fineTune', value: number): void
}

export function centsForA4(hz: number): number {
  if (!Number.isFinite(hz) || hz <= 0) return 0
  return 1200 * Math.log2(hz / DEFAULT_A4)
}

export function clampA4(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_A4
  return Math.max(A4_RANGE[0], Math.min(A4_RANGE[1], Math.round(value)))
}

export function parseA4(raw: string | null): number {
  if (raw === null || raw.trim() === '') return DEFAULT_A4
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? clampA4(parsed) : DEFAULT_A4
}

export function loadTuning(): number {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_A4
    return parseA4(localStorage.getItem(TUNING_KEY))
  } catch {
    return DEFAULT_A4
  }
}

export function saveTuning(hz: number): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(TUNING_KEY, String(clampA4(hz)))
  } catch {
    // Storage may be disabled in private browsing
  }
}

export function applyTuning(synth: TuningSynthTarget, cents: number): void {
  synth.setSystemParameter('fineTune', Number.isFinite(cents) ? cents : 0)
}
