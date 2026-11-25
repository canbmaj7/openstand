import { closeVoicingTones, type Chord } from '../music/chords'
import { CHANNELS, PART_REVERB } from './arrange'
import { PPQ, type NoteEvent } from './events'
import { writeMidi } from './midiWriter'

export interface AuditionOptions {
  program: number
  scale?: number[]
  bpm?: number
}

const DEFAULT_BPM = 120
const CHORD_VELOCITY = 82
const BASS_VELOCITY = 86
const SCALE_VELOCITY = 84

// Places the chord's root around middle C (G3..F#4) so close voicings sit in the middle register.
function voicingRootMidi(root: number): number {
  const pc = ((root % 12) + 12) % 12
  return (pc >= 7 ? 48 : 60) + pc
}

export function auditionMidi(chord: Chord, options: AuditionOptions): Uint8Array {
  const bpm = options.bpm ?? DEFAULT_BPM
  const rootMidi = voicingRootMidi(chord.root)
  const chordTicks = Math.max(1, Math.round((bpm / 60) * PPQ))
  const scale = options.scale?.length ? options.scale : undefined
  const chordDuration = scale ? Math.max(1, Math.round(chordTicks * 0.9)) : chordTicks

  const events: NoteEvent[] = []

  const bassOffset = (((chord.bass - chord.root) % 12) + 12) % 12
  events.push({
    tick: 0,
    channel: CHANNELS.comp,
    note: rootMidi - 12 + bassOffset,
    velocity: BASS_VELOCITY,
    duration: chordDuration,
  })

  for (const interval of closeVoicingTones(chord)) {
    events.push({
      tick: 0,
      channel: CHANNELS.comp,
      note: rootMidi + interval,
      velocity: CHORD_VELOCITY,
      duration: chordDuration,
    })
  }

  if (scale) {
    const eighthTicks = Math.max(1, Math.round(PPQ / 2))
    const stepDuration = Math.max(1, Math.round(eighthTicks * 0.9))
    const intervals = scale[scale.length - 1] === 12 ? scale : [...scale, 12]
    let tick = chordTicks
    intervals.forEach((interval, index) => {
      const isLast = index === intervals.length - 1
      events.push({
        tick,
        channel: CHANNELS.comp,
        note: rootMidi + interval,
        velocity: SCALE_VELOCITY,
        duration: isLast ? PPQ : stepDuration,
      })
      tick += eighthTicks
    })
  }

  return writeMidi(bpm, [
    {
      name: 'Comp',
      channel: CHANNELS.comp,
      program: options.program,
      pan: 74,
      reverb: PART_REVERB.comp,
      events,
    },
  ])
}
