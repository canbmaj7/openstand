export const CHART_SCALES = [85, 100, 115, 130, 150] as const

export type ChartScale = (typeof CHART_SCALES)[number]

export const DEFAULT_CHART_SCALE: ChartScale = 100
export const CHART_SCALE_KEY = 'openstand:chart-scale'

export function isChartScale(value: unknown): value is ChartScale {
  return typeof value === 'number' && (CHART_SCALES as readonly number[]).includes(value)
}

/** Parse a stored or serialized chart scale, falling back to 100% for unknown values. */
export function parseScale(value: unknown): ChartScale {
  if (isChartScale(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed !== '') {
      const n = Number(trimmed)
      if (isChartScale(n)) return n
    }
  }
  return DEFAULT_CHART_SCALE
}

/** Step to the next smaller (-1) or larger (+1) scale, clamped to the supported range. */
export function stepScale(current: ChartScale, delta: -1 | 1): ChartScale {
  const index = CHART_SCALES.indexOf(current)
  if (index === -1) return DEFAULT_CHART_SCALE
  const next = Math.max(0, Math.min(CHART_SCALES.length - 1, index + delta))
  return CHART_SCALES[next]
}

export function loadChartScale(): ChartScale {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_CHART_SCALE
    return parseScale(localStorage.getItem(CHART_SCALE_KEY))
  } catch {
    return DEFAULT_CHART_SCALE
  }
}

export function saveChartScale(scale: ChartScale): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(CHART_SCALE_KEY, String(scale))
  } catch {
    // Storage may be disabled in private browsing
  }
}
