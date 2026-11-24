import { chordTones, closeVoicingTones, rootlessVoicings, type Chord } from '../music/chords'
import { guitarShapes } from '../music/fretboard'
import { aksakComp } from '../styles/aksak'
import type { CompHit, CompPart, StyleFamily } from '../styles/types'
import { chance, humanize, pick, place, rand, toTicks, type NoteEvent } from './events'
import { patternFor } from './meter'
import type { Slot } from './timeline'

const CHANNEL = 1
// Standard guitar tuning (E2 A2 D3 G3 B3 E4) in MIDI note numbers
const GUITAR_MIDI = [40, 45, 50, 55, 59, 64] as const

interface VoicingRange {
  lowest: number
  highestBottom: number
  highestTop: number
  home: number
}

function rangeFor(kind: CompPart['voicing']): VoicingRange {
  if (kind === 'guitar') return { lowest: 40, highestBottom: 52, highestTop: 76, home: 56 }
  return { lowest: 48, highestBottom: 62, highestTop: 127, home: 62 }
}

// Playable 3-4 note guitar voicings as intervals above the root:
// fretboard shapes from guitarShapes plus 3-note jazz shell voicings (R-3-7 and R-7-3).
function guitarVoicingForms(chord: Chord): number[][] {
  const forms: number[][] = []
  const seen = new Set<string>()
  const push = (form: number[]) => {
    const key = form.join(',')
    if (seen.has(key)) return
    seen.add(key)
    forms.push(form)
  }

  for (const shape of guitarShapes(chord)) {
    const midi = shape.frets.flatMap((fret, s) => (fret === null ? [] : [GUITAR_MIDI[s] + fret]))
    const pcs = new Set<number>()
    const unique = midi
      .filter((n) => {
        const pc = n % 12
        if (pcs.has(pc)) return false
        pcs.add(pc)
        return true
      })
      .slice(0, 4)
    if (unique.length < 3) continue
    const offset = (((unique[0] - chord.root) % 12) + 12) % 12
    push(unique.map((n) => n - unique[0] + offset))
  }

  if (chord.bass === chord.root) {
    const [, third, fifth, seventh] = chordTones(chord)
    if (seventh < 12 && third !== fifth) {
      push([0, third, seventh])
      push([0, seventh, third + 12])
    }
  }

  if (!forms.length) push(closeVoicingTones(chord))
  return forms
}

// Voicing candidates as intervals above the root (A/B forms, inversions, or guitar shapes)
function voicingForms(chord: Chord, kind: CompPart['voicing']): number[][] {
  if (kind === 'rootless') return rootlessVoicings(chord)
  if (kind === 'guitar') return guitarVoicingForms(chord)
  const tones = closeVoicingTones(chord)
  return tones.map((_, r) => [...tones.slice(r), ...tones.slice(0, r).map((t) => t + 12)])
}

const average = (notes: number[]) => notes.reduce((a, b) => a + b, 0) / notes.length

// How far the notes of one voicing are from the nearest notes of another, on average
const leap = (from: number[], to: number[]) => from.reduce((sum, p) => sum + Math.min(...to.map((q) => Math.abs(p - q))), 0) / from.length

// Voice leading: each note moves as little as possible from the previous voicing, so common
// tones stay where they are and the top voice moves by step (the measure Impro-Visor and MMA
// use). A gentle pull keeps the voicings from drifting out of the middle of the instrument.
function chooseVoicing(chord: Chord, kind: CompPart['voicing'], prev: number[]): number[] {
  const range = rangeFor(kind)
  let best: number[] = []
  let bestScore = Infinity
  for (const form of voicingForms(chord, kind)) {
    for (let octave = 2; octave <= 6; octave++) {
      const notes = form.map((i) => chord.root + i + octave * 12)
      if (notes[0] < range.lowest || notes[0] > range.highestBottom || notes[notes.length - 1] > range.highestTop) continue
      const drift = Math.abs(average(notes) - range.home)
      const score = prev.length
        ? leap(prev, notes) +
          leap(notes, prev) +
          0.5 * Math.abs(notes[notes.length - 1] - prev[prev.length - 1]) +
          0.1 * drift +
          rand(0, 0.6)
        : drift + rand(0, 1.5)
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
export function generateComp(
  slots: Slot[],
  part: CompPart,
  swing: number,
  countIn: number,
  compound: CompPart = part,
  family: StyleFamily = 'pop',
): NoteEvent[] {
  const events: NoteEvent[] = []
  let prev: number[] = []
  let activeTwoBar: CompHit[] | null = null

  slots.forEach((slot) => {
    const { rhythms, twoBar, anticipation = 0 } = slot.compound ? compound : part
    const feel = slot.groups || slot.compound ? 0.5 : swing
    const voicing = chooseVoicing(slot.chord, part.voicing, prev)
    prev = voicing

    if (slot.measure === -1) {
      // Final chord: one long hit, adding a low root in the left hand for piano styles
      const notes = part.voicing === 'guitar' ? voicing : [slot.chord.root + 36, ...voicing]
      for (const note of notes) {
        events.push({ tick: toTicks(slot.start), channel: CHANNEL, note, velocity: part.velocity[1], duration: toTicks(slot.beats - 0.5) })
      }
      return
    }

    let hits: CompHit[]
    if (slot.groups) {
      activeTwoBar = null
      hits = aksakComp(slot.groups, family, slot.barOffset ?? 0, slot.beats)
    } else if (twoBar?.length && !slot.compound && slot.beats === 4) {
      // Two-bar comping figures (0..8 beats): split across even/odd 4/4 bars on the timeline
      const barIndex = Math.max(0, Math.round((slot.start - countIn) / 4))
      const half = barIndex % 2
      if (half === 0 || !activeTwoBar) activeTwoBar = pick(twoBar)
      const offset = half * 4
      hits = activeTwoBar
        .filter(([at]) => at >= offset && at < offset + 4)
        .map(([at, dur, vel]): CompHit => [at - offset, dur, vel])
    } else {
      activeTwoBar = null
      const timed = (rhythm: CompHit[][] | undefined) => rhythm?.map((hits) => hits.map(([at, dur, vel]) => ({ at, dur, vel })))
      const byLength = Object.fromEntries(Object.entries(rhythms).map(([length, options]) => [length, timed(options)]))
      hits = patternFor(byLength, slot.beats, !!slot.compound, { at: 0, dur: 0.6, vel: undefined }).map(
        ({ at, dur, vel }): CompHit => [at, dur, vel],
      )
    }
    if (!hits.length) return

    // Sometimes anticipate the chord by an eighth (not in grouped meters)
    if (!slot.groups && hits[0][0] === 0 && slot.start > countIn && chance(anticipation)) {
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

// Piano pedal for legato styles: lifted as each new chord sounds and pressed again just after,
// so every chord rings into the next instead of stopping short (syncopated pedalling)
export function pedalChanges(events: NoteEvent[], slots: Slot[]): { tick: number; value: number }[] {
  const onsets = events.map((e) => e.tick).sort((a, b) => a - b)
  const out: { tick: number; value: number }[] = []
  for (const slot of slots) {
    // The chord's first sound, which may be an anticipation an eighth early
    const from = toTicks(slot.start - 0.6)
    const first = onsets.find((t) => t >= from && t < toTicks(slot.start + slot.beats))
    if (first === undefined) continue
    out.push({ tick: Math.max(0, first - 1), value: 0 }, { tick: first + toTicks(0.12), value: 127 })
  }
  // Let go at the very end
  const last = Math.max(0, ...events.map((e) => e.tick + e.duration))
  out.push({ tick: last, value: 0 })
  return out
}
