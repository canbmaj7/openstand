import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { DEFAULT_MUTED, DEFAULT_VOLUMES, parseMuted, parseVolumes } from '../src/audio/mixerState'
import { masterGainFor } from '../src/audio/player'
import { renderWav } from '../src/audio/renderWav'
import { arrange, CHANNELS } from '../src/engine/arrange'
import { CLICK_NOTES, generateClicks } from '../src/engine/click'
import { PPQ, toTicks } from '../src/engine/events'
import { buildTimeline } from '../src/engine/timeline'
import { chartFromMeasures, type Chart, type TimeSignature } from '../src/music/chart'
import { getStyle } from '../src/styles'

interface MidiNote {
  channel: number
  note: number
  tick: number
  velocity: number
}

function parseMidiTracks(midi: Uint8Array): { notes: MidiNote[]; sysex: number[][] } {
  const view = new DataView(midi.buffer, midi.byteOffset, midi.byteLength)
  const trackCount = view.getUint16(10)
  let offset = 14
  const notes: MidiNote[] = []
  const sysex: number[][] = []
  const readVar = () => {
    let val = 0
    for (;;) {
      const b = midi[offset++]
      val = (val << 7) | (b & 0x7f)
      if ((b & 0x80) === 0) return val
    }
  }
  for (let t = 0; t < trackCount; t++) {
    offset += 4
    const len = view.getUint32(offset)
    offset += 4
    const end = offset + len
    let tick = 0
    let status = 0
    while (offset < end) {
      tick += readVar()
      const b = midi[offset]
      if (b === 0xff) {
        offset += 2
        const mLen = readVar()
        offset += mLen
        continue
      }
      if (b === 0xf0 || b === 0xf7) {
        offset += 1
        const sLen = readVar()
        sysex.push(Array.from(midi.subarray(offset, offset + sLen)))
        offset += sLen
        continue
      }
      if (b & 0x80) status = midi[offset++]
      const type = status & 0xf0
      const channel = status & 0x0f
      const d1 = midi[offset++]
      const d2 = type === 0xc0 || type === 0xd0 ? 0 : midi[offset++]
      if (type === 0x90 && d2 > 0) notes.push({ channel, note: d1, tick, velocity: d2 })
    }
  }
  return { notes, sysex }
}

const twoBarChart = (time: TimeSignature, groups?: number[]): Chart =>
  chartFromMeasures({ title: 'Click Test', style: 'medium-swing', key: 0, bpm: 120, time, groups }, [['C^7'], ['G7']])

