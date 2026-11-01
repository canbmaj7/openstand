import { DRUM_NOTES } from '../styles/drums'
import type { DrumHit, DrumPart, Groove } from '../styles/types'
import { chance, humanize, pick, place, toTicks, type NoteEvent } from './events'
import { beatMap } from './meter'
import type { Bar } from './timeline'

export const DRUM_CHANNEL = 9

function render(hits: DrumHit[], start: number, swing: number, from = 0, to = Infinity): NoteEvent[] {
  const out: NoteEvent[] = []
  for (const [at, drum, vel, p = 1, dur = 0.25] of hits) {
    if (at < from || at >= to || !chance(p)) continue
    out.push(
      humanize(
        {
          tick: toTicks(start + place(at - from, swing)),
          channel: DRUM_CHANNEL,
          note: DRUM_NOTES[drum],
          velocity: vel,
          duration: toTicks(dur),
        },
        5,
        5,
      ),
    )
  }
  return out
}

// Plays each bar by its position in the form: first bar, middle bars (two-bar grooves), last bar.
// Bars in a compound meter (6/8) play `compound`, the style's 6/8 grooves, with straight eighths.
export function generateDrums(bars: Bar[], part: DrumPart, swing: number, countIn: number, compound: DrumPart = part): NoteEvent[] {
  const startsCompound = bars[0]?.compound ?? false
  const events = render((startsCompound ? compound : part).countIn, 0, startsCompound ? 0.5 : swing, 0, countIn)
  let groove: Groove | null = null
  let grooveBar = 0
  let wasCompound = startsCompound

  for (const bar of bars) {
    const drums = bar.compound ? compound : part
    const feel = bar.compound ? 0.5 : swing
    if (bar.measure === -1) {
      events.push(...render(drums.ending, bar.start, feel))
      continue
    }
    // A change of meter starts a fresh groove
    if (!!bar.compound !== wasCompound) {
      groove = null
      grooveBar = 0
      wasCompound = !!bar.compound
    }

    let current: Groove
    let barIndex: number
    if (bar.isLast && drums.grooves.last) {
      current = pick(drums.grooves.last)
      barIndex = 0
      grooveBar = 0
    } else if (bar.isFirst && drums.grooves.first) {
      current = pick(drums.grooves.first)
      barIndex = 0
      grooveBar = 0
    } else {
      // A new groove is picked only at the start of a pattern so two-bar figures stay intact
      if (grooveBar === 0 || !groove) groove = pick(drums.grooves.middle)
      current = groove
      barIndex = grooveBar
      grooveBar = (grooveBar + 1) % groove.bars
    }

    // Each groove bar has the groove's own length; a bar of another length rearranges its beats
    // (a 4/4 groove in 3/4 plays beats 1, 2 and 4)
    const unit = current.beats ?? 4
    const from = barIndex * unit
    if (Math.abs(unit - bar.beats) < 1e-9) {
      events.push(...render(current.hits, bar.start, feel, from, from + unit))
    } else if (bar.compound) {
      // 12/8 and 9/8 repeat the 6/8 bar
      for (let at = 0; at < bar.beats - 1e-9; at += unit) {
        events.push(...render(current.hits, bar.start + at, feel, from, from + Math.min(unit, bar.beats - at)))
      }
    } else {
      beatMap(unit, bar.beats).forEach((source, beat) => {
        const length = Math.min(1, bar.beats - beat)
        events.push(...render(current.hits, bar.start + beat, feel, from + source, from + source + length))
      })
    }
  }

  return events
}
