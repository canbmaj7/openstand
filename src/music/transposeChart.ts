// Moves a written chart to another key: every chord root and slash bass shifts, the chord suffix text stays as written

import type { Chart } from './chart'
import { spellRoot } from './chords'

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const NOTE = /^([A-Ga-g])([b#]?)/

function notePc(letter: string, accidental: string): number {
  const base = LETTER_PC[letter.toUpperCase()]
  return (base + (accidental === 'b' ? -1 : accidental === '#' ? 1 : 0) + 12) % 12
}

// Spelling follows the key's major scale; minor keys use their relative major
function spellingKey(keyPc: number, minor: boolean): number {
  return minor ? (keyPc + 3) % 12 : keyPc
}

/** Transposes one chord symbol; text that does not start with a note name (N.C., repeats, "W") is returned unchanged. */
export function transposeSymbol(symbol: string, semitones: number, keyPc: number, minor = false): string {
  const shift = ((semitones % 12) + 12) % 12
  if (shift === 0) return symbol
  const spellKey = spellingKey(keyPc, minor)
  const root = NOTE.exec(symbol)
  if (!root) return symbol
  let rest = symbol.slice(root[0].length)
  let bass = ''
  const slash = rest.lastIndexOf('/')
  if (slash !== -1) {
    const bassMatch = NOTE.exec(rest.slice(slash + 1))
    // "6/9" keeps its slash: only a lone note name after the slash is a bass note
    if (bassMatch && bassMatch[0].length === rest.length - slash - 1) {
      bass = '/' + spellRoot((notePc(bassMatch[1], bassMatch[2]) + shift) % 12, spellKey)
      rest = rest.slice(0, slash)
    }
  }
  return spellRoot((notePc(root[1], root[2]) + shift) % 12, spellKey) + rest + bass
}

/** Returns the chart in a new key with every chord and substitution moved by the same interval. */
export function transposeChart(chart: Chart, newKey: number): Chart {
  const semitones = newKey - chart.key
  const minor = Boolean(chart.minor)
  if (((semitones % 12) + 12) % 12 === 0) return { ...chart, key: newKey }
  const move = (symbol: string) => transposeSymbol(symbol, semitones, newKey, minor)
  return {
    ...chart,
    key: newKey,
    bars: chart.bars.map((bar) => ({
      ...bar,
      chords: bar.chords.map((chord) => ({
        ...chord,
        symbol: chord.symbol === null ? null : move(chord.symbol),
        ...(chord.alt !== undefined ? { alt: move(chord.alt) } : {}),
      })),
    })),
  }
}
