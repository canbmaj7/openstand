import { describe, expect, test } from 'vitest'
import { fitScale, maxFitForWidth, MAX_FIT_SCALE } from '../src/ui/useFitScale'

describe('fitScale', () => {
  test('scales short charts up to fill available height', () => {
    expect(fitScale({ w: 400, h: 400 }, { w: 1200, h: 800 })).toBeCloseTo(2, 5)
    expect(fitScale({ w: 300, h: 500 }, { w: 1000, h: 750 })).toBeCloseTo(1.5, 5)
  })

  test('respects the width ratio when width is the limiting factor', () => {
    expect(fitScale({ w: 500, h: 200 }, { w: 750, h: 800 })).toBeCloseTo(1.5, 5)
    expect(fitScale({ w: 600, h: 400 }, { w: 720, h: 1000 })).toBeCloseTo(1.2, 5)
  })

  test('clamps to max ceiling', () => {
    expect(MAX_FIT_SCALE).toBe(2.2)
    expect(fitScale({ w: 100, h: 100 }, { w: 1000, h: 1000 })).toBe(2.2)
    expect(fitScale({ w: 100, h: 100 }, { w: 1000, h: 1000 }, 1.8)).toBe(1.8)
  })

  test('never shrinks long or wide charts below 1', () => {
    expect(fitScale({ w: 400, h: 1200 }, { w: 1200, h: 800 })).toBe(1)
    expect(fitScale({ w: 1400, h: 400 }, { w: 1200, h: 800 })).toBe(1)
    expect(fitScale({ w: 800, h: 800 }, { w: 800, h: 800 })).toBe(1)
  })

  test('returns 1 for invalid, zero, negative, or non-finite inputs', () => {
    expect(fitScale({ w: 0, h: 400 }, { w: 800, h: 800 })).toBe(1)
    expect(fitScale({ w: 400, h: 0 }, { w: 800, h: 800 })).toBe(1)
    expect(fitScale({ w: 400, h: 400 }, { w: 0, h: 800 })).toBe(1)
    expect(fitScale({ w: 400, h: 400 }, { w: 800, h: -10 })).toBe(1)
    expect(fitScale({ w: NaN, h: 400 }, { w: 800, h: 800 })).toBe(1)
    expect(fitScale({ w: 400, h: Infinity }, { w: 800, h: 800 })).toBe(1)
    expect(fitScale({ w: 400, h: 400 }, { w: 800, h: 800 }, 0.5)).toBe(1)
    expect(fitScale({ w: 400, h: 400 }, { w: 800, h: 800 }, NaN)).toBe(1)
  })
})

describe('maxFitForWidth', () => {
  test('keeps phones at 1 and lets wide screens grow up to the cap', () => {
    expect(maxFitForWidth(366)).toBe(1)
    expect(maxFitForWidth(768)).toBeCloseTo(1.2)
    expect(maxFitForWidth(1220)).toBeCloseTo(1.906, 2)
    expect(maxFitForWidth(4000)).toBe(2.2)
  })
})
