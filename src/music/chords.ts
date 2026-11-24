// Chord symbol parser. Supports common jazz chart notation (C-7, F7b9, Bb^7, Eh7, Do7, C7alt, G/B)
// plus a few qualities iReal Pro lacks (C5, Csus2, Co^7, C^7sus, C+^7, Cadd11).

export type Quality =
  | 'maj'
  | 'maj7'
  | 'maj6'
  | 'dom7'
  | 'sus7'
  | 'min'
  | 'min7'
  | 'min6'
  | 'minMaj7'
  | 'half'
  | 'dim7'
  | 'aug'
  // Qualities iReal Pro has no symbol for
  | 'power' // C5: root and fifth, no third
  | 'sus2' // C2, Csus2
  | 'dimMaj7' // Co^7, Cdim(maj7)
  | 'maj7sus' // C^7sus
  | 'augMaj7' // C+^7, C^7#5

export interface Chord {
  root: number // pitch class 0-11 (C = 0)
  bass: number // bass note of a slash chord, otherwise the root
  quality: Quality
  tensions: string[] // 'b9', '#9', '#11', 'b13', 'alt' ...
  suffix: string // suffix as written (e.g. "-7", "7b9")
}

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function parseNote(s: string): { pc: number; len: number } | null {
  const letter = LETTERS[s[0]?.toUpperCase() ?? '']
  if (letter === undefined) return null
  let pc = letter
  let len = 1
  if (s[1] === 'b') {
    pc -= 1
    len = 2
  } else if (s[1] === '#') {
    pc += 1
    len = 2
  }
  return { pc: (pc + 12) % 12, len }
}

function qualityOf(suffix: string): Quality {
  const s = suffix.replace('ø', 'h').replace('Δ', '^')
  if (/^(h|m7b5|-7b5|min7b5)/.test(s)) return 'half'
  if (/^(o|dim)\^/.test(s)) return 'dimMaj7'
  if (/^(o|dim)/.test(s)) return 'dim7'
  if (/^(-|m(?!aj)|min)/.test(s)) {
    const rest = s.replace(/^(min|-|m)/, '')
    if (/^(\^|maj|M7)/.test(rest)) return 'minMaj7'
    if (/^6/.test(rest)) return 'min6'
    if (/^(7|9|11|13)/.test(rest)) return 'min7'
    return 'min'
  }
  if (/^(\^|maj|M7)/.test(s)) return /sus/.test(s) ? 'maj7sus' : /#5/.test(s) ? 'augMaj7' : 'maj7'
  if (/^(\+|aug)\^/.test(s)) return 'augMaj7'
  if (/^(\+|aug)/.test(s)) return 'aug'
  if (/^5$/.test(s)) return 'power'
  if (/^(2|sus2)$/.test(s)) return 'sus2'
  if (/^6/.test(s)) return 'maj6'
  if (/^(7|9|11|13)/.test(s)) return /sus/.test(s) ? 'sus7' : 'dom7'
  if (/^sus/.test(s)) return 'sus7'
  return 'maj'
}

