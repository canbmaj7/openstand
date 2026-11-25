import type { Chart } from '../music/chart'
import { compoundStyle } from '../styles/compound'
import type { StyleDefinition } from '../styles/types'
import { generateBass } from './bass'
import { CLICK_CHANNEL, generateClicks } from './click'
import { generateComp, pedalChanges } from './comp'
import { DRUM_CHANNEL, generateDrums } from './drums'
import { toTicks } from './events'
import { writeMidi, type TempoChange, type TrackSpec } from './midiWriter'
import { buildTimeline, type PracticeOptions, type Timeline } from './timeline'

// Channel layout, shared with the mixer
// Reverb send (CC91) written for each part; the mixer's Reverb fader scales these
export const PART_REVERB = { bass: 20, comp: 40, drums: 35, click: 0 } as const

export const CHANNELS = { bass: 0, comp: 1, drums: DRUM_CHANNEL, click: CLICK_CHANNEL } as const
export type Part = keyof typeof CHANNELS

// Playback rate is set relative to this tempo, so tempo changes don't regenerate the MIDI
export const BASE_BPM = 120
const BPM_RANGE: [number, number] = [40, 300]

export interface RampOptions {
  bpm: number
  every: number
}

export interface ArrangeOptions {
  click?: boolean // add the metronome track (channel 3); off by default so plain MIDI exports keep three parts
  ramp?: RampOptions
}

function buildTempoChanges(timeline: Timeline, baseBpm: number, ramp?: RampOptions): TempoChange[] | undefined {
  if (!ramp || !(ramp.bpm > 0) || !(baseBpm > 0)) return undefined
  const every = Math.max(1, Math.floor(ramp.every || 1))
  const changes: TempoChange[] = []
  let prevBpm = baseBpm
  for (const bar of timeline.bars) {
    if (!bar.isFirst || bar.measure < 0) continue
    const raw = baseBpm + ramp.bpm * Math.floor(bar.chorus / every)
    const nextBpm = Math.max(BPM_RANGE[0], Math.min(BPM_RANGE[1], raw))
    if (nextBpm !== prevBpm) {
      changes.push({ tick: toTicks(bar.start), bpm: nextBpm })
      prevBpm = nextBpm
    }
  }
  return changes.length > 0 ? changes : undefined
}

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
  bpm: number = BASE_BPM,
  options: ArrangeOptions = {},
): Arrangement {
  const timeline = buildTimeline(chart, transpose, choruses, practice)
  const { swing, firstChorus } = style
  // The same band in 6/8, for bars in a compound meter
  const compound = timeline.bars.some((b) => b.compound) ? compoundStyle(style) : style
  const comp = generateComp(timeline.slots, style.comp, swing, timeline.countIn, compound.comp, style.family, firstChorus?.comp)
  const compUsesPedal = (slot: (typeof timeline.slots)[number]) =>
    slot.chorus === 0 && firstChorus?.comp ? !!firstChorus.comp.pedal : !!style.comp.pedal
  const tracks: TrackSpec[] = [
    {
      name: 'Bass',
      channel: CHANNELS.bass,
      program: style.bass.program,
      pan: 60,
      reverb: PART_REVERB.bass,
      events: generateBass(timeline.slots, style.bass, swing, compound.bass, style.family, firstChorus?.bass),
    },
    {
      name: 'Comp',
      channel: CHANNELS.comp,
      program: style.comp.program,
      pan: 74,
      reverb: PART_REVERB.comp,
      events: comp,
      pedal:
        style.comp.pedal || firstChorus?.comp?.pedal
          ? pedalChanges(comp, timeline.slots.filter(compUsesPedal))
          : undefined,
    },
    {
      name: 'Drums',
      channel: CHANNELS.drums,
      program: style.drums.kit,
      pan: 64,
      reverb: PART_REVERB.drums,
      events: generateDrums(timeline.bars, style.drums, swing, timeline.clicks, compound.drums, style.family, firstChorus?.drums),
    },
  ]
  if (options.click) {
    tracks.push({
      name: 'Click',
      channel: CHANNELS.click,
      program: 0,
      pan: 64,
      reverb: PART_REVERB.click,
      drums: true,
      events: generateClicks(timeline),
    })
  }
  const midi = writeMidi(bpm, tracks, buildTempoChanges(timeline, bpm, options.ramp))
  return { midi, timeline }
}
