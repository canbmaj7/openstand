import { toTicks, type NoteEvent } from './events'
import { barBeatOffsets, type Timeline } from './timeline'

// Separate channel from DRUM_CHANNEL (9) so the mixer can mute/level the metronome independently
export const CLICK_CHANNEL = 3

// GM percussion notes present in openstand.sf3: 34 Metronome Bell (accented downbeat), 33 Metronome Click (beat)
export const CLICK_NOTES = {
  accent: 34,
  beat: 33,
} as const

const ACCENT_VELOCITY = 127
const BEAT_VELOCITY = 116
const CLICK_DURATION = toTicks(0.25)

/** Generates steady metronome clicks for every played bar after the count-in. */
export function generateClicks(timeline: Timeline): NoteEvent[] {
  const events: NoteEvent[] = []
  for (const bar of timeline.bars) {
    const offsets = barBeatOffsets(bar.beats, bar)
    offsets.forEach((offset, i) => {
      const isAccent = i === 0
      events.push({
        tick: toTicks(bar.start + offset),
        channel: CLICK_CHANNEL,
        note: isAccent ? CLICK_NOTES.accent : CLICK_NOTES.beat,
        velocity: isAccent ? ACCENT_VELOCITY : BEAT_VELOCITY,
        duration: CLICK_DURATION,
      })
    })
  }
  return events
}
