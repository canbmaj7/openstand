import { describe, expect, test } from 'vitest'
import { parseChord, transposeChord } from '../src/music/chords'
import { plainChordText } from '../src/music/chordText'
import {
  CHORD_NAMES_KEY,
  chordDegree,
  isChordNames,
  loadChordNames,
  toRoman,
} from '../src/music/degrees'
import { viewOffset } from '../src/music/instrument'

describe('chordDegree and toRoman', () => {
  test('maps all 12 semitones in major (6 semitones = #4)', () => {
    const expected = [
      { accidental: '', degree: 1 },
      { accidental: 'b', degree: 2 },
      { accidental: '', degree: 2 },
      { accidental: 'b', degree: 3 },
      { accidental: '', degree: 3 },
      { accidental: '', degree: 4 },
      { accidental: '#', degree: 4 },
      { accidental: '', degree: 5 },
      { accidental: 'b', degree: 6 },
      { accidental: '', degree: 6 },
      { accidental: 'b', degree: 7 },
      { accidental: '', degree: 7 },
    ]
    for (let pc = 0; pc < 12; pc++) {
      expect(chordDegree(pc, 0, false)).toEqual(expected[pc])
    }
  })

  test('maps all 12 semitones in minor (6 semitones = b5)', () => {
    // A minor: keyPc = 9 (A=1, C=b3, Eb=b5, F=b6, G=b7)
    expect(chordDegree(9, 9, true)).toEqual({ accidental: '', degree: 1 })
    expect(chordDegree(0, 9, true)).toEqual({ accidental: 'b', degree: 3 })
    expect(chordDegree(3, 9, true)).toEqual({ accidental: 'b', degree: 5 })
    expect(chordDegree(5, 9, true)).toEqual({ accidental: 'b', degree: 6 })
    expect(chordDegree(7, 9, true)).toEqual({ accidental: 'b', degree: 7 })
  })

  test('converts degrees 1..7 to uppercase Roman numerals', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(toRoman)).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'])
  })
})

describe('plainChordText with Roman numerals and Nashville numbers', () => {
  test('formats ii-V-I in C major', () => {
    expect(plainChordText('Dm7', 0, 'roman', false)).toBe('IIm7')
    expect(plainChordText('G7', 0, 'roman', false)).toBe('V7')
    expect(plainChordText('Cmaj7', 0, 'roman', false)).toBe('IΔ7')

    expect(plainChordText('Dm7', 0, 'numbers', false)).toBe('2m7')
    expect(plainChordText('G7', 0, 'numbers', false)).toBe('57')
    expect(plainChordText('Cmaj7', 0, 'numbers', false)).toBe('1Δ7')
  })

  test('formats chords in F major (IV7 and bVII7)', () => {
    expect(plainChordText('Bb7', 5, 'roman', false)).toBe('IV7')
    expect(plainChordText('Eb7', 5, 'roman', false)).toBe('♭VII7')
    expect(plainChordText('Bb7', 5, 'numbers', false)).toBe('47')
    expect(plainChordText('Eb7', 5, 'numbers', false)).toBe('♭77')
  })

  test('formats ii-V-i in A minor relative to tonic minor', () => {
    expect(plainChordText('Bh7', 9, 'roman', true)).toBe('IIm7♭5')
    expect(plainChordText('E7b9', 9, 'roman', true)).toBe('V7♭9')
    expect(plainChordText('A-7', 9, 'roman', true)).toBe('Im7')

    expect(plainChordText('Bh7', 9, 'numbers', true)).toBe('2m7♭5')
    expect(plainChordText('E7b9', 9, 'numbers', true)).toBe('57♭9')
    expect(plainChordText('A-7', 9, 'numbers', true)).toBe('1m7')
  })

  test('formats slash bass as Roman or number', () => {
    expect(plainChordText('C/E', 0, 'roman', false)).toBe('I/III')
    expect(plainChordText('C/E', 0, 'numbers', false)).toBe('1/3')
    expect(plainChordText('C/Bb', 0, 'roman', false)).toBe('I/♭VII')
    expect(plainChordText('C/Bb', 0, 'numbers', false)).toBe('1/♭7')
  })

  test('formats #IV in major and bV in minor for tritone root', () => {
    expect(plainChordText('F#7', 0, 'roman', false)).toBe('♯IV7')
    expect(plainChordText('F#7', 0, 'numbers', false)).toBe('♯47')
    expect(plainChordText('F#7', 0, 'roman', true)).toBe('♭V7')
    expect(plainChordText('F#7', 0, 'numbers', true)).toBe('♭57')
  })

  test('keeps degrees invariant under key transpose and Bb/Eb instrument offsets', () => {
    const chords = ['Dm7', 'G7', 'Cmaj7', 'F#7', 'C/E', 'Eb7']
    const offsets = [0, 1, 2, 5, 7, 9, 11, viewOffset('Bb'), viewOffset('Eb')]
    for (const symbol of chords) {
      const parsed = parseChord(symbol)!
      const baseRoman = plainChordText(parsed, 0, 'roman', false)
      const baseNumbers = plainChordText(parsed, 0, 'numbers', false)
      for (const offset of offsets) {
        const transposed = transposeChord(parsed, offset)
        const keyPc = (0 + offset + 12) % 12
        expect(plainChordText(transposed, keyPc, 'roman', false)).toBe(baseRoman)
        expect(plainChordText(transposed, keyPc, 'numbers', false)).toBe(baseNumbers)
      }
    }
  })
})

describe('chordNames settings', () => {
  test('isChordNames validates allowed values', () => {
    expect(isChordNames('letters')).toBe(true)
    expect(isChordNames('roman')).toBe(true)
    expect(isChordNames('numbers')).toBe(true)
    expect(isChordNames('invalid')).toBe(false)
    expect(isChordNames(null)).toBe(false)
  })

  test('loadChordNames defaults to letters when storage is empty or invalid', () => {
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
      expect(loadChordNames()).toBe('letters')
      mockStorage.setItem(CHORD_NAMES_KEY, 'bogus')
      expect(loadChordNames()).toBe('letters')
      mockStorage.setItem(CHORD_NAMES_KEY, 'roman')
      expect(loadChordNames()).toBe('roman')
      mockStorage.setItem(CHORD_NAMES_KEY, 'numbers')
      expect(loadChordNames()).toBe('numbers')
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        writable: true,
        configurable: true,
      })
    }
  })
})
