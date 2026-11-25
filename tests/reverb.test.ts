import { describe, expect, test } from 'vitest'
import { DEFAULT_REVERB, reverbSend } from '../src/audio/reverb'
import { PART_REVERB } from '../src/engine/arrange'

describe('reverbSend', () => {
  test('the default keeps each part at the send it is written with', () => {
    for (const part of ['bass', 'comp', 'drums'] as const) expect(reverbSend(part, DEFAULT_REVERB)).toBe(PART_REVERB[part])
  })
  test('0 is dry and the top is wetter but stays in MIDI range', () => {
    for (const part of ['bass', 'comp', 'drums'] as const) {
      expect(reverbSend(part, 0)).toBe(0)
      expect(reverbSend(part, 127)).toBeGreaterThan(2 * PART_REVERB[part])
      expect(reverbSend(part, 127)).toBeLessThanOrEqual(127)
    }
  })
  test('rises with the fader', () => {
    expect(reverbSend('comp', 32)).toBeLessThan(reverbSend('comp', 64))
    expect(reverbSend('comp', 96)).toBeGreaterThan(reverbSend('comp', 64))
  })
})
