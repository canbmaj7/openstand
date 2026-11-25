import { describe, expect, test } from 'vitest'
import { createTapTempo } from '../src/music/tapTempo'

function makeClock(initial = 0) {
  let time = initial
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms
    },
    set: (ms: number) => {
      time = ms
    },
  }
}

describe('createTapTempo', () => {
  test('returns null on the first tap', () => {
    const clock = makeClock(1000)
    const tapper = createTapTempo({ now: clock.now })
    expect(tapper.tap()).toBeNull()
  })

  test('4 taps at 500 ms intervals return 120 BPM', () => {
    const clock = makeClock(0)
    const tapper = createTapTempo({ now: clock.now })

    expect(tapper.tap()).toBeNull()
    clock.advance(500)
    expect(tapper.tap()).toBe(120)
    clock.advance(500)
    expect(tapper.tap()).toBe(120)
    clock.advance(500)
    expect(tapper.tap()).toBe(120)
  })

  test('resets after a pause longer than resetMs (2.1 s)', () => {
    const clock = makeClock(0)
    const tapper = createTapTempo({ now: clock.now, resetMs: 2000 })

    expect(tapper.tap()).toBeNull()
    clock.advance(500)
    expect(tapper.tap()).toBe(120)

    clock.advance(2100)
    expect(tapper.tap()).toBeNull()

    clock.advance(400)
    expect(tapper.tap()).toBe(150)
  })

  test('resets sequence on an outlier interval (40%+ different from mean) and recovers cleanly', () => {
    const clock = makeClock(0)
    const tapper = createTapTempo({ now: clock.now })

    expect(tapper.tap()).toBeNull()
    clock.advance(500)
    expect(tapper.tap()).toBe(120)
    clock.advance(500)
    expect(tapper.tap()).toBe(120)

    // A single stumble (900 ms = +80% over 500 ms) resets instead of skewing to ~95 BPM
    clock.advance(900)
    expect(tapper.tap()).toBeNull()

    // Continuing at 500 ms restores 120 BPM on the very next tap
    clock.advance(500)
    expect(tapper.tap()).toBe(120)

    // Switching directly to a much faster tempo (250 ms = -50%) also resets and locks in
    clock.advance(250)
    expect(tapper.tap()).toBeNull()
    clock.advance(250)
    expect(tapper.tap()).toBe(240)
  })

  test('averages only over the last maxTaps taps', () => {
    const clock = makeClock(0)
    const tapper = createTapTempo({ now: clock.now, maxTaps: 4 })

    expect(tapper.tap()).toBeNull()
    clock.advance(600)
    expect(tapper.tap()).toBe(100)
    clock.advance(600)
    expect(tapper.tap()).toBe(100)

    // 500 ms is within 40% of 600 ms (~16.7% diff)
    clock.advance(500)
    expect(tapper.tap()).toBe(106) // mean of [600, 600, 500] = 566.67 ms

    clock.advance(500)
    expect(tapper.tap()).toBe(113) // last 4 taps -> intervals [600, 500, 500], mean = 533.33 ms

    clock.advance(500)
    expect(tapper.tap()).toBe(120) // last 4 taps -> intervals [500, 500, 500], mean = 500 ms
  })

  test('ignores zero-delta taps and supports explicit reset()', () => {
    const clock = makeClock(100)
    const tapper = createTapTempo({ now: clock.now })

    expect(tapper.tap()).toBeNull()
    clock.advance(500)
    expect(tapper.tap()).toBe(120)

    // Same timestamp resets rather than dividing by zero
    expect(tapper.tap()).toBeNull()

    clock.advance(500)
    expect(tapper.tap()).toBe(120)
    tapper.reset()
    clock.advance(500)
    expect(tapper.tap()).toBeNull()
  })
})
