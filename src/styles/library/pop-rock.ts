import type { DrumHit, StyleDefinition } from '../types'

const hats: DrumHit[] = Array.from({ length: 8 }, (_, i): DrumHit => [i / 2, 'hhClosed', i % 2 === 0 ? 80 : 60])
const backbeat: DrumHit[] = [
  [1, 'snare', 100],
  [3, 'snare', 100],
]

export const popRock: StyleDefinition = {
  id: 'pop-rock',
  name: 'Pop Rock',
  family: 'pop',
  swing: 0.5,
  tempo: { default: 110, min: 70, max: 170 },

  bass: {
    mode: 'pattern',
    program: 33, // fingered electric bass
    range: [28, 50],
    patterns: {
      '4': [
        // Steady root eighths
        Array.from({ length: 8 }, (_, i) => ({ at: i / 2, dur: 0.42, tone: 'R' as const, vel: i % 2 === 0 ? 96 : 82 })),
        [
          { at: 0, dur: 0.9, tone: 'R' },
          { at: 1.5, dur: 0.42, tone: 'R' },
          { at: 2, dur: 0.9, tone: 'R' },
          { at: 3, dur: 0.42, tone: '8' },
          { at: 3.5, dur: 0.42, tone: '5' },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R' },
          { at: 1.5, dur: 0.42, tone: 'R' },
          { at: 2, dur: 0.42, tone: 'R' },
          { at: 2.5, dur: 0.42, tone: '5' },
          { at: 3, dur: 0.42, tone: '8' },
          { at: 3.5, dur: 0.42, tone: 'app' },
        ],
      ],
      '2': [
        Array.from({ length: 4 }, (_, i) => ({ at: i / 2, dur: 0.42, tone: 'R' as const, vel: i % 2 === 0 ? 96 : 82 })),
        [
          { at: 0, dur: 0.9, tone: 'R' },
          { at: 1, dur: 0.42, tone: 'R' },
          { at: 1.5, dur: 0.42, tone: 'app' },
        ],
      ],
      '1': [[{ at: 0, dur: 0.42, tone: 'R' }, { at: 0.5, dur: 0.42, tone: 'R' }]],
    },
  },

  comp: {
    program: 0,
    voicing: 'close',
    // The piano sits under the band: mostly long chords and a push, so the bass and drums carry the drive
    velocity: [56, 72],
    anticipation: 0.15,
    pedal: true,
    rhythms: {
      '4': [
        [[0, 1.4], [1.5, 0.9], [2.5, 1.4]],
        [[0, 1.9], [2, 1.9]],
        [[0, 1.4], [1.5, 2.4]],
        [[0, 0.9], [1, 0.9], [2, 0.9], [3, 0.9]],
      ],
      '2': [[[0, 0.9], [1, 0.9]], [[0, 1.4], [1.5, 0.45]]],
      '1': [[[0, 0.9]]],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'hhClosed', 90],
      [1, 'hhClosed', 80],
      [2, 'hhClosed', 80],
      [3, 'hhClosed', 80],
    ],
    grooves: {
      middle: [
        {
          bars: 2,
          hits: [
            ...hats,
            ...hats.map(([at, d, v]): DrumHit => [at + 4, d, v]),
            ...backbeat,
            ...backbeat.map(([at, d, v]): DrumHit => [at + 4, d, v]),
            [0, 'kick', 100],
            [2, 'kick', 95],
            [2.5, 'kick', 80],
            [4, 'kick', 100],
            [5.5, 'kick', 85],
            [6, 'kick', 95],
          ],
        },
        {
          bars: 2,
          hits: [
            ...hats,
            ...hats.map(([at, d, v]): DrumHit => [at + 4, d, v]),
            ...backbeat,
            ...backbeat.map(([at, d, v]): DrumHit => [at + 4, d, v]),
            [0, 'kick', 100],
            [2, 'kick', 95],
            [4, 'kick', 100],
            [6, 'kick', 95],
            [6.5, 'kick', 80],
            [7.5, 'hhOpen', 70, 0.5],
          ],
        },
      ],
      first: [{ bars: 1, hits: [...hats.slice(1), ...backbeat, [0, 'crash', 100, 1, 2], [0, 'kick', 105], [2, 'kick', 95]] }],
      last: [
        {
          bars: 1,
          hits: [
            ...hats.slice(0, 4),
            [0, 'kick', 100],
            [1, 'snare', 100],
            [2, 'snare', 85],
            [2.5, 'snare', 90],
            [3, 'tomHigh', 95],
            [3.25, 'tomHigh', 85],
            [3.5, 'tomMid', 95],
            [3.75, 'tomLow', 100],
          ],
        },
        { bars: 1, hits: [...hats, [0, 'kick', 100], [1, 'snare', 100], [2, 'kick', 95], [3, 'snare', 95], [3.5, 'snare', 105]] },
      ],
    },
    ending: [
      [0, 'crash', 110, 1, 3],
      [0, 'kick', 110],
      [0, 'snare', 100],
    ],
  },
}
