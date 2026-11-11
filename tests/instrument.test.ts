import { describe, expect, test } from 'vitest'
import { chordLabel, keyPrefersFlats, parseChord, spellRoot, transposeChord } from '../src/music/chords'
import { INSTRUMENTS, isInstrumentId, viewOffset } from '../src/music/instrument'

const writtenSymbol = (symbol: string, id: 'C' | 'Bb' | 'Eb', concertKeyPc = 0) => {
  const chord = transposeChord(parseChord(symbol)!, viewOffset(id))
  const writtenKeyPc = (concertKeyPc + viewOffset(id) + 12) % 12
  return `${spellRoot(chord.root, writtenKeyPc)}${chord.suffix}`
}

describe('transposing instruments', () => {
  test('INSTRUMENTS table defines C, Bb (+2) and Eb (+9)', () => {
    expect(INSTRUMENTS).toEqual([
      { id: 'C', label: 'C (concert)', offset: 0 },
      { id: 'Bb', label: 'Bb instrument', offset: 2 },
      { id: 'Eb', label: 'Eb instrument', offset: 9 },
    ])
    expect(viewOffset('C')).toBe(0)
    expect(viewOffset('Bb')).toBe(2)
    expect(viewOffset('Eb')).toBe(9)
    expect(viewOffset('unknown')).toBe(0)
    expect(isInstrumentId('C')).toBe(true)
    expect(isInstrumentId('Bb')).toBe(true)
    expect(isInstrumentId('Eb')).toBe(true)
    expect(isInstrumentId('F')).toBe(false)
    expect(isInstrumentId(null)).toBe(false)
  })

  test('concert Bb7 reads as C7 on Bb and G7 on Eb', () => {
    expect(writtenSymbol('Bb7', 'C', 10)).toBe('Bb7')
    expect(writtenSymbol('Bb7', 'Bb', 10)).toBe('C7')
    expect(writtenSymbol('Bb7', 'Eb', 10)).toBe('G7')
  })

  test('concert Dm7 reads as Em7 on Bb and Bm7 on Eb', () => {
    expect(writtenSymbol('Dm7', 'C', 0)).toBe('Dm7')
    expect(writtenSymbol('Dm7', 'Bb', 0)).toBe('Em7')
    expect(writtenSymbol('Dm7', 'Eb', 0)).toBe('Bm7')
  })

  test('written key determines flat or sharp spelling', () => {
    // Concert Eb (3): Bb instrument reads in F (5, flats); Eb instrument reads in C (0)
    const fKey = (3 + viewOffset('Bb')) % 12
    expect(fKey).toBe(5)
    expect(keyPrefersFlats(fKey)).toBe(true)

    // Concert F (5): Bb instrument reads in G (7, sharps); Eb instrument reads in D (2, sharps)
    const gKey = (5 + viewOffset('Bb')) % 12
    const dKey = (5 + viewOffset('Eb')) % 12
    expect(gKey).toBe(7)
    expect(dKey).toBe(2)
    expect(keyPrefersFlats(gKey)).toBe(false)
    expect(keyPrefersFlats(dKey)).toBe(false)

    // Concert E-7 A7 in key of F becomes F#-7 B7 on Bb, C#-7 F#7 on Eb
    expect(writtenSymbol('E-7', 'Bb', 5)).toBe('F#-7')
    expect(writtenSymbol('A7', 'Bb', 5)).toBe('B7')
    expect(writtenSymbol('E-7', 'Eb', 5)).toBe('C#-7')
    expect(writtenSymbol('A7', 'Eb', 5)).toBe('F#7')

    // Slash chord bass note also transposes by the instrument offset
    const slash = parseChord('Bb7/D')!
    expect(chordLabel(transposeChord(slash, viewOffset('Bb')), false)).toBe('C7/E')
    expect(chordLabel(transposeChord(slash, viewOffset('Eb')), false)).toBe('G7/B')
  })
})
