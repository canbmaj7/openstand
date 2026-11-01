import { beatsPerBar, isCompound, playbackOrder, type Chart, type TimeSignature } from '../music/chart'
import { parseChord, transposeChord, type Chord } from '../music/chords'
import { PULSE } from './meter'

// One click of the count-in: where it falls, the number shown, and whether it starts a bar
export interface Click {
  at: number
  count: number
  accent: boolean
}

// The count-in follows the tune's meter, the way a band leader counts off:
// 4/4 "1 . 2 . | 1 2 3 4", 3/4 "1 . . | 1 2 3", 2/4 "1 2 | 1 2",
// 6/8 "1 . 2 . | 1 2 3 4 5 6" (eighths, accents on the pulses), and one bar of pulses or
// beats in longer meters (12/8, 9/8, 5/4, 6/4).
export function countInClicks(chart: Chart): Click[] {
  const beats = beatsPerBar(chart.time)
  const clicks = (list: [at: number, count: number][], accents: number[] = [0]): Click[] =>
    list.map(([at, count]) => ({ at, count, accent: accents.some((a) => Math.abs(a - at) < 1e-9) }))
  if (isCompound(chart.time)) {
    if (beats === 2 * PULSE) {
      const eighths = Array.from({ length: 6 }, (_, i): [number, number] => [beats + i / 2, i + 1])
      return clicks([[0, 1], [PULSE, 2], ...eighths], [0, beats, beats + PULSE])
    }
    const pulses = Math.round(beats / PULSE)
    return clicks(Array.from({ length: pulses }, (_, i): [number, number] => [i * PULSE, i + 1]))
  }
  if (beats === 4) return clicks([[0, 1], [2, 2], [4, 1], [5, 2], [6, 3], [7, 4]], [0, 4])
  if (beats === 3) return clicks([[0, 1], [3, 1], [4, 2], [5, 3]], [0, 3])
  if (beats === 2) return clicks([[0, 1], [1, 2], [2, 1], [3, 2]], [0, 2])
  if (Number.isInteger(beats) && beats > 4) {
    // Accent where the bar divides: 5/4 as 3+2, 6/4 as 3+3
    return clicks(Array.from({ length: beats }, (_, i): [number, number] => [i, i + 1]), [0, 3])
  }
  return clicks([[0, 1], [1, 2], [2, 3], [3, 4]])
}

// Count-in length in beats: two bars of short meters, one bar of long ones
export function countInBeats(chart: Chart): number {
  const beats = beatsPerBar(chart.time)
  if (isCompound(chart.time)) return beats === 2 * PULSE ? 2 * beats : beats
  if (!Number.isInteger(beats)) return 4
  return beats <= 4 ? 2 * beats : beats
}

// One chord span on the timeline, in beats
export interface Slot {
  chord: Chord
  start: number
  beats: number
  measure: number // bar index in the chart; -1 for the final chord
  chorus: number
  compound?: boolean // in 6/8, 9/8 or 12/8
}

// One bar as played; drum grooves are chosen per bar
export interface Bar {
  start: number
  beats: number
  measure: number // -1 for the ending bar
  isFirst: boolean
  isLast: boolean
  compound?: boolean // in 6/8, 9/8 or 12/8
}

export interface Timeline {
  slots: Slot[]
  bars: Bar[]
  totalBeats: number
  countIn: number // beats before the first bar
  clicks: Click[] // the count-in
}

// Practice options: loop a range of written bars, change key every chorus
export interface PracticeOptions {
  loop?: [from: number, to: number] | null // written bar indices, inclusive
  keyStep?: number // semitones added to the key on each chorus (5 = round the cycle of fourths)
}

// Transposition for each chorus, kept within -5..+6 so the band's register doesn't drift
export function chorusTranspose(transpose: number, keyStep: number, chorus: number): number {
  return ((((transpose + keyStep * chorus + 5) % 12) + 12) % 12) - 5
}

