import { closeVoicingTones, rootlessVoicings, type Chord } from '../music/chords'
import type { CompHit, CompPart } from '../styles/types'
import { chance, humanize, place, rand, toTicks, type NoteEvent } from './events'
import { patternFor } from './meter'
import type { Slot } from './timeline'

const CHANNEL = 1
const LOWEST = 48 // lowest allowed bottom note of a voicing
const HIGHEST_BOTTOM = 62 // highest allowed bottom note of a voicing

// Voicing candidates as intervals above the root (A/B forms or inversions)
function voicingForms(chord: Chord, kind: CompPart['voicing']): number[][] {
  if (kind === 'rootless') return rootlessVoicings(chord)
  const tones = closeVoicingTones(chord)
  return tones.map((_, r) => [...tones.slice(r), ...tones.slice(0, r).map((t) => t + 12)])
}

// Pick the form and octave closest to the previous voicing (voice leading)
function chooseVoicing(chord: Chord, kind: CompPart['voicing'], prevCenter: number): number[] {
  let best: number[] = []
  let bestScore = Infinity
  for (const form of voicingForms(chord, kind)) {
    for (let octave = 2; octave <= 6; octave++) {
      const notes = form.map((i) => chord.root + i + octave * 12)
      if (notes[0] < LOWEST || notes[0] > HIGHEST_BOTTOM) continue
      const center = notes.reduce((a, b) => a + b, 0) / notes.length
      const score = Math.abs(center - prevCenter) + rand(0, 1.5)
      if (score < bestScore) {
        bestScore = score
        best = notes
      }
    }
  }
  return best
}

// Chords lasting 3 beats in a style written for 4 play beats 1, 2 and 4 of a 4-beat rhythm;
// chords in a compound meter (6/8) play `compound`, the style's 6/8 rhythms, with straight eighths.
export function generateComp(slots: Slot[], part: CompPart, swing: number, countIn: number, compound: CompPart = part): NoteEvent[] {
  const events: NoteEvent[] = []
  let prevCenter = 62

  slots.forEach((slot) => {
    const { rhythms, anticipation = 0 } = slot.compound ? compound : part
    const feel = slot.compound ? 0.5 : swing
    const voicing = chooseVoicing(slot.chord, part.voicing, prevCenter)
    prevCenter = voicing.reduce((a, b) => a + b, 0) / voicing.length

    if (slot.measure === -1) {
      // Final chord: one long hit with the root in the left hand
      const notes = [slot.chord.root + 36, ...voicing]
      for (const note of notes) {
        events.push({ tick: toTicks(slot.start), channel: CHANNEL, note, velocity: part.velocity[1], duration: toTicks(slot.beats - 0.5) })
      }
      return
    }

    const timed = (rhythm: CompHit[][] | undefined) => rhythm?.map((hits) => hits.map(([at, dur, vel]) => ({ at, dur, vel })))
    const byLength = Object.fromEntries(Object.entries(rhythms).map(([length, options]) => [length, timed(options)]))
    const hits: CompHit[] = patternFor(byLength, slot.beats, !!slot.compound, { at: 0, dur: 0.6, vel: undefined }).map(({ at, dur, vel }): CompHit => [at, dur, vel])
    if (!hits.length) return

    // Sometimes anticipate the chord by an eighth
    if (hits[0][0] === 0 && slot.start > countIn && chance(anticipation)) {
      hits[0] = [-0.5, hits[0][1] + (1 - feel), hits[0][2]]
    }

    for (const [at, duration, vel] of hits) {
      const velocity = vel ?? rand(part.velocity[0], part.velocity[1])
      for (const note of voicing) {
        events.push(
          humanize(
            {
              tick: toTicks(slot.start + place(at, feel)),
              channel: CHANNEL,
              note,
              velocity,
              duration: toTicks(duration),
            },
            6,
            4,
          ),
        )
      }
    }
  })

  return events
}