export function parseChord(symbol: string): Chord | null {
  const [main, slash] = symbol.trim().split('/')
  const root = parseNote(main)
  if (!root) return null
  const suffix = main.slice(root.len)
  const tensions = suffix.match(/add#?(2|9|11)|[b#](5|9|11|13)|alt/g) ?? []
  const bass = slash ? parseNote(slash)?.pc ?? root.pc : root.pc
  return { root: root.pc, bass, quality: qualityOf(suffix), tensions, suffix }
}

// Whether to spell with flats or sharps depends on the target key
const FLAT_KEYS = new Set([5, 10, 3, 8, 1, 6]) // F Bb Eb Ab Db Gb

export function noteName(pc: number, preferFlats: boolean): string {
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[((pc % 12) + 12) % 12]
}

export function keyPrefersFlats(keyPc: number): boolean {
  return FLAT_KEYS.has(((keyPc % 12) + 12) % 12)
}

export function transposeChord(chord: Chord, semitones: number): Chord {
  return {
    ...chord,
    root: (chord.root + semitones + 120) % 12,
    bass: (chord.bass + semitones + 120) % 12,
  }
}

export function chordLabel(chord: Chord, preferFlats: boolean): string {
  const base = noteName(chord.root, preferFlats) + chord.suffix
  return chord.bass === chord.root ? base : `${base}/${noteName(chord.bass, preferFlats)}`
}

// Chord tones for the bass (semitones above the root): root, third, fifth, seventh
export function chordTones(chord: Chord): number[] {
  switch (chord.quality) {
    case 'maj7':
      return [0, 4, 7, 11]
    case 'maj':
    case 'maj6':
      return [0, 4, 7, 9]
    case 'dom7':
      if (chord.tensions.includes('alt') || chord.tensions.includes('#5')) return [0, 4, 8, 10]
      if (chord.tensions.includes('b5')) return [0, 4, 6, 10]
      return [0, 4, 7, 10]
    case 'sus7':
      return [0, 5, 7, 10]
    case 'min':
    case 'min7':
      return [0, 3, 7, 10]
    case 'min6':
      return [0, 3, 7, 9]
    case 'minMaj7':
      return [0, 3, 7, 11]
    case 'half':
      return [0, 3, 6, 10]
    case 'dim7':
      return [0, 3, 6, 9]
    case 'aug':
      return [0, 4, 8, 10]
    case 'power':
      return [0, 7, 7, 12]
    case 'sus2':
      return [0, 2, 7, 12]
    case 'dimMaj7':
      return [0, 3, 6, 11]
    case 'maj7sus':
      return [0, 5, 7, 11]
    case 'augMaj7':
      return [0, 4, 8, 11]
  }
}

// An added note on a triad (Cadd9, C-add11), as semitones above the root
function addedTone(tensions: string[]): number | null {
  if (tensions.some((t) => t === 'add9' || t === 'add2')) return 14
  if (tensions.includes('add#11')) return 18
  if (tensions.includes('add11')) return 17
  return null
}

// Rootless A/B voicings for piano, as intervals above the root
export function rootlessVoicings(chord: Chord): [number[], number[]] {
  const t = chord.tensions
  switch (chord.quality) {
    case 'maj7':
      return [
        [4, 7, 11, 14],
        [11, 14, 16, 19],
      ]
    case 'maj':
    case 'maj6': {
      const add = chord.quality === 'maj' ? addedTone(t) : null
      if (add !== null)
        return [
          [4, 7, 12, add],
          [7, 12, 16, add + 12],
        ]
      return [
        [4, 7, 9, 14],
        [9, 14, 16, 19],
      ]
    }
    case 'dom7': {
      if (t.includes('alt'))
        return [
          [4, 8, 10, 15],
          [10, 13, 16, 20],
        ]
      const ninth = t.includes('b9') ? 13 : t.includes('#9') ? 15 : 14
      const top = t.includes('b13') || t.includes('#5') ? 8 : t.includes('#11') ? 6 : 9
      return [
        [4, top, 10, ninth],
        [10, ninth, 16, top + 12],
      ]
    }
    case 'sus7':
      return [
        [5, 7, 10, 14],
        [10, 14, 17, 19],
      ]
    case 'min':
    case 'min7': {
      const add = chord.quality === 'min' ? addedTone(t) : null
      if (add !== null)
        return [
          [3, 7, 12, add],
          [7, 12, 15, add + 12],
        ]
      return [
        [3, 7, 10, 14],
        [10, 14, 15, 19],
      ]
    }
    case 'min6':
      return [
        [3, 7, 9, 14],
        [9, 14, 15, 19],
      ]
    case 'minMaj7':
      return [
        [3, 7, 11, 14],
        [11, 14, 15, 19],
      ]
    case 'half':
      return [
        [3, 6, 10, 12],
        [10, 12, 15, 18],
      ]
    case 'dim7':
      return [
        [3, 6, 9, 12],
        [9, 12, 15, 18],
      ]
    case 'aug':
      return [
        [4, 8, 10, 14],
        [10, 14, 16, 20],
      ]
    case 'power':
      return [
        [0, 7, 12, 19],
        [7, 12, 19, 24],
      ]
    case 'sus2':
      return [
        [2, 7, 12, 14],
        [7, 12, 14, 19],
      ]
    case 'dimMaj7':
      return [
        [3, 6, 11, 14],
        [11, 14, 15, 18],
      ]
    case 'maj7sus':
      return [
        [5, 7, 11, 14],
        [11, 14, 17, 19],
      ]
    case 'augMaj7':
      return [
        [4, 8, 11, 14],
        [11, 14, 16, 20],
      ]
  }
}

// Close-position chord tones including the root, for pop/rock (triads or sevenths)
export function closeVoicingTones(chord: Chord): number[] {
  const add = addedTone(chord.tensions)
  if (chord.quality === 'maj') return add === null ? [0, 4, 7] : [0, 4, 7, add]
  if (chord.quality === 'min') return add === null ? [0, 3, 7] : [0, 3, 7, add]
  if (chord.quality === 'power') return [0, 7, 12]
  if (chord.quality === 'sus2') return [0, 2, 7]
  if (chord.quality === 'sus7' && !chord.suffix.includes('7')) return [0, 5, 7]
  return chordTones(chord)
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]

// Spells a chord root in the context of a key: notes of the key's major scale follow the
// key signature, chromatic notes default to flats (Bb7 in C, not A#7)
export function spellRoot(pc: number, keyPc: number): string {
  if (keyPrefersFlats(keyPc)) return noteName(pc, true)
  const inScale = MAJOR_SCALE.some((step) => (keyPc + step) % 12 === ((pc % 12) + 12) % 12)
  return noteName(pc, !inScale)
}
