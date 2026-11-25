import type { StyleDefinition } from '../types'

// Tango: marcato piano and staccato bass with arrastre pickups, without drums.
export const tango: StyleDefinition = {
  id: 'tango',
  name: 'Tango',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 115, min: 90, max: 130 },

  // Staccato root and fifth on beats 1 and 3, with a brief chromatic arrastre drag at the end of beat 4
  bass: {
    mode: 'pattern',
    program: 32,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 0.45, tone: 'R', vel: 100 },
          { at: 2, dur: 0.45, tone: '5', vel: 90 },
        ],
        [
          { at: 0, dur: 0.45, tone: 'R', vel: 100 },
          { at: 2, dur: 0.45, tone: '5', vel: 90 },
          { at: 3.75, dur: 0.22, tone: 'app', vel: 78 },
        ],
        [
          { at: 0, dur: 0.45, tone: 'R', vel: 100 },
          { at: 2, dur: 0.45, tone: '5-', vel: 88 },
          { at: 3.75, dur: 0.22, tone: 'app', vel: 82 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 0.45, tone: 'R', vel: 100 },
          { at: 2, dur: 0.45, tone: '5', vel: 88 },
        ],
        [
          { at: 0, dur: 0.45, tone: 'R', vel: 100 },
          { at: 1, dur: 0.4, tone: '5', vel: 82 },
          { at: 2.75, dur: 0.22, tone: 'app', vel: 80 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 0.45, tone: 'R', vel: 100 },
          { at: 1, dur: 0.45, tone: '5', vel: 88 },
        ],
        [
          { at: 0, dur: 0.45, tone: 'R', vel: 100 },
          { at: 1.75, dur: 0.22, tone: 'app', vel: 80 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.45, tone: 'R', vel: 100 }]],
    },
  },

  // Piano (GM 0): Pattern A plays accented marcato chords on all four beats;
  // Pattern B plays the 3-3-2 sincopa (eighth-note offsets 0, 3, 6 -> beats 0, 1.5, 3).
  comp: {
    program: 0,
    voicing: 'close',
    velocity: [76, 94],
    rhythms: {
      '4': [
        [
          [0, 0.32, 92],
          [1, 0.28, 78],
          [2, 0.32, 88],
          [3, 0.28, 78],
        ],
        [
          [0, 0.5, 94],
          [1.5, 0.45, 90],
          [3, 0.32, 84],
        ],
      ],
      '3': [
        [
          [0, 0.32, 92],
          [1, 0.28, 78],
          [2, 0.28, 78],
        ],
        [
          [0, 0.45, 92],
          [1.5, 0.4, 86],
          [2.5, 0.28, 78],
        ],
      ],
      '2': [
        [
          [0, 0.32, 92],
          [1, 0.28, 80],
        ],
        [
          [0, 0.45, 92],
          [1.5, 0.32, 86],
        ],
      ],
      '1': [[[0, 0.32, 88]]],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'sidestick', 88],
      [1, 'sidestick', 74],
      [2, 'sidestick', 74],
      [3, 'sidestick', 74],
    ],
    grooves: {
      middle: [{ bars: 1, hits: [] }],
    },
    ending: [],
  },
}
