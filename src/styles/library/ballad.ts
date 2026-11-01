import type { DrumHit, StyleDefinition } from '../types'

// Soft brush time: steady taps on the snare, hi-hat on 2 and 4
const brushes: DrumHit[] = [
  [0, 'snare', 50],
  [1, 'snare', 62],
  [1.5, 'snare', 42, 0.5],
  [2, 'snare', 50],
  [3, 'snare', 62],
  [3.5, 'snare', 42, 0.5],
  [1, 'hhPedal', 68],
  [3, 'hhPedal', 68],
  [0, 'kick', 42, 0.6],
  [2, 'kick', 38, 0.4],
]

export const ballad: StyleDefinition = {
  id: 'ballad',
  name: 'Ballad',
  family: 'jazz',
  swing: 0.66,
  tempo: { default: 70, min: 50, max: 100 },

  bass: {
    mode: 'pattern',
    program: 32,
    range: [28, 55],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.9, tone: 'R' },
          { at: 2, dur: 1.9, tone: '5' },
        ],
        [
          { at: 0, dur: 1.9, tone: 'R' },
          { at: 2, dur: 0.95, tone: '5' },
          { at: 3, dur: 0.95, tone: 'app' },
        ],
        [
          { at: 0, dur: 2.9, tone: 'R' },
          { at: 3, dur: 0.95, tone: 'app' },
        ],
      ],
      '3': [[{ at: 0, dur: 1.9, tone: 'R' }, { at: 2, dur: 0.95, tone: 'app' }]],
      '2': [[{ at: 0, dur: 1.9, tone: 'R' }], [{ at: 0, dur: 0.95, tone: 'R' }, { at: 1, dur: 0.95, tone: 'app' }]],
      '1': [[{ at: 0, dur: 0.95, tone: 'R' }]],
    },
  },

  comp: {
    program: 0,
    voicing: 'rootless',
    velocity: [44, 60],
    anticipation: 0.1,
    pedal: true,
    rhythms: {
      '4': [[[0, 3.8]], [[0, 1.8], [2.5, 1.3]], [[0, 2.4], [3, 0.9]]],
      '3': [[[0, 2.8]]],
      '2': [[[0, 1.8]], [[0.5, 1.4]]],
      '1': [[[0, 0.9]]],
    },
  },

  drums: {
    kit: 40, // brush kit
    countIn: [
      [0, 'sidestick', 70],
      [1, 'sidestick', 60],
      [2, 'sidestick', 60],
      [3, 'sidestick', 60],
    ],
    grooves: {
      middle: [{ bars: 1, hits: brushes }],
      last: [{ bars: 1, hits: [...brushes, [3.5, 'tomLow', 40, 0.5]] }],
    },
    ending: [
      [0, 'ride', 60, 1, 3],
      [0, 'kick', 45],
    ],
  },
}
