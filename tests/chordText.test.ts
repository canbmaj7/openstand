import { describe, expect, test } from 'vitest'
import { parseChord } from '../src/music/chords'
import {
  CHORD_FONT_KEY,
  isChordFont,
  loadChordFont,
  plainChordParts,
  plainChordText,
  typesetPlain,
} from '../src/music/chordText'

describe('chordText - plain chord text generation', () => {
  test('converts standard jazz chord symbols to plain notation', () => {
    // Required examples from issue specification
    const cMaj7 = parseChord('C^7')!
    expect(plainChordText(cMaj7, 0)).toBe('CΔ7')

    const dMin7 = parseChord('D-7')!
    expect(plainChordText(dMin7, 0)).toBe('Dm7')

    const eHalfDim = parseChord('Eh7')!
    expect(plainChordText(eHalfDim, 0)).toBe('Em7♭5')

    const bDim7 = parseChord('Bo7')!
    expect(plainChordText(bDim7, 0)).toBe('B°7')

    const bb7b9 = parseChord('Bb7b9')!
    expect(plainChordText(bb7b9, 0)).toBe('B♭7♭9')
  })

  test('accepts chord strings directly as input', () => {
    expect(plainChordText('C^7', 0)).toBe('CΔ7')
    expect(plainChordText('D-7', 0)).toBe('Dm7')
    expect(plainChordText('Eh7', 0)).toBe('Em7♭5')
    expect(plainChordText('Bo7', 0)).toBe('B°7')
    expect(plainChordText('Bb7b9', 0)).toBe('B♭7♭9')
  })

  test('handles minor variants (- and min)', () => {
    expect(plainChordText('A-', 0)).toBe('Am')
    expect(plainChordText('Amin', 0)).toBe('Am')
    expect(plainChordText('C-6', 0)).toBe('Cm6')
    expect(plainChordText('C-9', 0)).toBe('Cm9')
    expect(plainChordText('C-11', 0)).toBe('Cm11')
  })

  test('handles major 7th variants (^, maj, maj7)', () => {
    expect(plainChordText('C^', 0)).toBe('CΔ7')
    expect(plainChordText('Cmaj', 0)).toBe('CΔ7')
    expect(plainChordText('Cmaj7', 0)).toBe('CΔ7')
    expect(plainChordText('C^9', 0)).toBe('CΔ9')
  })

  test('handles half-diminished variants (h, h7, -7b5, m7b5, ø7)', () => {
    expect(plainChordText('Eh', 0)).toBe('Em7♭5')
    expect(plainChordText('Eh7', 0)).toBe('Em7♭5')
    expect(plainChordText('E-7b5', 0)).toBe('Em7♭5')
    expect(plainChordText('Em7b5', 0)).toBe('Em7♭5')
    expect(plainChordText('Eø7', 0)).toBe('Em7♭5')
  })

  test('handles diminished variants (o, o7, dim, dim7)', () => {
    expect(plainChordText('Bo', 0)).toBe('B°')
    expect(plainChordText('Bo7', 0)).toBe('B°7')
    expect(plainChordText('Bdim', 0)).toBe('B°')
    expect(plainChordText('Bdim7', 0)).toBe('B°7')
  })

  test('handles augmented chords (+, aug, +7)', () => {
    expect(plainChordText('C+', 0)).toBe('C+')
    expect(plainChordText('Caug', 0)).toBe('C+')
    expect(plainChordText('C+7', 0)).toBe('C+7')
  })

  test('handles dominant and altered extensions', () => {
    expect(plainChordText('C7', 0)).toBe('C7')
    expect(plainChordText('G7alt', 0)).toBe('G7alt')
    expect(plainChordText('C7#9', 0)).toBe('C7♯9')
    expect(plainChordText('C7b9#11', 0)).toBe('C7♭9♯11')
    expect(plainChordText('C7b13', 0)).toBe('C7♭13')
    expect(plainChordText('C7sus', 0)).toBe('C7sus')
  })

  test('handles slash chords and key context', () => {
    // In key 0 (C), chromatic bass notes default to flats
    expect(plainChordText('Bb7/D', 0)).toBe('B♭7/D')
    expect(plainChordText('C/E', 0)).toBe('C/E')

    // In key 9 (A major), written key has C#
    expect(plainChordText('A/C#', 9)).toBe('A/C♯')

    // In key 7 (G major), root is F#
    expect(plainChordText('F#7', 7)).toBe('F♯7')
  })

  test('plainChordParts decomposes chord components accurately', () => {
    const parts = plainChordParts(parseChord('Bb7b9')!, 0)
    expect(parts).toEqual({
      root: 'B',
      accidental: '♭',
      quality: '7',
      extensions: '♭9',
      bass: '',
    })

    const halfDimParts = plainChordParts(parseChord('Eh7')!, 0)
    expect(halfDimParts).toEqual({
      root: 'E',
      accidental: '',
      quality: 'm7',
      extensions: '♭5',
      bass: '',
    })

    const slashParts = plainChordParts(parseChord('A/C#')!, 9)
    expect(slashParts).toEqual({
      root: 'A',
      accidental: '',
      quality: '',
      extensions: '',
      bass: 'C♯',
    })
  })

  test('typesetPlain extracts quality and extensions', () => {
    expect(typesetPlain('^7')).toEqual({ quality: 'Δ7', extensions: '' })
    expect(typesetPlain('-7')).toEqual({ quality: 'm7', extensions: '' })
    expect(typesetPlain('h7')).toEqual({ quality: 'm7', extensions: '♭5' })
    expect(typesetPlain('o7')).toEqual({ quality: '°7', extensions: '' })
    expect(typesetPlain('7b9')).toEqual({ quality: '7', extensions: '♭9' })
  })

  test('handles invalid inputs gracefully', () => {
    expect(plainChordText('NOT_A_CHORD', 0)).toBe('NOT_A_CHORD')
  })
})

describe('chordFont settings', () => {
  test('isChordFont recognizes valid font preferences', () => {
    expect(isChordFont('Handwritten')).toBe(true)
    expect(isChordFont('Plain')).toBe(true)
    expect(isChordFont('other')).toBe(false)
    expect(isChordFont(null)).toBe(false)
    expect(isChordFont(undefined)).toBe(false)
  })

  test('loadChordFont falls back to Handwritten when storage is empty or invalid', () => {
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
      expect(loadChordFont()).toBe('Handwritten')

      mockStorage.setItem(CHORD_FONT_KEY, 'invalid')
      expect(loadChordFont()).toBe('Handwritten')

      mockStorage.setItem(CHORD_FONT_KEY, 'Plain')
      expect(loadChordFont()).toBe('Plain')

      mockStorage.setItem(CHORD_FONT_KEY, 'Handwritten')
      expect(loadChordFont()).toBe('Handwritten')
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        writable: true,
        configurable: true,
      })
    }
  })
})
