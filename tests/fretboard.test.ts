import { describe, expect, test } from 'vitest'
import { chordTones, parseChord } from '../src/music/chords'
import { guitarShapes, TUNING } from '../src/music/fretboard'

describe('guitarShapes', () => {
  test.each(['C', 'G7', 'Dm7', 'Bb^7'])('%s produces 2 valid shapes with chord tones and root in the bass', (symbol) => {
    const chord = parseChord(symbol)!
    const validPcs = new Set(chordTones(chord).map((t) => (chord.root + t) % 12))
    validPcs.add(chord.bass)

    const shapes = guitarShapes(chord)
    expect(shapes).toHaveLength(2)
    expect(shapes[0].frets).not.toEqual(shapes[1].frets)
    expect(shapes[0].baseFret).toBeLessThanOrEqual(shapes[1].baseFret)

    for (const shape of shapes) {
      expect(shape.frets).toHaveLength(6)
      const played = shape.frets
        .map((fret, string) => (fret === null ? null : { string, fret, pc: (TUNING[string] + fret) % 12 }))
        .filter((x): x is { string: number; fret: number; pc: number } => x !== null)

      expect(played.length).toBeGreaterThanOrEqual(4)
      expect(played.length).toBeLessThanOrEqual(6)

      // Lowest played string is the root (or slash bass)
      expect(played[0].pc).toBe(chord.bass)

      // Every played note belongs to the chord tones
      for (const note of played) {
        expect(validPcs.has(note.pc)).toBe(true)
      }

      // Fretted notes span at most 4 frets (max - min <= 3)
      const fretted = played.map((n) => n.fret).filter((f) => f > 0)
      if (fretted.length > 0) {
        expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(3)
      }
    }
  })

  test('supports slash chords and diminished / augmented qualities', () => {
    for (const symbol of ['C/G', 'F#o7', 'Bh7', 'Eb+', 'A-6', 'C-^7', 'F7sus']) {
      const chord = parseChord(symbol)!
      const validPcs = new Set(chordTones(chord).map((t) => (chord.root + t) % 12))
      validPcs.add(chord.bass)
      const shapes = guitarShapes(chord)
      for (const shape of shapes) {
        const firstString = shape.frets.findIndex((f) => f !== null)
        expect(firstString).toBeGreaterThanOrEqual(0)
        expect((TUNING[firstString] + shape.frets[firstString]!) % 12).toBe(chord.bass)
        for (let s = 0; s < 6; s++) {
          if (shape.frets[s] !== null) {
            expect(validPcs.has((TUNING[s] + shape.frets[s]!) % 12)).toBe(true)
          }
        }
      }
    }
  })
})
