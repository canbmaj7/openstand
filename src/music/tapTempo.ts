export interface TapTempoOptions {
  now?: () => number
  resetMs?: number
  maxTaps?: number
}

export interface TapTempo {
  tap: () => number | null
  reset: () => void
}

const DEFAULT_RESET_MS = 2000
const DEFAULT_MAX_TAPS = 6
const OUTLIER_RATIO = 0.4

/**
 * Create a tap-tempo tracker that averages intervals over the last `maxTaps` taps.
 * Resets the tap sequence if the gap exceeds `resetMs` or an interval deviates by 40%+ from the current mean.
 */
export function createTapTempo(options: TapTempoOptions = {}): TapTempo {
  const now = options.now ?? (() => performance.now())
  const resetMs = options.resetMs ?? DEFAULT_RESET_MS
  const maxTaps = Math.max(2, Math.floor(options.maxTaps ?? DEFAULT_MAX_TAPS))
  let taps: number[] = []

  const reset = () => {
    taps = []
  }

  const tap = (): number | null => {
    const t = now()
    if (!Number.isFinite(t)) return null

    if (taps.length === 0) {
      taps = [t]
      return null
    }

    const last = taps[taps.length - 1]
    const interval = t - last

    if (interval <= 0 || interval > resetMs) {
      taps = [t]
      return null
    }

    if (taps.length >= 2) {
      const avgSoFar = (last - taps[0]) / (taps.length - 1)
      if (Math.abs(interval - avgSoFar) / avgSoFar >= OUTLIER_RATIO) {
        taps = [t]
        return null
      }
    }

    taps.push(t)
    if (taps.length > maxTaps) {
      taps.shift()
    }

    const span = taps[taps.length - 1] - taps[0]
    return Math.round((60000 * (taps.length - 1)) / span)
  }

  return { tap, reset }
}
