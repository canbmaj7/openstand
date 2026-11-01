import type { DrumHit, StyleDefinition } from '../types'

// Light eighth-note hi-hat, slightly accented on the beat
const hats: DrumHit[] = Array.from({ length: 16 }, (_, i): DrumHit => [i / 2, 'hhClosed', i % 2 === 0 ? 52 : 38])

// Bossa kick: "dotted quarter + eighth" twice
const kick: DrumHit[] = [0, 1.5, 2, 3.5, 4, 5.5, 6, 7.5].map((at): DrumHit => [at, 'kick', at % 2 === 0 ? 62 : 48])

// Two-bar cross-stick figure, in both directions
const crossA: DrumHit[] = [0, 1.5, 3, 5, 6.5].map((at): DrumHit => [at, 'sidestick', 70])
const crossB: DrumHit[] = [1, 2.5, 4, 5.5, 7].map((at): DrumHit => [at, 'sidestick', 70])

export const bossaNova: StyleDefinition = {
  id: 'bossa-nova',
  name: 'Bossa Nova',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 130, min: 90, max: 180 },

  bass: {
    mode: 'pattern',
    program: 32,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.4, tone: 'R' },
          { at: 1.5, dur: 0.45, tone: '5-' },
          { at: 2, dur: 1.4, tone: '5-' },
          { at: 3.5, dur: 0.45, tone: 'R' },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R' },
          { at: 1.5, dur: 0.45, tone: '5' },
          { at: 2, dur: 1.4, tone: '5' },
          { at: 3.5, dur: 0.45, tone: 'app' },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.4, tone: 'R' },
          { at: 1.5, dur: 0.45, tone: '5-' },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R' },
          { at: 1.5, dur: 0.45, tone: 'app' },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R' }]],
    },
  },

  comp: {
    program: 24, // nylon-string guitar
    voicing: 'rootless',
    velocity: [50, 66],
    anticipation: 0.3,
    rhythms: {
      '4': [
        [[0, 0.4], [1.5, 0.4], [3, 0.4]],
        [[0, 0.4], [1.5, 0.9], [3, 0.4]],
        [[1, 0.4], [2.5, 0.9], [3.5, 0.4]],
        [[0, 0.4], [1.5, 0.9], [3, 0.9]],
      ],
      '2': [[[0, 0.4], [1.5, 0.4]], [[0.5, 0.4], [1.5, 0.4]]],
      '1': [[[0, 0.4]]],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'sidestick', 85],
      [1, 'sidestick', 70],
      [2, 'sidestick', 70],
      [3, 'sidestick', 70],
    ],
    grooves: {
      middle: [
        { bars: 2, hits: [...hats, ...kick, ...crossA] },
        { bars: 2, hits: [...hats, ...kick, ...crossB] },
      ],
      last: [
        {
          bars: 1,
          hits: [...hats.slice(0, 8), ...kick.slice(0, 4), [0, 'sidestick', 70], [1.5, 'sidestick', 70], [3, 'tomMid', 60], [3.5, 'tomLow', 66]],
        },
      ],
    },
    ending: [
      [0, 'kick', 70],
      [0, 'sidestick', 75],
      [0, 'shaker', 45],
    ],
  },
}