describe('generateClicks', () => {
  test('4/4 with 2 played bars produces 8 clicks with accented downbeats', () => {
    const tl = buildTimeline(twoBarChart([4, 4]), 0, 1)
    const playedOnly = { ...tl, bars: tl.bars.filter((b) => b.measure >= 0) }
    const clicks = generateClicks(playedOnly)

    expect(clicks).toHaveLength(8)
    expect(clicks.map((c) => c.tick / PPQ - tl.countIn)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(clicks.map((c) => c.note)).toEqual([
      CLICK_NOTES.accent,
      CLICK_NOTES.beat,
      CLICK_NOTES.beat,
      CLICK_NOTES.beat,
      CLICK_NOTES.accent,
      CLICK_NOTES.beat,
      CLICK_NOTES.beat,
      CLICK_NOTES.beat,
    ])
    expect(clicks[0].velocity).toBeGreaterThan(clicks[1].velocity)
  })

  test('3/4 produces 3 clicks per bar with accented downbeat', () => {
    const tl = buildTimeline(twoBarChart([3, 4]), 0, 1)
    const playedOnly = { ...tl, bars: tl.bars.filter((b) => b.measure >= 0) }
    const clicks = generateClicks(playedOnly)

    expect(clicks).toHaveLength(6)
    expect(clicks.map((c) => c.tick / PPQ - tl.countIn)).toEqual([0, 1, 2, 3, 4, 5])
    expect(clicks.map((c) => c.note)).toEqual([
      CLICK_NOTES.accent,
      CLICK_NOTES.beat,
      CLICK_NOTES.beat,
      CLICK_NOTES.accent,
      CLICK_NOTES.beat,
      CLICK_NOTES.beat,
    ])
  })

  test('6/8 produces 2 dotted-quarter clicks per bar', () => {
    const tl = buildTimeline(twoBarChart([6, 8]), 0, 1)
    const playedOnly = { ...tl, bars: tl.bars.filter((b) => b.measure >= 0) }
    const clicks = generateClicks(playedOnly)

    expect(clicks).toHaveLength(4)
    expect(clicks.map((c) => c.tick / PPQ - tl.countIn)).toEqual([0, 1.5, 3, 4.5])
    expect(clicks.map((c) => c.note)).toEqual([CLICK_NOTES.accent, CLICK_NOTES.beat, CLICK_NOTES.accent, CLICK_NOTES.beat])
  })

  test('7/8 (2+2+3) places clicks on group starts [0, 1, 2]', () => {
    const tl = buildTimeline(twoBarChart([7, 8], [2, 2, 3]), 0, 1)
    const playedOnly = { ...tl, bars: tl.bars.filter((b) => b.measure >= 0) }
    const clicks = generateClicks(playedOnly)

    expect(clicks).toHaveLength(6)
    expect(clicks.map((c) => c.tick / PPQ - tl.countIn)).toEqual([0, 1, 2, 3.5, 4.5, 5.5])
    expect(clicks.map((c) => c.note)).toEqual([
      CLICK_NOTES.accent,
      CLICK_NOTES.beat,
      CLICK_NOTES.beat,
      CLICK_NOTES.accent,
      CLICK_NOTES.beat,
      CLICK_NOTES.beat,
    ])
  })

  test('emits no click events in the count-in region', () => {
    const tl = buildTimeline(twoBarChart([4, 4]), 0, 1, { countIn: 2 })
    expect(tl.countIn).toBe(8)
    const clicks = generateClicks(tl)
    expect(clicks.length).toBeGreaterThan(0)
    expect(Math.min(...clicks.map((c) => c.tick))).toBeGreaterThanOrEqual(toTicks(tl.countIn))
  })
})

describe('arrange click channel', () => {
  test('includes click channel notes and GS drum SysEx by default, and omits them when click=false', () => {
    const chart = twoBarChart([4, 4])
    const style = getStyle('medium-swing')

    const withClick = arrange(chart, style, 0, 1, {}, 120, { click: true })
    const parsedWith = parseMidiTracks(withClick.midi)
    const clickNotes = parsedWith.notes.filter((n) => n.channel === CHANNELS.click)
    // 2 played bars + 1 ending bar = 3 bars * 4 beats = 12 clicks
    expect(clickNotes).toHaveLength(12)
    expect(Math.min(...clickNotes.map((n) => n.tick))).toBe(toTicks(withClick.timeline.countIn))
    expect(parsedWith.sysex).toContainEqual([0x41, 0x10, 0x42, 0x12, 0x40, 0x14, 0x15, 0x01, 0x16, 0xf7])

    const withoutClick = arrange(chart, style, 0, 1, {}, 120, { click: false })
    const parsedWithout = parseMidiTracks(withoutClick.midi)
    expect(parsedWithout.notes.filter((n) => n.channel === CHANNELS.click)).toEqual([])
  })

  test('renders audible metronome audio in renderWav even when drums and band are muted', { timeout: 60_000 }, async () => {
    const chart = twoBarChart([4, 4])
    const { midi } = arrange(chart, getStyle('medium-swing'), 0, 1, { countIn: 'off' }, 120, { click: true })
    const bytes = readFileSync(resolve(process.cwd(), 'public/soundfonts/openstand.sf3'))
    const soundBank = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)

    const wav = await renderWav(midi, soundBank, {
      volumes: { [CHANNELS.bass]: 0, [CHANNELS.comp]: 0, [CHANNELS.drums]: 0, [CHANNELS.click]: 100 },
      masterGain: masterGainFor(100),
    })

    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
    const totalSamples = view.getUint32(40, true) / 2
    let sumSquares = 0
    for (let i = 0; i < totalSamples; i++) {
      const sample = view.getInt16(44 + i * 2, true) / 32768
      sumSquares += sample * sample
    }
    expect(Math.sqrt(sumSquares / totalSamples)).toBeGreaterThan(0.001)
  })
})

describe('mixerState persistence', () => {
  test('defaults click to muted even when legacy stored settings lack a click key', () => {
    expect(parseMuted(null)).toEqual(DEFAULT_MUTED)
    expect(parseMuted(JSON.stringify({ bass: false, comp: true, drums: false }))).toEqual({
      bass: false,
      comp: true,
      drums: false,
      click: true,
    })
    expect(parseMuted(JSON.stringify({ bass: false, comp: false, drums: false, click: false })).click).toBe(false)
    expect(parseMuted('{bad')).toEqual(DEFAULT_MUTED)

    expect(parseVolumes(JSON.stringify({ bass: 100, comp: 70, drums: 90 }))).toEqual({
      ...DEFAULT_VOLUMES,
      bass: 100,
      comp: 70,
      drums: 90,
    })
  })
})
