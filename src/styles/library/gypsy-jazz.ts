import type { StyleDefinition } from '../types'

// Gypsy Jazz (Jazz Manouche): steel-string "la pompe" rhythm guitar, 4-to-the-bar
// walking acoustic bass, and no drum kit (Hot Club acoustic ensemble).
export const gypsyJazz: StyleDefinition = {
  id: 'gypsy-jazz',
  name: 'Gypsy Jazz',
  family: 'jazz',
  swing: 0.6,
  tempo: { default: 190, min: 120, max: 260 },

  bass: { mode: 'walking', program: 32, range: [28, 55] },

  // Steel-string acoustic guitar (GM 25) playing la pompe:
  // fuller downbeats on 1 & 3, sharper, very short staccato chops on 2 & 4,
  // with an optional crisp upstroke pickup right before beat 1.
  comp: {
    program: 25,
    voicing: 'guitar',
    velocity: [60, 92],
    rhythms: {
      '4': [
        [
          [0, 0.42, 66],
          [1, 0.2, 90],
          [2, 0.42, 66],
          [3, 0.2, 90],
        ],
        [
          [0, 0.42, 66],
          [1, 0.2, 90],
          [2, 0.42, 66],
          [3, 0.2, 90],
          [3.75, 0.16, 58],
        ],
        [
          [0, 0.42, 66],
          [1, 0.2, 90],
          [2, 0.42, 66],
          [3, 0.2, 90],
          [3.5, 0.18, 56],
        ],
      ],
      '3': [
        [
          [0, 0.42, 66],
          [1, 0.2, 90],
          [2, 0.2, 88],
        ],
        [
          [0, 0.42, 66],
          [1, 0.2, 90],
          [2, 0.2, 88],
          [2.75, 0.16, 58],
        ],
      ],
      '2': [
        [
          [0, 0.42, 66],
          [1, 0.2, 90],
        ],
        [
          [0, 0.42, 66],
          [1, 0.2, 90],
          [1.75, 0.16, 58],
        ],
      ],
      '1': [[[0, 0.38, 74]]],
    },
  },

  drums: {
    kit: 32,
    countIn: [
      [0, 'sidestick', 95],
      [1, 'sidestick', 80],
      [2, 'sidestick', 80],
      [3, 'sidestick', 80],
    ],
    grooves: {
      middle: [{ bars: 1, hits: [] }],
    },
    ending: [],
  },
}
