// Memorization practice: progressively or completely hide chord symbols during playback

export type HideChords = 'off' | 'gradual' | 'all'

export const HIDE_CHORDS_KEY = 'openstand:hide-chords'

export function parseHideChords(value: unknown): HideChords {
  if (value === 'gradual') return 'gradual'
  if (value === 'all') return 'all'
  return 'off'
}

export function loadHideChords(): HideChords {
  try {
    if (typeof localStorage === 'undefined') return 'off'
    return parseHideChords(localStorage.getItem(HIDE_CHORDS_KEY))
  } catch {
    return 'off'
  }
}

export function saveHideChords(mode: HideChords): void {
  try {
    localStorage.setItem(HIDE_CHORDS_KEY, mode)
  } catch {
    // Storage may be disabled in private browsing
  }
}

export function hiddenFraction(mode: HideChords, chorus: number): number {
  if (mode === 'off') return 0
  if (mode === 'all') return 1
  if (!(chorus > 0)) return 0
  if (chorus >= 4) return 1
  return Math.floor(chorus) * 0.25
}

// Deterministic [0, 1) rank per written bar index so increasing fraction only adds hidden bars
function barRank(barIndex: number): number {
  let h = ((barIndex | 0) + 0x9e3779b9) | 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h = h ^ (h >>> 16)
  return (h >>> 0) / 0x100000000
}

export function isBarHidden(barIndex: number, fraction: number): boolean {
  if (fraction <= 0) return false
  if (fraction >= 1) return true
  return barRank(barIndex) < fraction
}
