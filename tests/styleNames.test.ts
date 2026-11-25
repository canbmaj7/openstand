import { describe, expect, test } from 'vitest'
import { mapStyle } from '../src/formats/ireal'

// Style names from iReal Pro's public playlists that used to fall back to Medium Swing
describe('iReal Pro style names', () => {
  test('R&B spellings go to funk', () => {
    expect(mapStyle("R'n'B")).toBe('funk')
    expect(mapStyle('RnB')).toBe('funk')
    expect(mapStyle('R&B')).toBe('funk')
  })

  test('Brazilian names go to Brazilian styles', () => {
    expect(mapStyle('MPB')).toBe('bossa-nova')
    expect(mapStyle('Forro')).toBe('baiao')
    expect(mapStyle('Forró')).toBe('baiao')
    expect(mapStyle('Xote')).toBe('baiao')
    expect(mapStyle('Marchinha')).toBe('samba')
  })

  test('nearby names keep their styles', () => {
    expect(mapStyle("Rock'n'Roll")).toBe('shuffle')
    expect(mapStyle('Medium Swing')).toBe('medium-swing')
    expect(mapStyle('Soul')).toBe('soul')
  })
})