// Bars in the order they are played, or the looped range in written order
export function practiceOrder(chart: Chart, loop: PracticeOptions['loop']): number[] {
  if (!loop) return playbackOrder(chart)
  const [from, to] = loop[0] <= loop[1] ? loop : [loop[1], loop[0]]
  const order: number[] = []
  for (let i = Math.max(0, from); i <= Math.min(to, chart.bars.length - 1); i++) {
    if (!chart.bars[i].spacer) order.push(i)
  }
  return order.length ? order : playbackOrder(chart)
}

export function buildTimeline(chart: Chart, transpose: number, choruses: number, practice: PracticeOptions = {}): Timeline {
  const keyStep = practice.keyStep ?? 0
  const chords = new Map<string, Chord>()
  const toChord = (symbol: string, chorus: number): Chord => {
    const semitones = chorusTranspose(transpose, keyStep, chorus)
    const id = `${semitones} ${symbol}`
    let chord = chords.get(id)
    if (!chord) {
      const parsed = parseChord(symbol)
      if (!parsed) throw new Error(`Could not parse chord: ${symbol}`)
      chord = transposeChord(parsed, semitones)
      chords.set(id, chord)
    }
    return chord
  }

  // Time signature in force at each written bar
  let time: TimeSignature = chart.time
  const meters = chart.bars.map((bar) => {
    if (bar.time) time = bar.time
    return { beats: beatsPerBar(time), compound: isCompound(time) || undefined }
  })

  const order = practiceOrder(chart, practice.loop)
  const slots: Slot[] = []
  const bars: Bar[] = []
  const countIn = countInBeats(chart)
  let beat = countIn

  const carried = practice.loop ? (chart.bars.slice(0, order[0]).flatMap((b) => b.chords).at(-1)?.symbol ?? null) : null

  for (let chorus = 0; chorus < choruses; chorus++) {
    // A blank bar keeps the chord that was sounding at the end of the previous one;
    // a loop starting on a blank bar picks up the chord written before it
    let held: Chord | null = carried ? toChord(carried, chorus) : null
    order.forEach((measure, n) => {
      const bar = chart.bars[measure]
      const { beats, compound } = meters[measure]
      bars.push({ start: beat, beats, measure, isFirst: n === 0, isLast: n === order.length - 1, compound })

      if (bar.chords.length === 0) {
        if (held) slots.push({ chord: held, start: beat, beats, measure, chorus, compound })
      } else {
        let at = beat
        for (const c of bar.chords) {
          held = c.symbol ? toChord(c.symbol, chorus) : null // N.C. leaves a gap
          if (held) slots.push({ chord: held, start: at, beats: c.beats, measure, chorus, compound })
          at += c.beats
        }
      }
      beat += beats
    })
  }

  // Ending: resolve to the first chord played (usually the tonic) and hold for a bar of the
  // last meter (two bars of a short one), in the last chorus's key
  const first = order.flatMap((m) => chart.bars[m].chords).find((c) => c.symbol)?.symbol
  if (first && choruses > 0) {
    const last = meters[order[order.length - 1]] ?? { beats: 4 }
    const beats = last.beats >= 3 ? last.beats : last.beats * 2
    bars.push({ start: beat, beats, measure: -1, isFirst: false, isLast: false, compound: last.compound })
    slots.push({ chord: toChord(first, choruses - 1), start: beat, beats, measure: -1, chorus: choruses, compound: last.compound })
    beat += beats
  }

  return { slots, bars, totalBeats: beat, countIn, clicks: countInClicks(chart) }
}

export function slotAtBeat(timeline: Timeline, beat: number): Slot | undefined {
  const { slots } = timeline
  let lo = 0
  let hi = slots.length - 1
  if (hi < 0 || beat < slots[0].start) return undefined
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (slots[mid].start <= beat) lo = mid
    else hi = mid - 1
  }
  return slots[lo]
}
