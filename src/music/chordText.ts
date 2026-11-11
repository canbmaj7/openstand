import { parseChord, spellRoot, type Chord } from './chords'

export type ChordFont = 'Handwritten' | 'Plain'

export const CHORD_FONT_KEY = 'openstand:chord-font'

export function isChordFont(value: unknown): value is ChordFont {
  return value === 'Handwritten' || value === 'Plain'
}

export function loadChordFont(): ChordFont {
  try {
    if (typeof localStorage === 'undefined') return 'Handwritten'
    const saved = localStorage.getItem(CHORD_FONT_KEY)
    return isChordFont(saved) ? saved : 'Handwritten'
  } catch {
    return 'Handwritten'
  }
}

export interface ChordParts {
  root: string
  accidental: string
  quality: string
  extensions: string
  bass: string
}

export function accidentalPlain(a: string): string {
  return a === 'b' ? '♭' : a === '#' ? '♯' : ''
}

export function typesetPlain(suffix: string): { quality: string; extensions: string } {
  const s = suffix
    .replace('ø', 'h')
    .replace('Δ', '^')
    .replace(/^(min|mi|m)(?!aj)/, '-')
    .replace(/^maj7?/, '^7')
    .replace(/^dim/, 'o')
    .replace(/^aug/, '+')

  const match = /^([-^ho+])?(\d+)?(.*)$/.exec(s) ?? ['', '', '', s]
  const markerType = match[1] ?? ''
  const num = match[2] ?? ''
  const rawExt = match[3] ?? ''

  let extensions = rawExt
    .replace(/\^7?/g, 'Δ7')
    .replace(/b/g, '♭')
    .replace(/#/g, '♯')

  let quality = ''
  if (markerType === 'h') {
    quality = num ? 'm' + num : 'm7'
    extensions = '♭5' + extensions
  } else if (markerType === '^') {
    quality = 'Δ' + (num || '7')
  } else if (markerType === '-') {
    quality = 'm' + num
  } else if (markerType === 'o') {
    quality = '°' + num
  } else if (markerType === '+') {
    quality = '+' + num
  } else {
    quality = num
  }

  return { quality, extensions }
}

export function plainChordParts(chord: Chord, keyPc = 0): ChordParts {
  const name = spellRoot(chord.root, keyPc)
  const root = name[0] ?? ''
  const accidental = accidentalPlain(name[1] ?? '')
  const { quality, extensions } = typesetPlain(chord.suffix)
  let bass = ''
  if (chord.bass !== chord.root) {
    const bassName = spellRoot(chord.bass, keyPc)
    bass = (bassName[0] ?? '') + accidentalPlain(bassName[1] ?? '')
  }
  return { root, accidental, quality, extensions, bass }
}

export function plainChordText(chord: Chord | string, keyPc = 0): string {
  const c = typeof chord === 'string' ? parseChord(chord) : chord
  if (!c) return typeof chord === 'string' ? chord : ''
  const parts = plainChordParts(c, keyPc)
  const bassPart = parts.bass ? `/${parts.bass}` : ''
  return `${parts.root}${parts.accidental}${parts.quality}${parts.extensions}${bassPart}`
}
