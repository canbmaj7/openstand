import { describe, expect, test } from 'vitest'
import { getStyle } from '../src/styles'
import {
  DEFAULT_SOUNDS,
  loadSounds,
  parseSounds,
  saveSounds,
  SOUNDS_KEY,
  withSounds,
} from '../src/styles/sounds'

function withMockStorage(run: (store: Map<string, string>) => void) {
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
    run(store)
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    })
  }
}

describe('withSounds', () => {
  test('replaces non-null instruments without mutating the input style', () => {
    const original = getStyle('medium-swing')
    const snapshot = structuredClone(original)

    const updated = withSounds(original, { bass: 35, comp: 24, drums: 40 })

    expect(updated).not.toBe(original)
    expect(updated.bass.program).toBe(35)
    expect(updated.comp.program).toBe(24)
    expect(updated.drums.kit).toBe(40)
    expect(original).toEqual(snapshot)
  })

  test('null selections preserve the style own sounds, and 0 is applied', () => {
    const bossa = getStyle('bossa-nova')
    const kept = withSounds(bossa, DEFAULT_SOUNDS)
    expect(kept.bass.program).toBe(bossa.bass.program)
    expect(kept.comp.program).toBe(bossa.comp.program)
    expect(kept.drums.kit).toBe(bossa.drums.kit)

    const zeroed = withSounds(bossa, { bass: null, comp: 0, drums: 0 })
    expect(zeroed.bass.program).toBe(bossa.bass.program)
    expect(zeroed.comp.program).toBe(0)
    expect(zeroed.drums.kit).toBe(0)
  })

  test('preserves both walking and pattern bass fields', () => {
    const walking = getStyle('medium-swing')
    expect(walking.bass.mode).toBe('walking')
    const updatedWalking = withSounds(walking, { bass: 33, comp: null, drums: null })
    expect(updatedWalking.bass).toEqual({ ...walking.bass, program: 33 })

    const pattern = getStyle('bossa-nova')
    expect(pattern.bass.mode).toBe('pattern')
    const updatedPattern = withSounds(pattern, { bass: 38, comp: null, drums: null })
    expect(updatedPattern.bass).toEqual({ ...pattern.bass, program: 38 })
    if (pattern.bass.mode === 'pattern' && updatedPattern.bass.mode === 'pattern') {
      expect(updatedPattern.bass.patterns).toBe(pattern.bass.patterns)
    }
  })
})

describe('parseSounds / loadSounds / saveSounds', () => {
  test('turns missing, malformed, or out-of-list values into null', () => {
    expect(parseSounds(null)).toEqual(DEFAULT_SOUNDS)
    expect(parseSounds('')).toEqual(DEFAULT_SOUNDS)
    expect(parseSounds('not json')).toEqual(DEFAULT_SOUNDS)
    expect(parseSounds('[]')).toEqual(DEFAULT_SOUNDS)
    expect(parseSounds('"bass"')).toEqual(DEFAULT_SOUNDS)
    expect(parseSounds(JSON.stringify({ bass: 999, comp: '24', drums: true }))).toEqual(DEFAULT_SOUNDS)
    expect(parseSounds(JSON.stringify({ bass: 0, comp: 32, drums: 33 }))).toEqual(DEFAULT_SOUNDS)
  })

  test('keeps valid listed programs including 0', () => {
    expect(parseSounds(JSON.stringify({ bass: 32, comp: 0, drums: 0 }))).toEqual({
      bass: 32,
      comp: 0,
      drums: 0,
    })
    expect(parseSounds(JSON.stringify({ bass: 34, comp: 99, drums: 40 }))).toEqual({
      bass: 34,
      comp: null,
      drums: 40,
    })
  })

  test('loads and saves through localStorage and recovers from invalid stored data', () => {
    withMockStorage((store) => {
      expect(loadSounds()).toEqual(DEFAULT_SOUNDS)

      saveSounds({ bass: 33, comp: 24, drums: 32 })
      expect(loadSounds()).toEqual({ bass: 33, comp: 24, drums: 32 })

      store.set(SOUNDS_KEY, '{bad')
      expect(loadSounds()).toEqual(DEFAULT_SOUNDS)

      store.set(SOUNDS_KEY, JSON.stringify({ bass: 35, comp: 1234 }))
      expect(loadSounds()).toEqual({ bass: 35, comp: null, drums: null })
    })
  })
})
