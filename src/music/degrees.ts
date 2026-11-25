import { spellRoot } from './chords'

export type ChordNames = 'letters' | 'roman' | 'numbers'

export const CHORD_NAMES_KEY = 'openstand:chord-names'

export interface ChordDegree {
  accidental: '' | 'b' | '#'
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7
}

export interface RootParts {
  root: string
  accidental: '' | 'b' | '#'
  accidentalBefore: boolean
}

const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const

const DEGREE_MAP: readonly ChordDegree[] = [
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

export function isChordNames(value: unknown): value is ChordNames {
  return value === 'letters' || value === 'roman' || value === 'numbers'
}

export function loadChordNames(): ChordNames {
  try {
    if (typeof localStorage === 'undefined') return 'letters'
    const saved = localStorage.getItem(CHORD_NAMES_KEY)
    return isChordNames(saved) ? saved : 'letters'
  } catch {
    return 'letters'
  }
}

export function saveChordNames(names: ChordNames): void {
  try {
    localStorage.setItem(CHORD_NAMES_KEY, names)
  } catch {
    // Storage may be disabled in private browsing
  }
}

/** Map a pitch class to a scale degree (1..7) and accidental relative to a key tonic. */
export function chordDegree(root: number, keyPc: number, minor: boolean): ChordDegree {
  const semitones = (((root - keyPc) % 12) + 12) % 12
  // Tritone (6 semitones): #4 in major, b5 in minor (iReal/Nashville convention)
  if (semitones === 6 && minor) return { accidental: 'b', degree: 5 }
  return DEGREE_MAP[semitones]
}

/** Convert a scale degree (1..7) to an uppercase Roman numeral (I..VII). */
export function toRoman(degree: number): string {
  return ROMANS[degree - 1] ?? String(degree)
}

/** Format a pitch class as letter or degree parts for display. */
export function formatChordRoot(
  pc: number,
  keyPc: number,
  minor: boolean,
  chordNames: ChordNames,
): RootParts {
  if (chordNames === 'letters') {
    const name = spellRoot(pc, keyPc)
    const accidental = name[1] === 'b' || name[1] === '#' ? name[1] : ''
    return { root: name[0] ?? '', accidental, accidentalBefore: false }
  }
  const { accidental, degree } = chordDegree(pc, keyPc, minor)
  const root = chordNames === 'roman' ? toRoman(degree) : String(degree)
  return { root, accidental, accidentalBefore: true }
}
