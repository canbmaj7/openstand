import { describe, expect, test } from 'vitest'
import { parseChord, transposeChord } from '../src/music/chords'
import { scaleNoteNames, scaleNotes, scalesForChord } from '../src/music/scales'

describe('scalesForChord', () => {
  test('dom7+alt chooses altered first', () => {
    const chord = parseChord('C7alt')!
    const scales = scalesForChord(chord)
    expect(scales[0].id).toBe('altered')
    expect(scales[0].firstChoice).toBe(true)
    expect(scales.slice(1).every((s) => !s.firstChoice)).toBe(true)
  })

  test('dom7 tensions include fitting scales', () => {
    expect(scalesForChord(parseChord('C7#11')!)[0].id).toBe('lydian-dominant')
    const b9Ids = scalesForChord(parseChord('C7b9')!).map((s) => s.id)
    expect(b9Ids).toContain('altered')
    expect(b9Ids).toContain('half-whole')
    const sharp5Ids = scalesForChord(parseChord('C7#5')!).map((s) => s.id)
    expect(sharp5Ids).toContain('altered')
    expect(sharp5Ids).toContain('whole-tone')
  })

  test('min7 has Dorian as first choice', () => {
    const scales = scalesForChord(parseChord('D-7')!)
    expect(scales.map((s) => s.id)).toEqual(['dorian', 'aeolian', 'phrygian', 'minor-pentatonic'])
    expect(scales[0].firstChoice).toBe(true)
    expect(scales[1].firstChoice).toBe(false)
  })

  test('half-diminished returns Locrian and Locrian natural 2', () => {
    const scales = scalesForChord(parseChord('Bh7')!)
    expect(scales.map((s) => s.id)).toEqual(['locrian', 'locrian-nat2'])
    expect(scales[0].firstChoice).toBe(true)
  })

  test('other chord qualities return their fitting scales', () => {
    expect(scalesForChord(parseChord('C^7')!).map((s) => s.id)).toEqual(['ionian', 'lydian'])
    expect(scalesForChord(parseChord('C6')!).map((s) => s.id)).toEqual(['ionian', 'lydian', 'major-pentatonic'])
    expect(scalesForChord(parseChord('G7sus')!).map((s) => s.id)).toEqual(['mixolydian', 'mixolydian-pentatonic'])
    expect(scalesForChord(parseChord('C-6')!).map((s) => s.id)).toEqual(['dorian', 'melodic-minor'])
    expect(scalesForChord(parseChord('C-^7')!).map((s) => s.id)).toEqual(['melodic-minor', 'harmonic-minor'])
    expect(scalesForChord(parseChord('Co7')!).map((s) => s.id)).toEqual(['whole-half'])
    expect(scalesForChord(parseChord('C+')!).map((s) => s.id)).toEqual(['whole-tone', 'lydian-augmented'])
  })

  test('G7 scale notes and transposition', () => {
    const g7 = parseChord('G7')!
    const [mixolydian, bebop] = scalesForChord(g7)
    expect(mixolydian.id).toBe('mixolydian')
    expect(scaleNoteNames(g7.root, mixolydian)).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F'])
    expect(scaleNoteNames(g7.root, bebop)).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F', 'F#'])

    // Transpose G7 up a minor third to Bb7 (flat key) and down a fifth to C7
    const bb7 = transposeChord(g7, 3)
    expect(scaleNoteNames(bb7.root, mixolydian)).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'Ab'])
    expect(scaleNotes(bb7.root, mixolydian)).toEqual([10, 0, 2, 3, 5, 7, 8])

    const dMaj7 = transposeChord(parseChord('C^7')!, 2)
    const [ionian] = scalesForChord(dMaj7)
    expect(scaleNoteNames(dMaj7.root, ionian)).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#'])
  })
})
