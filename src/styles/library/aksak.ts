import type { DrumHit, StyleDefinition } from '../types'

// 4/4 fallback pattern (düm-tek darbuka + def) when played in non-grouped simple meters
const eighths = (offset: number): DrumHit[] => [
  [offset, 'congaLow', 100],
  [offset, 'kick', 74],
  [offset, 'tambourine', 68],
  [offset + 0.5, 'congaMute', 54, 0.85],
  [offset + 0.5, 'tambourine', 44, 0.75],
  [offset + 1, 'congaHigh', 82],
  [offset + 1, 'tambourine', 56],
  [offset + 1.5, 'congaMute', 54, 0.85],
  [offset + 1.5, 'tambourine', 44, 0.75],
  [offset + 2, 'congaLow', 90],
  [offset + 2, 'kick', 62],
  [offset + 2, 'tambourine', 60],
  [offset + 2.5, 'congaMute', 54, 0.85],
  [offset + 2.5, 'tambourine', 44, 0.75],
  [offset + 3, 'congaHigh', 84],
  [offset + 3, 'tambourine', 56],
  [offset + 3.5, 'congaMute', 56, 0.85],
  [offset + 3.5, 'congaHigh', 60, 0.35],
]

export const aksak: StyleDefinition = {
  id: 'aksak',
  name: 'Aksak (Turkish/Balkan)',
  family: 'world',
  swing: 0.5,
  tempo: { default: 200, min: 120, max: 320 },

  bass: {
    mode: 'pattern',
    program: 32, // acoustic bass
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.8, tone: 'R', vel: 96 },
          { at: 2, dur: 1.8, tone: '5', vel: 88 },
        ],
        [
          { at: 0, dur: 1.8, tone: 'R', vel: 96 },
          { at: 2, dur: 1.35, tone: '5', vel: 88 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 84 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.8, tone: 'R', vel: 96 },
          { at: 2, dur: 0.9, tone: '5', vel: 86 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 96 },
          { at: 1, dur: 0.9, tone: '5', vel: 86 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R', vel: 96 }]],
    },
  },

  // Steel-string acoustic guitar (GM 25) for short saz-like plucked chord strokes
  comp: {
    program: 25,
    voicing: 'guitar',
    velocity: [62, 88],
    rhythms: {
      '4': [
        [
          [0, 0.35, 64],
          [1, 0.35, 74],
          [2, 0.35, 76],
          [3, 0.4, 88],
        ],
        [
          [0, 0.35, 60],
          [1, 0.35, 74],
          [1.5, 0.3, 66],
          [2, 0.35, 74],
          [3, 0.4, 88],
        ],
      ],
      '3': [
        [
          [0, 0.35, 64],
          [1, 0.35, 74],
          [2, 0.4, 88],
        ],
      ],
      '2': [
        [
          [0, 0.35, 64],
          [1, 0.4, 84],
        ],
      ],
      '1': [[[0, 0.35, 78]]],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'sidestick', 96],
      [1, 'sidestick', 80],
      [2, 'sidestick', 80],
      [3, 'sidestick', 80],
    ],
    grooves: {
      middle: [
        { bars: 1, hits: eighths(0) },
        {
          bars: 2,
          hits: [...eighths(0), ...eighths(4), [7.5, 'congaHigh', 76, 0.5]],
        },
      ],
      first: [
        { bars: 1, hits: [...eighths(0), [0, 'crash', 86, 1, 1.5]] },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...eighths(0).filter(([at]) => at < 3),
            [3, 'tomHigh', 84],
            [3.5, 'tomMid', 88],
            [3.75, 'congaHigh', 86],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 100, 1, 3],
      [0, 'congaLow', 100],
      [0, 'kick', 82],
    ],
  },
}
