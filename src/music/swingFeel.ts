import type { StyleDefinition } from '../styles/types'

export const SWING_FEELS = [
  { id: 'straight', label: 'Straight', ratio: 0.5 },
  { id: 'light', label: 'Light', ratio: 0.58 },
  { id: 'medium', label: 'Medium', ratio: 0.64 },
  { id: 'heavy', label: 'Heavy', ratio: 0.7 },
] as const

export type SwingFeel = (typeof SWING_FEELS)[number]
export type SwingFeelId = SwingFeel['id']

/** Returns the style with an overridden swing ratio, or the original object when ratio is undefined. */
export function withSwing(style: StyleDefinition, ratio: number | undefined): StyleDefinition {
  if (ratio === undefined) return style
  return { ...style, swing: ratio }
}

/** Formats a swing ratio for display ('straight' for 0.5, otherwise rounded percentage). */
export function swingLabel(ratio: number): string {
  return ratio === 0.5 ? 'straight' : `${Math.round(ratio * 100)}%`
}

/** Finds the preset feel closest to a stored swing ratio. */
export function closestSwingFeel(ratio: number): SwingFeel {
  let best: SwingFeel = SWING_FEELS[0]
  let bestDiff = Math.abs(best.ratio - ratio)
  for (let i = 1; i < SWING_FEELS.length; i++) {
    const diff = Math.abs(SWING_FEELS[i].ratio - ratio)
    if (diff < bestDiff) {
      best = SWING_FEELS[i]
      bestDiff = diff
    }
  }
  return best
}

/** Resolves a preset feel id from the UI selector back to its ratio, or undefined for style default. */
export function swingRatioForId(id: string): number | undefined {
  return SWING_FEELS.find((feel) => feel.id === id)?.ratio
}
