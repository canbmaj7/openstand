import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { masterGainFor } from '../src/audio/player'
import { renderMp3, renderWav } from '../src/audio/renderWav'
import { arrange, CHANNELS } from '../src/engine/arrange'
import { chartFromMeasures, type Chart } from '../src/music/chart'
import { getStyle } from '../src/styles'

function loadSoundBank(): ArrayBuffer {
  const bytes = readFileSync(resolve(process.cwd(), 'public/soundfonts/openstand.sf3'))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function shortChart(): Chart {
  return chartFromMeasures(
    { title: 'MP3 Test', style: 'medium-swing', key: 0, bpm: 120, time: [4, 4] },
    [['Dm7'], ['G7'], ['C^7'], ['A7']],
  )
}

function hasId3OrMpegSync(bytes: Uint8Array): boolean {
  const isId3 = bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33
  const isMpegSync = bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0
  return isId3 || isMpegSync
}

function countMpegFrames(bytes: Uint8Array): number {
  let offset = 0
  if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const tagSize =
      ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f)
    offset = 10 + tagSize
  }
  const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
  const sampleRates = [44100, 48000, 32000, 0]
  let frames = 0
  while (offset + 4 <= bytes.length) {
    expect(bytes[offset]).toBe(0xff)
    expect(bytes[offset + 1] & 0xe0).toBe(0xe0)
    const bitrate = bitrates[(bytes[offset + 2] >> 4) & 0x0f] * 1000
    const sampleRate = sampleRates[(bytes[offset + 2] >> 2) & 0x03]
    const padding = (bytes[offset + 2] >> 1) & 0x01
    expect(bitrate).toBe(192_000)
    expect(sampleRate).toBe(44100)
    offset += Math.floor((144 * bitrate) / sampleRate) + padding
    frames += 1
  }
  expect(offset).toBe(bytes.length)
  return frames
}

describe('renderMp3', () => {
  test('encodes a 44.1 kHz stereo 192 kbps MP3 much smaller than WAV with matching duration', { timeout: 60_000 }, async () => {
    const chart = shortChart()
    const style = getStyle(chart.style)
    const { midi } = arrange(chart, style, 0, 1, { countIn: 'off' }, chart.bpm)
    const soundBank = loadSoundBank()
    const baseOptions = {
      volumes: { [CHANNELS.bass]: 110, [CHANNELS.comp]: 85, [CHANNELS.drums]: 95 },
      masterGain: masterGainFor(100),
    }

    const wav = await renderWav(midi, soundBank, baseOptions)
    const progressUpdates: number[] = []
    const mp3 = await renderMp3(midi, soundBank, {
      ...baseOptions,
      onProgress: (ratio) => progressUpdates.push(ratio),
    })

    expect(hasId3OrMpegSync(mp3)).toBe(true)
    expect(mp3.byteLength).toBeLessThan(wav.byteLength / 7)

    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
    const wavDuration = view.getUint32(40, true) / (44100 * 2 * 2)
    const frameCount = countMpegFrames(mp3)
    const mp3Duration = (frameCount * 1152) / 44100

    expect(Math.abs(mp3Duration - wavDuration)).toBeLessThanOrEqual(0.2)
    expect(progressUpdates[0]).toBe(0)
    expect(progressUpdates).toContain(0.9)
    expect(progressUpdates[progressUpdates.length - 1]).toBe(1)
  })

  test('aborts cleanly before render and during MP3 encoding', { timeout: 60_000 }, async () => {
    const chart = shortChart()
    const { midi } = arrange(chart, getStyle(chart.style), 0, 1, { countIn: 'off' }, chart.bpm)
    const soundBank = loadSoundBank()
    const baseOptions = {
      volumes: { [CHANNELS.bass]: 110, [CHANNELS.comp]: 85, [CHANNELS.drums]: 95 },
      masterGain: masterGainFor(100),
    }

    const preAborted = new AbortController()
    preAborted.abort()
    await expect(renderMp3(midi, soundBank, { ...baseOptions, signal: preAborted.signal })).rejects.toMatchObject({
      name: 'AbortError',
    })

    const encodeAborted = new AbortController()
    await expect(
      renderMp3(midi, soundBank, {
        ...baseOptions,
        signal: encodeAborted.signal,
        onProgress: (ratio) => {
          if (ratio >= 0.9) encodeAborted.abort()
        },
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
