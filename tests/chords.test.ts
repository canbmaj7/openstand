import { describe, expect, test } from 'vitest'
import { chordTones, closeVoicingTones, parseChord, rootlessVoicings } from '../src/music/chords'
import { plainChordText } from '../src/music/chordText'
import { toChartSymbol } from '../src/music/notation'
import { scalesForChord } from '../src/music/scales'

describe('chord qualities iReal Pro lacks', () => {
  test.each([
    ['C5', 'C5', 'power'],
    ['Csus2', 'Csus2', 'sus2'],
    ['C2', 'C2', 'sus2'],
    ['Cdim(maj7)', 'Co^7', 'dimMaj7'],
    ['C°Δ', 'Co^7', 'dimMaj7'],
    ['Cmaj7sus4', 'C^7sus', 'maj7sus'],
    ['C+maj7', 'C+^7', 'augMaj7'],
    ['Cmaj7#5', 'C^7#5', 'augMaj7'],
    ['Cadd11', 'Cadd11', 'maj'],
    ['Cmadd9', 'C-add9', 'min'],
    ['Cadd2', 'Cadd9', 'maj'],
  ])('typing %s gives %s (%s)', (typed, symbol, quality) => {
    expect(toChartSymbol(typed)).toBe(symbol)
    expect(parseChord(symbol)!.quality).toBe(quality)
  })

  test('the band plays the right notes', () => {
    expect(chordTones(parseChord('C5')!)).toEqual([0, 7, 7, 12])
    expect(closeVoicingTones(parseChord('C5')!)).toEqual([0, 7, 12])
    expect(closeVoicingTones(parseChord('Csus2')!)).toEqual([0, 2, 7])
    expect(chordTones(parseChord('Co^7')!)).toEqual([0, 3, 6, 11])
    expect(chordTones(parseChord('C^7sus')!)).toEqual([0, 5, 7, 11])
    expect(chordTones(parseChord('C+^7')!)).toEqual([0, 4, 8, 11])
    expect(closeVoicingTones(parseChord('Cadd9')!)).toEqual([0, 4, 7, 14])
    expect(rootlessVoicings(parseChord('C-add11')!)[0]).toEqual([3, 7, 12, 17])
  })

  test('voicings have no third where the chord has none', () => {
    for (const symbol of ['C5', 'Csus2', 'C^7sus']) {
      for (const voicing of rootlessVoicings(parseChord(symbol)!)) {
        expect(voicing.map((i) => i % 12)).not.toContain(4)
        expect(voicing.map((i) => i % 12)).not.toContain(3)
      }
    }
  })

  test('every new quality has scales', () => {
    for (const symbol of ['C5', 'Csus2', 'Co^7', 'C^7sus', 'C+^7']) expect(scalesForChord(parseChord(symbol)!).length).toBeGreaterThan(0)
  })

  test('plain font spells them', () => {
    expect(plainChordText(parseChord('Co^7')!, 0)).toBe('C°Δ7')
    expect(plainChordText(parseChord('C+^7')!, 0)).toBe('C+Δ7')
  })

  test('existing chords keep their quality', () => {
    expect(parseChord('C^7')!.quality).toBe('maj7')
    expect(parseChord('Co7')!.quality).toBe('dim7')
    expect(parseChord('C7sus')!.quality).toBe('sus7')
    expect(parseChord('Csus')!.quality).toBe('sus7')
    expect(parseChord('C+')!.quality).toBe('aug')
    expect(parseChord('C69')!.quality).toBe('maj6')
  })
})
