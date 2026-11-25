import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { masterGainFor } from '../src/audio/player'
import { renderWav } from '../src/audio/renderWav'
import { arrange, CHANNELS } from '../src/engine/arrange'
import { EXAMPLES } from '../src/music/songs'
import { getStyle } from '../src/styles'

function loadSoundBank(): ArrayBuffer {
  const bytes = readFileSync(resolve(process.cwd(), 'public/soundfonts/openstand.sf3'))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length))
}

describe('renderWav', () => {
  test('renders a 44100 Hz stereo WAV with valid header, expected duration, and non-clipped audio', { timeout: 60_000 }, async () => {
    const tune = EXAMPLES.find((t) => t.id === 'rhythm-bb') ?? EXAMPLES[0]
    const style = getStyle(tune.chart.style)
    const { midi, timeline } = arrange(tune.chart, style, 0, 1, {}, tune.chart.bpm)
    const expectedDuration = (timeline.totalBeats * 60) / tune.chart.bpm + 2

    const progressUpdates: number[] = []
    const wav = await renderWav(midi, loadSoundBank(), {
      volumes: { [CHANNELS.bass]: 110, [CHANNELS.comp]: 85, [CHANNELS.drums]: 95 },
      masterGain: masterGainFor(100),
      onProgress: (ratio) => progressUpdates.push(ratio),
    })

    expect(ascii(wav, 0, 4)).toBe('RIFF')
    expect(ascii(wav, 8, 4)).toBe('WAVE')
    expect(ascii(wav, 12, 4)).toBe('fmt ')
    expect(ascii(wav, 36, 4)).toBe('data')

    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
    const audioFormat = view.getUint16(20, true)
    const numChannels = view.getUint16(22, true)
    const sampleRate = view.getUint32(24, true)
    const bitsPerSample = view.getUint16(34, true)
    const dataSize = view.getUint32(40, true)

    expect(audioFormat).toBe(1)
    expect(numChannels).toBe(2)
    expect(sampleRate).toBe(44100)
    expect(bitsPerSample).toBe(16)

    const totalSamples = dataSize / (bitsPerSample / 8)
    const durationSeconds = totalSamples / (sampleRate * numChannels)
    expect(Math.abs(durationSeconds - expectedDuration)).toBeLessThanOrEqual(3)

    let sumSquares = 0
    let maxAbs = 0
    for (let i = 0; i < totalSamples; i++) {
      const sample = view.getInt16(44 + i * 2, true) / 32768
      const abs = Math.abs(sample)
      if (abs > maxAbs) maxAbs = abs
      sumSquares += sample * sample
    }
    const rms = Math.sqrt(sumSquares / totalSamples)

    expect(maxAbs).toBeLessThanOrEqual(1)
    expect(rms).toBeGreaterThan(0.001)
    expect(progressUpdates[0]).toBe(0)
    expect(progressUpdates[progressUpdates.length - 1]).toBe(1)
  })

  test('outputs silence when all channels or master are muted', { timeout: 60_000 }, async () => {
    const tune = EXAMPLES.find((t) => t.id === 'rhythm-bb') ?? EXAMPLES[0]
    const style = getStyle(tune.chart.style)
    const { midi } = arrange(tune.chart, style, 0, 1, {}, tune.chart.bpm)

    const wav = await renderWav(midi, loadSoundBank(), {
      volumes: { [CHANNELS.bass]: 0, [CHANNELS.comp]: 0, [CHANNELS.drums]: 0 },
      masterGain: 0,
    })

    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
    const dataSize = view.getUint32(40, true)
    const totalSamples = dataSize / 2
    let maxAbs = 0
    for (let i = 0; i < totalSamples; i++) {
      const abs = Math.abs(view.getInt16(44 + i * 2, true) / 32768)
      if (abs > maxAbs) maxAbs = abs
    }
    expect(maxAbs).toBe(0)
  })

  test('applies reverb setting so reverb 127 has higher tail energy than reverb 0', { timeout: 60_000 }, async () => {
    const tune = EXAMPLES.find((t) => t.id === 'rhythm-bb') ?? EXAMPLES[0]
    const style = getStyle(tune.chart.style)
    const { midi } = arrange(tune.chart, style, 0, 1, {}, tune.chart.bpm)
    const soundBank = loadSoundBank()
    const baseOptions = {
      volumes: { [CHANNELS.bass]: 110, [CHANNELS.comp]: 85, [CHANNELS.drums]: 95 },
      masterGain: masterGainFor(100),
    }

    const dryWav = await renderWav(midi, soundBank, { ...baseOptions, reverb: 0 })
    const wetWav = await renderWav(midi, soundBank, { ...baseOptions, reverb: 127 })

    expect(Buffer.compare(Buffer.from(dryWav), Buffer.from(wetWav))).not.toBe(0)

    const tailRms = (wav: Uint8Array) => {
      const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
      const dataSize = view.getUint32(40, true)
      const totalSamples = dataSize / 2
      const tailSamples = Math.min(totalSamples, 44100 * 2 * 2) // last 2 s stereo tail
      const start = totalSamples - tailSamples
      let sumSquares = 0
      for (let i = start; i < totalSamples; i++) {
        const sample = view.getInt16(44 + i * 2, true) / 32768
        sumSquares += sample * sample
      }
      return Math.sqrt(sumSquares / tailSamples)
    }

    expect(tailRms(wetWav)).toBeGreaterThan(tailRms(dryWav))
  })
})
