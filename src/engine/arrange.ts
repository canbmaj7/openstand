import type { Chart } from '../music/chart'
import { compoundStyle } from '../styles/compound'
import type { StyleDefinition } from '../styles/types'
import { generateBass } from './bass'
import { generateComp, pedalChanges } from './comp'
import { DRUM_CHANNEL, generateDrums } from './drums'
import { writeMidi } from './midiWriter'
import { buildTimeline, type PracticeOptions, type Timeline } from './timeline'

// Channel layout, shared with the mixer
export const CHANNELS = { bass: 0, comp: 1, drums: DRUM_CHANNEL } as const
export type Part = keyof typeof CHANNELS

// Playback rate is set relative to this tempo, so tempo changes don't regenerate the MIDI
export const BASE_BPM = 120

export interface Arrangement {
  midi: Uint8Array
  timeline: Timeline
}

export function arrange(
  chart: Chart,
  style: StyleDefinition,
  transpose: number,
  choruses: number,
  practice: PracticeOptions = {},
): Arrangement {
  const timeline = buildTimeline(chart, transpose, choruses, practice)
  const { swing } = style
  // The same band in 6/8, for bars in a compound meter
  const compound = timeline.bars.some((b) => b.compound) ? compoundStyle(style) : style
  const comp = generateComp(timeline.slots, style.comp, swing, timeline.countIn, compound.comp)
  const midi = writeMidi(BASE_BPM, [
    {
      name: 'Bass',
      channel: CHANNELS.bass,
      program: style.bass.program,
      pan: 60,
      reverb: 20,
      events: generateBass(timeline.slots, style.bass, swing, compound.bass),
    },
    {
      name: 'Comp',
      channel: CHANNELS.comp,
      program: style.comp.program,
      pan: 74,
      reverb: 40,
      events: comp,
      pedal: style.comp.pedal ? pedalChanges(comp, timeline.slots) : undefined,
    },
    {
      name: 'Drums',
      channel: CHANNELS.drums,
      program: style.drums.kit,
      pan: 64,
      reverb: 35,
      events: generateDrums(timeline.bars, style.drums, swing, timeline.clicks, compound.drums),
    },
  ])
  return { midi, timeline }
}
