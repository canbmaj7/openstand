import { describe, expect, test } from 'vitest'
import {
  BPM_RANGE,
  clearStyleFromTuneSettings,
  clearTuneSettings,
  DEFAULT_CHORUSES,
  LEGACY_TUNE_STYLES_KEY,
  loadTuneSettings,
  MAX_CHORUSES,
  parseTuneSettings,
  saveTuneSettings,
  TUNE_SETTINGS_KEY,
  updateTuneSettings,
} from '../src/library/tuneSettings'

function withMockStorage(initial: Record<string, string>, run: (store: Map<string, string>) => void) {
  const store = new Map(Object.entries(initial))
  const original = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    },
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

describe('tuneSettings', () => {
  test('parseTuneSettings validates each field independently and drops corrupt entries', () => {
    expect(parseTuneSettings(null)).toEqual({})
    expect(parseTuneSettings([])).toEqual({})
    expect(parseTuneSettings('bad')).toEqual({})

    const parsed = parseTuneSettings({
      '': { bpm: 120 },
      badEntry: 'not-an-object',
      arrayEntry: [120],
      allInvalid: {
        style: '',
        bpm: BPM_RANGE[0] - 1,
        transpose: 12,
        choruses: 0,
      },
      mixed: {
        style: 'bossa-nova',
        bpm: BPM_RANGE[1] + 1, // out of range -> dropped
        transpose: 1.5, // non-integer -> dropped
        choruses: MAX_CHORUSES, // valid
      },
      edgeValid: {
        style: 'my:custom',
        bpm: BPM_RANGE[0],
        transpose: -11,
        choruses: 1,
      },
      edgeMax: {
        bpm: BPM_RANGE[1],
        transpose: 11,
        choruses: MAX_CHORUSES,
      },
      nonFinite: {
        bpm: Number.NaN,
        transpose: Number.POSITIVE_INFINITY,
        choruses: MAX_CHORUSES + 1,
        style: 42,
      },
    })

    expect(parsed).toEqual({
      mixed: { style: 'bossa-nova', choruses: MAX_CHORUSES },
      edgeValid: { style: 'my:custom', bpm: BPM_RANGE[0], transpose: -11, choruses: 1 },
      edgeMax: { bpm: BPM_RANGE[1], transpose: 11, choruses: MAX_CHORUSES },
    })
  })

  test('updateTuneSettings merges patches, strips fields matching defaults, and removes empty records', () => {
    const defaults = { style: 'medium-swing', bpm: 140 }

    let all = updateTuneSettings({}, 'jazz-blues', { bpm: 160, transpose: 2 }, defaults)
    expect(all).toEqual({ 'jazz-blues': { bpm: 160, transpose: 2 } })

    // Updating choruses preserves existing bpm and transpose
    all = updateTuneSettings(all, 'jazz-blues', { choruses: 5 }, defaults)
    expect(all).toEqual({ 'jazz-blues': { bpm: 160, transpose: 2, choruses: 5 } })

    // Setting style to default is not stored
    all = updateTuneSettings(all, 'jazz-blues', { style: 'medium-swing' }, defaults)
    expect(all).toEqual({ 'jazz-blues': { bpm: 160, transpose: 2, choruses: 5 } })

    // Setting individual fields back to defaults deletes those fields
    all = updateTuneSettings(all, 'jazz-blues', { bpm: 140 }, defaults)
    expect(all).toEqual({ 'jazz-blues': { transpose: 2, choruses: 5 } })

    all = updateTuneSettings(all, 'jazz-blues', { transpose: 0, choruses: DEFAULT_CHORUSES }, defaults)
    expect(all).toEqual({})
    expect('jazz-blues' in all).toBe(false)
  })

  test('clearTuneSettings and clearStyleFromTuneSettings preserve unrelated data', () => {
    const initial = {
      a: { style: 'my:one', bpm: 150 },
      b: { style: 'my:one' },
      c: { style: 'bossa-nova', transpose: -2 },
    }
    const afterStyle = clearStyleFromTuneSettings(initial, 'my:one')
    expect(afterStyle).toEqual({
      a: { bpm: 150 },
      c: { style: 'bossa-nova', transpose: -2 },
    })
    expect(clearTuneSettings(afterStyle, 'a')).toEqual({
      c: { style: 'bossa-nova', transpose: -2 },
    })
  })

  test('loadTuneSettings migrates openstand:tune-styles once without deleting it', () => {
    withMockStorage(
      {
        [LEGACY_TUNE_STYLES_KEY]: JSON.stringify({
          'jazz-blues-f': 'bossa-nova',
          invalid: 123,
          empty: '',
        }),
      },
      (store) => {
        const loaded = loadTuneSettings()
        expect(loaded).toEqual({ 'jazz-blues-f': { style: 'bossa-nova' } })
        // Legacy key must remain intact
        expect(store.get(LEGACY_TUNE_STYLES_KEY)).toBeDefined()
        // Migrated key is written so migration only happens on first load
        expect(JSON.parse(store.get(TUNE_SETTINGS_KEY) ?? '{}')).toEqual({ 'jazz-blues-f': { style: 'bossa-nova' } })
      },
    )

    // When new key already exists (even empty), legacy key is ignored
    withMockStorage(
      {
        [TUNE_SETTINGS_KEY]: JSON.stringify({}),
        [LEGACY_TUNE_STYLES_KEY]: JSON.stringify({ 'jazz-blues-f': 'bossa-nova' }),
      },
      () => {
        expect(loadTuneSettings()).toEqual({})
      },
    )
  })

  test('loadTuneSettings and saveTuneSettings survive corrupt JSON and localStorage errors', () => {
    withMockStorage({ [TUNE_SETTINGS_KEY]: '{not-json' }, () => {
      expect(loadTuneSettings()).toEqual({})
    })

    withMockStorage({ [LEGACY_TUNE_STYLES_KEY]: '{not-json' }, () => {
      expect(loadTuneSettings()).toEqual({})
    })

    const original = globalThis.localStorage
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
    try {
      expect(loadTuneSettings()).toEqual({})
      expect(() => saveTuneSettings({ a: { bpm: 120 } })).not.toThrow()
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        writable: true,
        configurable: true,
      })
    }
  })
})
