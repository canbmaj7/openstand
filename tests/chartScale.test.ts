import { describe, expect, test } from 'vitest'
import {
  CHART_SCALE_KEY,
  CHART_SCALES,
  DEFAULT_CHART_SCALE,
  isChartScale,
  loadChartScale,
  parseScale,
  saveChartScale,
  stepScale,
} from '../src/ui/chartScale'

describe('chartScale helpers', () => {
  test('exposes expected scale steps and default', () => {
    expect(CHART_SCALES).toEqual([85, 100, 115, 130, 150])
    expect(DEFAULT_CHART_SCALE).toBe(100)
  })

  test('isChartScale recognizes only supported numeric steps', () => {
    for (const s of CHART_SCALES) expect(isChartScale(s)).toBe(true)
    expect(isChartScale(90)).toBe(false)
    expect(isChartScale('100')).toBe(false)
    expect(isChartScale(null)).toBe(false)
    expect(isChartScale(NaN)).toBe(false)
  })

  test('parseScale parses valid scales and falls back to 100 for unknown values', () => {
    expect(parseScale(85)).toBe(85)
    expect(parseScale('115')).toBe(115)
    expect(parseScale(' 130 ')).toBe(130)
    expect(parseScale('150')).toBe(150)

    expect(parseScale(null)).toBe(100)
    expect(parseScale(undefined)).toBe(100)
    expect(parseScale('')).toBe(100)
    expect(parseScale('   ')).toBe(100)
    expect(parseScale('120')).toBe(100)
    expect(parseScale('abc')).toBe(100)
    expect(parseScale(0)).toBe(100)
    expect(parseScale(-85)).toBe(100)
    expect(parseScale(Infinity)).toBe(100)
  })

  test('stepScale steps up and down and clamps at the ends', () => {
    expect(stepScale(85, -1)).toBe(85)
    expect(stepScale(85, 1)).toBe(100)
    expect(stepScale(100, 1)).toBe(115)
    expect(stepScale(115, 1)).toBe(130)
    expect(stepScale(130, 1)).toBe(150)
    expect(stepScale(150, 1)).toBe(150)
    expect(stepScale(150, -1)).toBe(130)
    expect(stepScale(100, -1)).toBe(85)
  })

  test('loadChartScale and saveChartScale handle storage and errors safely', () => {
    const store = new Map<string, string>()
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    }
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    })
    try {
      expect(loadChartScale()).toBe(100)

      mockStorage.setItem(CHART_SCALE_KEY, 'invalid')
      expect(loadChartScale()).toBe(100)

      saveChartScale(130)
      expect(store.get(CHART_SCALE_KEY)).toBe('130')
      expect(loadChartScale()).toBe(130)

      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          getItem: () => {
            throw new Error('blocked')
          },
          setItem: () => {
            throw new Error('blocked')
          },
        },
        writable: true,
        configurable: true,
      })
      expect(loadChartScale()).toBe(100)
      expect(() => saveChartScale(115)).not.toThrow()
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        writable: true,
        configurable: true,
      })
    }
  })
})
