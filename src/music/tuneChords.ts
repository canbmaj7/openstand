import type { Chart } from './chart'
import { chordKey, parseChord, transposeChord, type Chord } from './chords'

/**
 * Collects distinct chords (main and alternate/substitution chords separately)
 * in first-appearance order, transposed by `transpose` and deduplicated by
 * root, bass, quality, and tensions. Skips N.C., spacers, and unparseable marks.
 */
export function distinctChords(chart: Chart, transpose: number): Chord[] {
  const seen = new Set<string>()
  const result: Chord[] = []

  const add = (symbol: string | null | undefined) => {
    if (!symbol) return
    const parsed = parseChord(symbol)
    if (!parsed) return
    const chord = transposeChord(parsed, transpose)
    const key = chordKey(chord)
    if (seen.has(key)) return
    seen.add(key)
    result.push(chord)
  }

  for (const bar of chart.bars) {
    if (bar.spacer) continue
    for (const c of bar.chords) {
      add(c.symbol)
      add(c.alt)
    }
  }

  return result
}
