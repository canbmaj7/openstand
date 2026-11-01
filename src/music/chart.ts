// The OpenStand chart format (version 1).
//
// A chart is a list of bars laid out in rows of 16 cells, like a hand-written
// lead sheet. Each bar carries its chords with their length in beats, plus the
// markings a player reads: rehearsal marks, repeats, endings, D.C./D.S., coda.

export type TimeSignature = [beats: number, unit: number]

export interface BarChord {
  symbol: string | null // null = N.C. (no chord)
  beats: number
}

export interface ChartBar {
  chords: BarChord[] // empty = keep playing the previous chord
  cells: number // width in the 16-cell row
  rowStart?: boolean
  section?: string // rehearsal mark: A, B, C, i (intro), v (verse)…
  time?: TimeSignature // time signature change at this bar
  repeatStart?: boolean
  repeatEnd?: boolean
  repeatTimes?: number // total passes through a repeat (default 2)
  ending?: number // first/second/third ending bracket starts here
  barline?: 'double' | 'final' // closing barline
  segno?: boolean
  coda?: boolean
  fermata?: boolean
  directive?: string // D.C. al Coda, D.S. al Fine, Fine…
  comment?: string
  end?: boolean // the player stops here (iReal "U")
  spacer?: boolean // blank room on the row (e.g. before a coda); not played
}

export interface Chart {
  format: 'openstand-chart'
  version: 1
  title: string
  composer?: string
  style: string // OpenStand style id
  sourceStyle?: string // style name in the source file, e.g. "Up Tempo Swing"
  key: number // pitch class of the written key
  minor?: boolean
  bpm: number
  time: TimeSignature
  bars: ChartBar[]
}

export const ROW_CELLS = 16

export function beatsPerBar([beats, unit]: TimeSignature): number {
  // Eighth-note meters are counted in quarter notes (6/8 → 3 beats)
  return unit === 8 ? beats / 2 : unit === 2 ? beats * 2 : beats
}

// 6/8, 9/8 and 12/8 are felt in dotted quarters; 3/8 is felt in one, like a fast 3/4
export function isCompound([beats, unit]: TimeSignature): boolean {
  return unit === 8 && beats % 3 === 0 && beats > 3
}

// Split a bar between its chords: 1 → whole bar, 2 → halves, 3 → 2+1+1 in 4/4.
// Two chords in 3/4 are 2+1; in 6/8 they take a dotted quarter each.
export function evenSplit(count: number, time: TimeSignature): number[] {
  const barBeats = beatsPerBar(time)
  if (count <= 1) return [barBeats]
  if (count === 3 && barBeats === 4) return [2, 1, 1]
  if (count === 2 && barBeats === 3 && !isCompound(time)) return [2, 1]
  return Array.from({ length: count }, () => barBeats / count)
}

// Build a plain chart from lists of chords per bar, four bars to a row
export function chartFromMeasures(
  meta: Omit<Chart, 'format' | 'version' | 'bars' | 'time'> & { time?: TimeSignature },
  measures: string[][],
): Chart {
  const time = meta.time ?? [4, 4]
  return {
    format: 'openstand-chart',
    version: 1,
    ...meta,
    time,
    bars: measures.map((symbols, i) => {
      const split = evenSplit(symbols.length, time)
      return {
        chords: symbols.map((symbol, j) => ({ symbol, beats: split[j] })),
        cells: 4,
        rowStart: i % 4 === 0 || undefined,
        barline: i === measures.length - 1 ? 'final' : undefined,
      }
    }),
  }
}

// The order bars are played in, following repeats, endings, D.C./D.S., coda and fine
export function playbackOrder(chart: Chart): number[] {
  const { bars } = chart
  const order: number[] = []
  const segno = bars.findIndex((b) => b.segno)
  const codas = bars.flatMap((b, i) => (b.coda ? [i] : []))
  const lastEnding = Math.max(1, ...bars.map((b) => b.ending ?? 0))

  let jump: { to: 'coda' | 'fine' | 'end'; ending?: number } | null = null
  let repeatStart = 0
  let pass = 1
  let i = 0

  while (i < bars.length && order.length < 4000) {
    const bar = bars[i]
    if (bar.spacer) {
      i++
      continue
    }

    if (bar.repeatStart && repeatStart !== i) {
      repeatStart = i
      pass = 1
    }

    // Endings: play only the bracket that matches this pass
    if (bar.ending) {
      const wanted = jump ? (jump.ending ?? lastEnding) : pass
      if (bar.ending !== wanted) {
        const next = bars.findIndex((b, j) => j > i && b.ending === wanted)
        if (next !== -1) {
          i = next
          continue
        }
        const close = bars.findIndex((b, j) => j >= i && b.repeatEnd)
        i = close === -1 ? i + 1 : close + 1
        continue
      }
    }

    order.push(i)
    if (bar.end && jump) break
    // After any jump, Fine ends the tune
    if (jump && bar.directive?.toLowerCase() === 'fine') break

    // After a D.C./D.S. al Coda, the first coda sign sends the band to the second one
    if (jump?.to === 'coda' && bar.coda && codas.length > 1 && i === codas[0]) {
      i = codas[1]
      jump = { to: 'end' }
      continue
    }

    if (bar.repeatEnd && !jump && pass < (bar.repeatTimes ?? 2)) {
      pass++
      i = repeatStart
      continue
    }

    const directive = bar.directive?.toLowerCase() ?? ''
    if (!jump && /^d\.[cs]\./.test(directive)) {
      const ending = /(\d)(st|nd|rd|th) end/.exec(directive)
      jump = {
        to: directive.includes('coda') ? 'coda' : directive.includes('fine') ? 'fine' : 'end',
        ending: ending ? Number(ending[1]) : undefined,
      }
      i = directive.startsWith('d.s.') && segno !== -1 ? segno : 0
      repeatStart = i
      pass = 1
      continue
    }

    i++
  }

  return order
}
