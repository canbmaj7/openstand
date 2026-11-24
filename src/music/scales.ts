import { keyPrefersFlats, noteName, type Chord, type Quality } from './chords'

export interface Scale {
  id: string
  name: string
  intervals: number[]
  note: string
  firstChoice: boolean
}

type ScaleDef = Omit<Scale, 'firstChoice'>

export const SCALES: Record<string, ScaleDef> = {
  ionian: {
    id: 'ionian',
    name: 'Ionian',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    note: 'Major scale; go easy on the 4th over maj7',
  },
  lydian: {
    id: 'lydian',
    name: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    note: 'Major with #11; bright, no avoid notes',
  },
  'major-pentatonic': {
    id: 'major-pentatonic',
    name: 'Major pentatonic',
    intervals: [0, 2, 4, 7, 9],
    note: 'Five-note major sound',
  },
  mixolydian: {
    id: 'mixolydian',
    name: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    note: 'Home scale for unaltered dominant 7th chords',
  },
  'bebop-dominant': {
    id: 'bebop-dominant',
    name: 'Bebop dominant',
    intervals: [0, 2, 4, 5, 7, 9, 10, 11],
    note: 'Mixolydian with a passing major 7th',
  },
  'lydian-dominant': {
    id: 'lydian-dominant',
    name: 'Lydian dominant',
    intervals: [0, 2, 4, 6, 7, 9, 10],
    note: 'Dominant with #11 (melodic minor from the 4th)',
  },
  altered: {
    id: 'altered',
    name: 'Altered',
    intervals: [0, 1, 3, 4, 6, 8, 10],
    note: 'Every altered tension: b9, #9, b5 and b13',
  },
  'half-whole': {
    id: 'half-whole',
    name: 'Half-whole diminished',
    intervals: [0, 1, 3, 4, 6, 7, 9, 10],
    note: 'Symmetric diminished for b9 and #9 with natural 5th and 13th',
  },
  'whole-tone': {
    id: 'whole-tone',
    name: 'Whole tone',
    intervals: [0, 2, 4, 6, 8, 10],
    note: 'Six equal whole steps; fits #5 and b5',
  },
  'mixolydian-pentatonic': {
    id: 'mixolydian-pentatonic',
    name: 'Mixolydian pentatonic',
    intervals: [0, 2, 5, 7, 10],
    note: 'Root, 9th, 4th, 5th and b7 for sus chords',
  },
  dorian: {
    id: 'dorian',
    name: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    note: 'Minor with a natural 6th',
  },
  aeolian: {
    id: 'aeolian',
    name: 'Aeolian',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    note: 'Natural minor scale (flat 6th)',
  },
  phrygian: {
    id: 'phrygian',
    name: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    note: 'Minor with a flat 2nd',
  },
  'minor-pentatonic': {
    id: 'minor-pentatonic',
    name: 'Minor pentatonic',
    intervals: [0, 3, 5, 7, 10],
    note: 'Five-note minor scale',
  },
  'melodic-minor': {
    id: 'melodic-minor',
    name: 'Melodic minor',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    note: 'Minor with natural 6th and major 7th',
  },
  'harmonic-minor': {
    id: 'harmonic-minor',
    name: 'Harmonic minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    note: 'Minor with flat 6th and major 7th',
  },
  locrian: {
    id: 'locrian',
    name: 'Locrian',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    note: 'Half-diminished scale with b9',
  },
  'locrian-nat2': {
    id: 'locrian-nat2',
    name: 'Locrian natural 2',
    intervals: [0, 2, 3, 5, 6, 8, 10],
    note: 'Half-diminished with a natural 9th',
  },
  'whole-half': {
    id: 'whole-half',
    name: 'Whole-half diminished',
    intervals: [0, 2, 3, 5, 6, 8, 9, 11],
    note: 'Symmetric diminished starting with a whole step',
  },
  'lydian-augmented': {
    id: 'lydian-augmented',
    name: 'Lydian augmented',
    intervals: [0, 2, 4, 6, 8, 9, 11],
    note: 'Major with #4 and #5',
  },
}

const BY_QUALITY: Record<Exclude<Quality, 'dom7'>, string[]> = {
  maj7: ['ionian', 'lydian'],
  maj: ['ionian', 'lydian', 'major-pentatonic'],
  maj6: ['ionian', 'lydian', 'major-pentatonic'],
  sus7: ['mixolydian', 'mixolydian-pentatonic'],
  min: ['dorian', 'aeolian', 'phrygian', 'minor-pentatonic'],
  min7: ['dorian', 'aeolian', 'phrygian', 'minor-pentatonic'],
  min6: ['dorian', 'melodic-minor'],
  minMaj7: ['melodic-minor', 'harmonic-minor'],
  half: ['locrian', 'locrian-nat2'],
  dim7: ['whole-half'],
  aug: ['whole-tone', 'lydian-augmented'],
  power: ['ionian', 'aeolian', 'minor-pentatonic', 'major-pentatonic'],
  sus2: ['ionian', 'mixolydian', 'major-pentatonic'],
  dimMaj7: ['whole-half'],
  maj7sus: ['ionian', 'lydian'],
  augMaj7: ['lydian-augmented'],
}

function dom7ScaleIds(tensions: string[]): string[] {
  const ids: string[] = []
  const hasAlt = tensions.some((t) => t === 'alt' || t === 'b9' || t === '#9' || t === 'b13' || t === '#5')
  if (tensions.includes('#11') && !tensions.includes('alt')) ids.push('lydian-dominant')
  if (hasAlt) ids.push('altered')
  if (tensions.includes('#11') && !ids.includes('lydian-dominant')) ids.push('lydian-dominant')
  if (tensions.includes('b9')) ids.push('half-whole')
  if (tensions.includes('#5') || tensions.includes('b5')) ids.push('whole-tone')
  ids.push('mixolydian', 'bebop-dominant')
  return ids
}

export function scalesForChord(chord: Chord): Scale[] {
  let ids: string[]
  if (chord.quality === 'dom7') {
    ids = dom7ScaleIds(chord.tensions)
  } else if (chord.quality === 'maj7' && chord.tensions.includes('#11')) {
    ids = ['lydian', 'ionian']
  } else {
    ids = BY_QUALITY[chord.quality]
  }
  return ids.map((id, index) => ({
    ...SCALES[id],
    firstChoice: index === 0,
  }))
}

export function scaleNotes(root: number, scale: Scale | readonly number[]): number[] {
  const intervals = Array.isArray(scale) ? scale : (scale as Scale).intervals
  return intervals.map((step) => (((root + step) % 12) + 12) % 12)
}

export function scaleNoteNames(
  root: number,
  scale: Scale | readonly number[],
  preferFlats = keyPrefersFlats(root),
): string[] {
  return scaleNotes(root, scale).map((pc) => noteName(pc, preferFlats))
}
