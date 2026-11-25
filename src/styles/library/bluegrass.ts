import type { StyleDefinition } from '../types'

// Bluegrass: traditional acoustic string-band groove with no drum kit.
// Upright bass anchors beats 1 and 3 with walk-ups into chord changes, while
// steel-string guitar delivers a short, high mandolin-like chop on 2 and 4
// (Pattern A) or a brisk down-up flatpicking strum (Pattern B).
export const bluegrass: StyleDefinition = {
  id: 'bluegrass',
  name: 'Bluegrass',
  family: 'pop',
  swing: 0.5,
  tempo: { default: 150, min: 110, max: 200 },

  bass: {
    mode: 'pattern',
    program: 32, // acoustic upright bass
    range: [28, 52],
    patterns: {
      '4': [
        // Clean alternating root-fifth on beats 1 and 3
        [
          { at: 0, dur: 1.75, tone: 'R', vel: 102 },
          { at: 2, dur: 1.75, tone: '5', vel: 94 },
        ],
        // Root-fifth with a beat-4 approach note into the next chord
        [
          { at: 0, dur: 1.75, tone: 'R', vel: 102 },
          { at: 2, dur: 0.9, tone: '5', vel: 94 },
          { at: 3, dur: 0.85, tone: 'app', vel: 92 },
        ],
        // Root-fifth with an eighth-note run at the end of the bar
        [
          { at: 0, dur: 1.75, tone: 'R', vel: 102 },
          { at: 2, dur: 0.9, tone: '5', vel: 94 },
          { at: 3, dur: 0.45, tone: '6', vel: 88 },
          { at: 3.5, dur: 0.45, tone: 'app', vel: 92 },
        ],
        // Four-beat connecting walk into the next chord
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 102 },
          { at: 1, dur: 0.9, tone: '3', vel: 90 },
          { at: 2, dur: 0.9, tone: '5', vel: 94 },
          { at: 3, dur: 0.85, tone: 'app', vel: 92 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 102 },
          { at: 1, dur: 0.9, tone: '5', vel: 86 },
          { at: 2, dur: 0.9, tone: '5', vel: 86 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 102 },
          { at: 1, dur: 0.9, tone: '5', vel: 88 },
          { at: 2, dur: 0.9, tone: 'app', vel: 90 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 102 },
          { at: 1, dur: 0.9, tone: '5', vel: 92 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 102 },
          { at: 1, dur: 0.9, tone: 'app', vel: 90 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.85, tone: 'R', vel: 102 }]],
    },
  },

  // Steel-string acoustic guitar (GM 25) in high close voicings for mandolin-like
  // backbeat chops on 2 & 4 (Pattern A) and down-up flatpicking eighths (Pattern B).
  comp: {
    program: 25,
    voicing: 'close',
    velocity: [62, 94],
    rhythms: {
      '4': [
        // Pattern A: tight backbeat chops on 2 and 4
        [
          [1, 0.15, 92],
          [3, 0.15, 92],
        ],
        // Backbeat chops with a light upstroke pickup on 4&
        [
          [1, 0.15, 92],
          [3, 0.15, 92],
          [3.5, 0.15, 68],
        ],
        // Pattern B: down-up eighth-note strum with crisp 2 & 4 accents
        [
          [0, 0.42, 72],
          [0.5, 0.32, 62],
          [1, 0.18, 92],
          [1.5, 0.32, 66],
          [2, 0.42, 70],
          [2.5, 0.32, 62],
          [3, 0.18, 92],
          [3.5, 0.32, 66],
        ],
      ],
      '3': [
        [
          [1, 0.15, 90],
          [2, 0.15, 88],
        ],
        [
          [0, 0.42, 72],
          [0.5, 0.32, 62],
          [1, 0.18, 90],
          [1.5, 0.32, 64],
          [2, 0.18, 88],
          [2.5, 0.32, 64],
        ],
      ],
      '2': [
        [[1, 0.15, 92]],
        [
          [0, 0.42, 72],
          [0.5, 0.32, 62],
          [1, 0.18, 92],
          [1.5, 0.32, 64],
        ],
      ],
      '1': [[[0.5, 0.15, 86]], [[0, 0.42, 74]]],
    },
  },

  drums: {
    kit: 0,
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
