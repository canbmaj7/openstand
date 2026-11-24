import { describe, expect, test } from 'vitest'
import { closeVoicingTones, parseChord } from '../src/music/chords'
import { UKULELE_TUNING, ukuleleShapes } from '../src/music/fretboard'

describe('ukuleleShapes', () => {
  test.each([
    ['C', [0, 0, 0, 3]],
    ['Am', [2, 0, 0, 0]],
    ['F', [2, 0, 1, 0]],
    ['G', [0, 2, 3, 2]],
    ['G7', [0, 2, 1, 2]],
    ['Cmaj7', [0, 0, 0, 2]],
    ['Dm', [2, 2, 1, 0]],
  ])('%s includes standard ukulele voicing %j', (symbol, expected) => {
    const chord = parseChord(symbol)!
    const shapes = ukuleleShapes(chord)
    expect(shapes).toHaveLength(2)
    expect(shapes.some((s) => JSON.stringify(s.frets) === JSON.stringify(expected))).toBe(true)
  })

  test.each(['C', 'G7', 'Dm7', 'Bb^7', 'F#o7', 'Bh7', 'Eb+', 'A-6', 'C-^7', 'F7sus', 'Cadd9', 'C9', 'G13', 'C/G', 'C/B'])(
    '%s produces 2 valid 4-string shapes within a 4-fret span',
    (symbol) => {
      const chord = parseChord(symbol)!
      const validPcs = new Set(closeVoicingTones(chord).map((t) => (chord.root + t) % 12))
      validPcs.add(chord.bass)

      const shapes = ukuleleShapes(chord)
      expect(shapes).toHaveLength(2)
      expect(shapes[0].baseFret).toBeLessThanOrEqual(shapes[1].baseFret)

      for (const shape of shapes) {
        expect(shape.frets).toHaveLength(4)
        const played = shape.frets
          .map((fret, string) => (fret === null ? null : { string, fret, pc: (UKULELE_TUNING[string] + fret) % 12 }))
          .filter((x): x is { string: number; fret: number; pc: number } => x !== null)

        expect(played.length).toBe(4)

        // Root is included (without forcing it to the lowest string due to re-entrant tuning)
        expect(played.some((n) => n.pc === chord.root)).toBe(true)

        // Every played note belongs to the chord tones (or slash bass)
        for (const note of played) {
          expect(validPcs.has(note.pc)).toBe(true)
        }

        // Fretted notes span at most 4 frets (max - min <= 3)
        const fretted = played.map((n) => n.fret).filter((f) => f > 0)
        if (fretted.length > 0) {
          expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(3)
        }
      }
    },
  )
})
