import { CHANNELS, PART_REVERB, type Part } from '../engine/arrange'

// The fader's middle: each part keeps the send arrange.ts writes (bass 20, comp 40, drums 35)
export const DEFAULT_REVERB = 64
export const REVERB_KEY = 'openstand:reverb'
// MIDI CC 91 (reverbDepth in spessasynth_core MIDIControllers)
const MIDI_CC_REVERB = 91 as const

// 0 is dry, 64 as written, 127 about three times the written send (the curve keeps the top useful)
export function reverbSend(part: Part, reverb: number): number {
  return clampReverb(PART_REVERB[part] * (clampReverb(reverb) / DEFAULT_REVERB) ** 1.6)
}

export interface ReverbSynthTarget {
  midiChannels: readonly { lockController(controller: typeof MIDI_CC_REVERB, isLocked: boolean): void }[]
  controllerChange(channel: number, controller: typeof MIDI_CC_REVERB, value: number): void
}

export function clampReverb(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_REVERB
  return Math.max(0, Math.min(127, Math.round(value)))
}

export function loadReverb(): number {
  try {
    const raw = localStorage.getItem(REVERB_KEY)
    if (raw === null || raw.trim() === '') return DEFAULT_REVERB
    const saved = Number(raw)
    return Number.isFinite(saved) && saved >= 0 && saved <= 127 ? Math.round(saved) : DEFAULT_REVERB
  } catch {
    return DEFAULT_REVERB
  }
}

// Locks CC91 on each accompaniment channel so tick-0 MIDI reverb events cannot override the mixer
export function applyReverb(synth: ReverbSynthTarget, reverb: number): void {
  for (const part of Object.keys(CHANNELS) as Part[]) {
    const channel = CHANNELS[part]
    const midiChannel = synth.midiChannels[channel]
    if (!midiChannel) continue
    const send = reverbSend(part, reverb)
    midiChannel.lockController(MIDI_CC_REVERB, false)
    synth.controllerChange(channel, MIDI_CC_REVERB, send)
    midiChannel.lockController(MIDI_CC_REVERB, true)
  }
}
