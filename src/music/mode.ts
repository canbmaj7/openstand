// Transformation between parallel major and minor modes around the same tonic.
//
// Each chord is mapped by its interval distance (in semitones) from the tonic key
// and its chord quality. Non-diatonic chords, secondary dominants, and N.C. bars
// remain untouched.

import type { Chart } from './chart'
import { parseChord, spellRoot, type Chord, type Quality } from './chords'

export interface ChordTransformationRule {
  /** Semitone distance from tonic (0 = I / i, 2 = ii, etc.) */
  interval: number
  /** Allowed chord qualities to match */
  qualities: Quality[]
  /** Root pitch shift in semitones (e.g. -1 to lower iii to bIII) */
  rootShift: number
  /**
   * New chord suffix, or a function returning the new suffix.
   * If the function returns null, the chord is left untouched.
   */
  suffix: string | ((chord: Chord) => string | null)
  /** Human-readable explanation for musicians */
  description?: string
}

/**
 * Diatonic transformation rules when switching from Major to Minor.
 *
 * Major scale degrees:
 *   0 (I):   maj7 -> min7 (-7), maj6 -> min6 (-6), maj -> min (-); dom7 unchanged (blues)
 *   2 (ii):  min7 -> half-diminished (h7); min triad unchanged
 *   4 (iii): min7 -> bIII maj7 (^7), root shifts down 1 semitone
 *   5 (IV):  maj7 -> min7 (-7), maj6 -> min6 (-6), maj -> min (-); dom7 unchanged
 *   7 (V):   dom7 -> dom7 add b9 tension (7b9); existing tensions left untouched; maj/maj7 -> dom7 (7)
 *   9 (vi):  min7 -> bVI maj7 (^7), root shifts down 1 semitone
 *   11 (vii): half -> bVII dom7 (7), root shifts down 1 semitone
 */
export const MAJOR_TO_MINOR_RULES: readonly ChordTransformationRule[] = [
  // 0 (I): maj7/maj/maj6 -> min7/min/min6; dom7 stays same (blues)
  { interval: 0, qualities: ['maj7'], rootShift: 0, suffix: '-7', description: 'I maj7 -> i min7' },
  { interval: 0, qualities: ['maj6'], rootShift: 0, suffix: '-6', description: 'I maj6 -> i min6' },
  { interval: 0, qualities: ['maj'], rootShift: 0, suffix: '-', description: 'I maj -> i min' },
  // 2 (ii): min7 -> half (m7b5); min triad stays min
  { interval: 2, qualities: ['min7'], rootShift: 0, suffix: 'h7', description: 'ii min7 -> ii half-diminished' },
  // 4 (iii): min7 -> shift root to 3 (bIII), maj7
  { interval: 4, qualities: ['min7'], rootShift: -1, suffix: '^7', description: 'iii min7 -> bIII maj7' },
  // 5 (IV): maj7/maj/maj6 -> min7/min/min6; dom7 stays same
  { interval: 5, qualities: ['maj7'], rootShift: 0, suffix: '-7', description: 'IV maj7 -> iv min7' },
  { interval: 5, qualities: ['maj6'], rootShift: 0, suffix: '-6', description: 'IV maj6 -> iv min6' },
  { interval: 5, qualities: ['maj'], rootShift: 0, suffix: '-', description: 'IV maj -> iv min' },
  // 7 (V): dom7 -> dom7 'b9' (keep existing tensions); maj/maj7 -> dom7
  {
    interval: 7,
    qualities: ['dom7'],
    rootShift: 0,
    suffix: (chord) => (chord.tensions.length > 0 ? chord.suffix : '7b9'),
    description: 'V dom7 -> V7b9 (keep existing tensions)',
  },
  { interval: 7, qualities: ['maj7', 'maj'], rootShift: 0, suffix: '7', description: 'V maj/maj7 -> V dom7' },
  // 9 (vi): min7 -> shift root to 8 (bVI), maj7
  { interval: 9, qualities: ['min7'], rootShift: -1, suffix: '^7', description: 'vi min7 -> bVI maj7' },
  // 11 (vii): half -> shift root to 10 (bVII), dom7
  { interval: 11, qualities: ['half'], rootShift: -1, suffix: '7', description: 'vii half -> bVII dom7' },
]

/**
 * Diatonic transformation rules when switching from Minor to Major.
 *
 * Natural/Harmonic minor scale degrees:
 *   0 (i):    min7 -> maj7 (^7), min6 -> maj6 (6), min -> maj; dom7 unchanged
 *   2 (ii):   half -> min7 (-7)
 *   3 (bIII): maj7 -> iii min7 (-7), root shifts up 1 semitone
 *   5 (iv):   min7 -> maj7 (^7), min6 -> maj6 (6), min -> maj; dom7 unchanged
 *   7 (V):    dom7 with b9 -> dom7 (removes b9/b13 tensions)
 *   8 (bVI):  maj7 -> vi min7 (-7), root shifts up 1 semitone
 *   10 (bVII): dom7 -> vii half (h7), root shifts up 1 semitone
 */
