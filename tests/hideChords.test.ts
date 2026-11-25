import { describe, expect, test } from 'vitest'
import { hiddenFraction, isBarHidden, parseHideChords } from '../src/music/hideChords'

describe('parseHideChords', () => {
  test('accepts valid modes and falls back to off', () => {
    expect(parseHideChords('off')).toBe('off')
    expect(parseHideChords('gradual')).toBe('gradual')
    expect(parseHideChords('all')).toBe('all')
    expect(parseHideChords(null)).toBe('off')
    expect(parseHideChords(undefined)).toBe('off')
    expect(parseHideChords('')).toBe('off')
    expect(parseHideChords('some')).toBe('off')
    expect(parseHideChords(1)).toBe('off')
  })
})

describe('hiddenFraction', () => {
  test('returns expected fraction per mode and chorus', () => {
    for (const chorus of [0, 1, 2, 3, 4, 8]) {
      expect(hiddenFraction('off', chorus)).toBe(0)
      expect(hiddenFraction('all', chorus)).toBe(1)
    }

    expect(hiddenFraction('gradual', -1)).toBe(0)
    expect(hiddenFraction('gradual', 0)).toBe(0)
    expect(hiddenFraction('gradual', 1)).toBe(0.25)
    expect(hiddenFraction('gradual', 2)).toBe(0.5)
    expect(hiddenFraction('gradual', 3)).toBe(0.75)
    expect(hiddenFraction('gradual', 4)).toBe(1)
    expect(hiddenFraction('gradual', 5)).toBe(1)
  })
})

describe('isBarHidden', () => {
  const bars = Array.from({ length: 40 }, (_, i) => i)

  test('hides none at fraction 0 and all at fraction 1', () => {
    expect(bars.every((i) => !isBarHidden(i, 0))).toBe(true)
    expect(bars.every((i) => isBarHidden(i, 1))).toBe(true)
  })

  test('is monotonic as fraction increases', () => {
    const fractions = [0, 0.25, 0.5, 0.75, 1]
    for (let step = 0; step < fractions.length - 1; step++) {
      const f1 = fractions[step]
      const f2 = fractions[step + 1]
      for (const i of bars) {
        if (isBarHidden(i, f1)) {
          expect(isBarHidden(i, f2)).toBe(true)
        }
      }
    }
  })

  test('hides roughly half of 40 bars at fraction 0.5', () => {
    const count = bars.filter((i) => isBarHidden(i, 0.5)).length
    expect(count).toBeGreaterThanOrEqual(10)
    expect(count).toBeLessThanOrEqual(30)
  })
})
