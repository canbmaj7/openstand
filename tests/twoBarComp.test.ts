import { describe, expect, test } from 'vitest'
import { arrange } from '../src/engine/arrange'
import { generateComp } from '../src/engine/comp'
import { PPQ, type NoteEvent } from '../src/engine/events'
import { buildTimeline } from '../src/engine/timeline'
import { chartFromMeasures, type TimeSignature } from '../src/music/chart'
import { getStyle } from '../src/styles'
import type { CompPart } from '../src/styles/types'

function barBeats(events: NoteEvent[], barStart: number, barLength: number): number[] {
  const beats = new Set<number>()
  for (const e of events) {
    const rel = e.tick / PPQ - barStart
    if (rel >= -0.05 && rel < barLength - 0.05) {
      beats.add(Math.round(rel * 4) / 4)
    }
  }
  return [...beats].sort((a, b) => a - b)
}

describe('twoBar comp support', () => {
  const compWithTwoBar: CompPart = {
    program: 1,
    voicing: 'close',
    velocity: [70, 70],
    twoBar: [
      [
        [0, 0.3],
        [1.5, 0.3],
        [3, 0.3],
        [4.5, 0.3],
        [6, 0.3],
        [7.5, 0.3],
      ],
    ],
    rhythms: {
      '4': [[[0, 0.3]]],
      '2': [
        [
          [0, 0.3],
          [1, 0.3],
        ],
      ],
      '1': [[[0, 0.3]]],
    },
  }

  test('alternates first and second halves of twoBar across full 4/4 bars', () => {
    const chart = chartFromMeasures({ title: 'Montuno', style: 'afro-cuban', key: 0, bpm: 180 }, [
      ['D-7'],
      ['G7'],
      ['C^7'],
      ['A7'],
    ])
    const timeline = buildTimeline(chart, 0, 1)
    const slots = timeline.slots.filter((s) => s.measure >= 0)
    const events = generateComp(slots, compWithTwoBar, 0.5, timeline.countIn)

    const playedBars = timeline.bars.filter((b) => b.measure >= 0)
    expect(playedBars).toHaveLength(4)

    expect(barBeats(events, playedBars[0].start, 4)).toEqual([0, 1.5, 3])
    expect(barBeats(events, playedBars[1].start, 4)).toEqual([0.5, 2, 3.5])
    expect(barBeats(events, playedBars[2].start, 4)).toEqual([0, 1.5, 3])
    expect(barBeats(events, playedBars[3].start, 4)).toEqual([0.5, 2, 3.5])
  })

  test('falls back to rhythms on half-bar chords', () => {
    const chart = chartFromMeasures({ title: 'Split', style: 'afro-cuban', key: 0, bpm: 180 }, [
      ['D-7', 'G7'],
      ['C^7', 'A7'],
    ])
    const timeline = buildTimeline(chart, 0, 1)
    const slots = timeline.slots.filter((s) => s.measure >= 0)
    expect(slots.every((s) => s.beats === 2)).toBe(true)

    const events = generateComp(slots, compWithTwoBar, 0.5, timeline.countIn)
    const playedBars = timeline.bars.filter((b) => b.measure >= 0)

    expect(barBeats(events, playedBars[0].start, 4)).toEqual([0, 1, 2, 3])
    expect(barBeats(events, playedBars[1].start, 4)).toEqual([0, 1, 2, 3])
  })

  test('afro-cuban arranges cleanly in 4/4, 3/4, and 6/8', () => {
    const style = getStyle('afro-cuban')
    expect(style.id).toBe('afro-cuban')

    for (const time of [
      [4, 4],
      [3, 4],
      [6, 8],
    ] as TimeSignature[]) {
      const chart = chartFromMeasures({ title: 'Afro', style: 'afro-cuban', key: 2, bpm: 180, time }, [
        ['D-7'],
        ['G7'],
        ['C^7'],
        ['A7'],
      ])
      const { midi } = arrange(chart, style, 0, 2)
      expect(midi.length, time.join('/')).toBeGreaterThan(200)
    }
  })
})