export const MINOR_TO_MAJOR_RULES: readonly ChordTransformationRule[] = [
  // 0 (i): min7 -> maj7, min6 -> maj6, min -> maj
  { interval: 0, qualities: ['min7'], rootShift: 0, suffix: '^7', description: 'i min7 -> I maj7' },
  { interval: 0, qualities: ['min6'], rootShift: 0, suffix: '6', description: 'i min6 -> I maj6' },
  { interval: 0, qualities: ['min'], rootShift: 0, suffix: '', description: 'i min -> I maj' },
  // 2 (ii): half -> min7
  { interval: 2, qualities: ['half'], rootShift: 0, suffix: '-7', description: 'ii half-diminished -> ii min7' },
  // 3 (bIII): maj7 -> shift root to 4 (iii), min7
  { interval: 3, qualities: ['maj7'], rootShift: 1, suffix: '-7', description: 'bIII maj7 -> iii min7' },
  // 5 (iv): min7 -> maj7, min6 -> maj6, min -> maj
  { interval: 5, qualities: ['min7'], rootShift: 0, suffix: '^7', description: 'iv min7 -> IV maj7' },
  { interval: 5, qualities: ['min6'], rootShift: 0, suffix: '6', description: 'iv min6 -> IV maj6' },
  { interval: 5, qualities: ['min'], rootShift: 0, suffix: '', description: 'iv min -> IV maj' },
  // 7 (V): dom7 b9 -> dom7 (remove b9/b13 from tensions)
  {
    interval: 7,
    qualities: ['dom7'],
    rootShift: 0,
    suffix: (chord) => {
      if (chord.tensions.includes('b9') || chord.tensions.includes('b13') || /b(9|13)/.test(chord.suffix)) {
        const stripped = chord.suffix.replace(/b9/g, '').replace(/b13/g, '')
        return stripped || '7'
      }
      return chord.suffix
    },
    description: 'V dom7 b9 -> V dom7 (removes b9/b13)',
  },
  // 8 (bVI): maj7 -> shift root to 9 (vi), min7
  { interval: 8, qualities: ['maj7'], rootShift: 1, suffix: '-7', description: 'bVI maj7 -> vi min7' },
  // 10 (bVII): dom7 -> shift root to 11 (vii), half
  { interval: 10, qualities: ['dom7'], rootShift: 1, suffix: 'h7', description: 'bVII dom7 -> vii half-diminished' },
]

/**
 * Transforms a single chord symbol string according to mode switching rules.
 * Preserves unparsed symbols, non-matching (non-diatonic) chords, and slash bass notes (shifted by rootShift).
 */
export function transformChordSymbol(
  symbol: string | null,
  key: number,
  target: 'major' | 'minor',
): string | null {
  if (symbol === null) return null
  const parsed = parseChord(symbol)
  if (!parsed) return symbol

  const interval = ((parsed.root - key) % 12 + 12) % 12
  const rules = target === 'minor' ? MAJOR_TO_MINOR_RULES : MINOR_TO_MAJOR_RULES
  const rule = rules.find((r) => r.interval === interval && r.qualities.includes(parsed.quality))
  if (!rule) return symbol

  const newSuffix = typeof rule.suffix === 'function' ? rule.suffix(parsed) : rule.suffix
  if (newSuffix === null) return symbol

  const newRoot = (parsed.root + rule.rootShift + 120) % 12
  const rootName = spellRoot(newRoot, key)
  let result = rootName + newSuffix

  if (parsed.bass !== parsed.root) {
    const newBass = (parsed.bass + rule.rootShift + 120) % 12
    const bassName = spellRoot(newBass, key)
    result += `/${bassName}`
  }

  return result
}

/**
 * Switches a chart between parallel major and minor modes around the same tonic key.
 * Returns a new chart copy with transformed chord symbols, or the original chart if it is already in the target mode.
 */
export function switchMode(chart: Chart, target: 'major' | 'minor'): Chart {
  const isMinor = Boolean(chart.minor)
  if ((target === 'minor' && isMinor) || (target === 'major' && !isMinor)) {
    return chart
  }

  return {
    ...chart,
    minor: target === 'minor',
    bars: chart.bars.map((bar) => ({
      ...bar,
      chords: bar.chords.map((chord) => ({
        ...chord,
        symbol: chord.symbol ? transformChordSymbol(chord.symbol, chart.key, target) : null,
      })),
    })),
  }
}
