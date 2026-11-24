import type { DrumHit, StyleDefinition } from '../types'

// Fast tempos: a flatter ride (closer to straight eighths) and hi-hat on 2 and 4
const time: DrumHit[] = [
  [0, 'ride', 80],
  [1, 'ride', 82],
  [2, 'ride', 80],
  [3, 'ride', 82],
  [1, 'hhPedal', 75],
  [3, 'hhPedal', 75],
  [0, 'kick', 30],
  [2, 'kick', 28],
]

export const upTempoSwing: StyleDefinition = {
  id: 'up-tempo-swing',
  name: 'Up-Tempo Swing',
  family: 'jazz',
  swing: 0.58,
  tempo: { default: 260, min: 200, max: 340 },

  // Quarter-note lines, simpler than medium swing: roots and fifths on the beat, one approach at most
  bass: {
    mode: 'pattern',
    program: 32,
    range: [28, 55],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1, tone: 'R' },
          { at: 1, dur: 1, tone: '5' },
          { at: 2, dur: 1, tone: '3' },
          { at: 3, dur: 1, tone: 'app' },
        ],
        [
          { at: 0, dur: 1, tone: 'R' },
          { at: 1, dur: 1, tone: '3' },
          { at: 2, dur: 1, tone: '5' },
          { at: 3, dur: 1, tone: '3' },
        ],
        [
          { at: 0, dur: 1, tone: 'R' },
          { at: 1, dur: 1, tone: '5' },
          { at: 2, dur: 1, tone: 'R' },
          { at: 3, dur: 1, tone: '5' },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1, tone: 'R' },
          { at: 1, dur: 1, tone: '5' },
        ],
        [
          { at: 0, dur: 1, tone: 'R' },
          { at: 1, dur: 1, tone: 'app' },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1, tone: 'R' },
          { at: 1, dur: 1, tone: '5' },
          { at: 2, dur: 1, tone: '3' },
        ],
      ],
      '1': [[{ at: 0, dur: 1, tone: 'R' }]],
    },
  },

  // Short stabs that anticipate beat one or hit the "and" of two and four
  comp: {
    program: 0,
    voicing: 'rootless',
    velocity: [50, 66],
    anticipation: 0.4,
    rhythms: {
      '4': [
        [], // a whole bar with no piano
        [[1.5, 0.4, 70]],
        [[3.5, 0.4, 70]],
        [[1.5, 0.3], [3.5, 0.3]],
        [[3.5, 0.3, 60]],
      ],
      '3': [[[1.5, 0.4, 70]]],
      '2': [[[1.5, 0.3, 66]]],
      '1': [[[0, 0.4, 60]]],
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
      middle: [
        { bars: 1, hits: [...time, [2.5, 'snare', 40, 0.2]] },
        { bars: 1, hits: [...time, [3.5, 'snare', 45, 0.3]] },
      ],
      first: [{ bars: 1, hits: [...time, [0, 'crash', 90, 0.6, 2], [0, 'kick', 80, 0.6]] }],
      last: [{ bars: 1, hits: [...time, [3, 'snare', 70, 0.7], [3.5, 'snare', 82, 0.7]] }],
    },
    ending: [
      [0, 'crash', 105, 1, 3],
      [0, 'kick', 95],
    ],
  },
}
