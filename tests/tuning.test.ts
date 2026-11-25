import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SpessaSynthProcessor } from 'spessasynth_core'
import { describe, expect, test } from 'vitest'
import { masterGainFor } from '../src/audio/player'
import { renderWav } from '../src/audio/renderWav'
import { applyTuning, centsForA4, clampA4, DEFAULT_A4, parseA4 } from '../src/audio/tuning'
import { arrange, CHANNELS } from '../src/engine/arrange'
import { chartFromMeasures } from '../src/music/chart'
import { getStyle } from '../src/styles'

function loadSoundBank(): ArrayBuffer {
  const bytes = readFileSync(resolve(process.cwd(), 'public/soundfonts/openstand.sf3'))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('tuning helpers', () => {
  test('computes cents relative to A4 = 440 Hz', () => {
    expect(centsForA4(440)).toBe(0)
    expect(centsForA4(442)).toBeCloseTo(7.85, 2)
    expect(centsForA4(432)).toBeCloseTo(-31.77, 2)
    expect(centsForA4(0)).toBe(0)
    expect(centsForA4(-440)).toBe(0)
    expect(centsForA4(Number.NaN)).toBe(0)
  })

  test('clamps and rounds A4 frequency to 430–450 Hz integer values', () => {
    expect(clampA4(440)).toBe(440)
    expect(clampA4(420)).toBe(430)
    expect(clampA4(460)).toBe(450)
    expect(clampA4(442.4)).toBe(442)
    expect(clampA4(442.6)).toBe(443)
    expect(clampA4(Number.NaN)).toBe(DEFAULT_A4)
    expect(clampA4(Number.POSITIVE_INFINITY)).toBe(DEFAULT_A4)
  })

  test('parses stored A4 values and falls back to 440 Hz on corrupt input', () => {
    expect(parseA4('441')).toBe(441)
    expect(parseA4(' 435 ')).toBe(435)
    expect(parseA4('442.6')).toBe(443)
    expect(parseA4('420')).toBe(430)
    expect(parseA4('500')).toBe(450)
    expect(parseA4('not-a-number')).toBe(DEFAULT_A4)
    expect(parseA4('')).toBe(DEFAULT_A4)
    expect(parseA4(null)).toBe(DEFAULT_A4)
  })

  test('applies fineTune global system parameter to SpessaSynthProcessor', async () => {
    const synth = new SpessaSynthProcessor(44100)
    try {
      await synth.ready
      const cents = centsForA4(450)
      applyTuning(synth, cents)
      expect(synth.systemParameters.fineTune).toBeCloseTo(cents, 6)

      applyTuning(synth, centsForA4(440))
      expect(synth.systemParameters.fineTune).toBe(0)
    } finally {
      synth.destroy()
    }
  })

  test('renders different audio when tuned to 450 Hz vs 440 Hz', { timeout: 60_000 }, async () => {
    const chart = chartFromMeasures(
      { title: 'Tuning Test', style: 'medium-swing', key: 0, bpm: 120, time: [4, 4] },
      [['Cmaj7']],
    )
    const { midi } = arrange(chart, getStyle(chart.style), 0, 1, { countIn: 'off' }, chart.bpm)
    const soundBank = loadSoundBank()
    const baseOptions = {
      volumes: { [CHANNELS.bass]: 110, [CHANNELS.comp]: 85, [CHANNELS.drums]: 0, [CHANNELS.click]: 0 },
      masterGain: masterGainFor(100),
    }

    const wav440 = await renderWav(midi, soundBank, { ...baseOptions, tuningCents: centsForA4(440) })
    const wav450 = await renderWav(midi, soundBank, { ...baseOptions, tuningCents: centsForA4(450) })

    expect(Buffer.compare(Buffer.from(wav440), Buffer.from(wav450))).not.toBe(0)
  })
})
