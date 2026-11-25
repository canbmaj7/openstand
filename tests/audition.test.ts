import { describe, expect, test } from 'vitest'
import { CHANNELS } from '../src/engine/arrange'
import { auditionMidi } from '../src/engine/audition'
import { PPQ } from '../src/engine/events'
import { parseChord } from '../src/music/chords'
import { SCALES } from '../src/music/scales'

interface ParsedTrack {
  programChanges: { channel: number; program: number; tick: number }[]
  noteOns: { channel: number; note: number; velocity: number; tick: number }[]
  channels: Set<number>
}

function readVarLen(bytes: Uint8Array, pos: number): [number, number] {
  let value = 0
  let p = pos
  for (;;) {
    const b = bytes[p++]
    value = (value << 7) | (b & 0x7f)
    if ((b & 0x80) === 0) return [value, p]
  }
}

function parseSmf(midi: Uint8Array): { trackCount: number; tracks: ParsedTrack[] } {
  const view = new DataView(midi.buffer, midi.byteOffset, midi.byteLength)
  const trackCount = view.getUint16(10)
  const tracks: ParsedTrack[] = []
  let offset = 14

  while (offset < midi.length) {
    const type = String.fromCharCode(...midi.slice(offset, offset + 4))
    const len = view.getUint32(offset + 4)
    offset += 8
    const end = offset + len
    if (type !== 'MTrk') {
      offset = end
      continue
    }
    const track: ParsedTrack = { programChanges: [], noteOns: [], channels: new Set() }
    let tick = 0
    let p = offset
    while (p < end) {
      const [delta, nextP] = readVarLen(midi, p)
      tick += delta
      p = nextP
      const status = midi[p++]
      if (status === 0xff) {
        p++ // meta type
        const [metaLen, afterLen] = readVarLen(midi, p)
        p = afterLen + metaLen
      } else if (status === 0xf0 || status === 0xf7) {
        const [sysLen, afterLen] = readVarLen(midi, p)
        p = afterLen + sysLen
      } else {
        const cmd = status & 0xf0
        const ch = status & 0x0f
        track.channels.add(ch)
        if (cmd === 0xc0) {
          track.programChanges.push({ channel: ch, program: midi[p++], tick })
        } else if (cmd === 0xd0) {
          p += 1
        } else {
          const d1 = midi[p++]
          const d2 = midi[p++]
          if (cmd === 0x90 && d2 > 0) {
            track.noteOns.push({ channel: ch, note: d1, velocity: d2, tick })
          }
        }
      }
    }
    tracks.push(track)
    offset = end
  }

  return { trackCount, tracks }
}

describe('auditionMidi', () => {
  test('writes valid SMF header, program change, and only uses the comp channel', () => {
    const chord = parseChord('Cmaj7')!
    const midi = auditionMidi(chord, { program: 26 })
    expect(String.fromCharCode(...midi.slice(0, 4))).toBe('MThd')

    const parsed = parseSmf(midi)
    expect(parsed.trackCount).toBe(2) // tempo track + comp track
    const noteTrack = parsed.tracks[1]
    expect(noteTrack.programChanges).toEqual([{ channel: CHANNELS.comp, program: 26, tick: 0 }])
    expect([...noteTrack.channels]).toEqual([CHANNELS.comp])
    expect(noteTrack.channels.has(CHANNELS.bass)).toBe(false)
    expect(noteTrack.channels.has(CHANNELS.drums)).toBe(false)
  })

  test('plays chord notes simultaneously at tick 0 with bass note below', () => {
    const chord = parseChord('G/B')!
    const midi = auditionMidi(chord, { program: 0 })
    const noteTrack = parseSmf(midi).tracks[1]

    expect(noteTrack.noteOns.length).toBeGreaterThanOrEqual(4)
    expect(noteTrack.noteOns.every((n) => n.tick === 0)).toBe(true)
    const pcs = new Set(noteTrack.noteOns.map((n) => n.note % 12))
    expect(pcs).toEqual(new Set([7, 11, 2])) // G, B, D
    const lowest = Math.min(...noteTrack.noteOns.map((n) => n.note))
    expect(lowest % 12).toBe(chord.bass) // B in the bass
  })

  test('plays chord then ascending scale notes ending on the octave root', () => {
    const chord = parseChord('D-7')!
    const dorian = SCALES.dorian.intervals
    const midi = auditionMidi(chord, { program: 4, scale: dorian, bpm: 120 })
    const noteTrack = parseSmf(midi).tracks[1]

    const chordNotes = noteTrack.noteOns.filter((n) => n.tick === 0)
    const scaleNotes = noteTrack.noteOns.filter((n) => n.tick > 0)

    expect(chordNotes.length).toBe(5) // bass + 4 close-voicing tones
    expect(scaleNotes.length).toBe(dorian.length + 1) // 7 scale tones + octave root

    // First scale note starts after 1 second (2 beats = 2 * PPQ at 120 BPM)
    expect(scaleNotes[0].tick).toBe(2 * PPQ)
    for (let i = 1; i < scaleNotes.length; i++) {
      expect(scaleNotes[i].tick).toBeGreaterThan(scaleNotes[i - 1].tick)
      expect(scaleNotes[i].note).toBeGreaterThan(scaleNotes[i - 1].note)
    }

    const expectedPcs = [...dorian, 12].map((step) => (chord.root + step) % 12)
    expect(scaleNotes.map((n) => n.note % 12)).toEqual(expectedPcs)
    expect(scaleNotes[scaleNotes.length - 1].note - scaleNotes[0].note).toBe(12)
  })
})
