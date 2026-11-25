import type { DrumHit, StyleDefinition } from '../types'

// Straight eighth-note ride with floating dynamic accents (avoiding heavy 1 and 3 downbeats)
function rideBar(offset: number, vels: readonly number[]): DrumHit[] {
  return vels.map((vel, i): DrumHit => [offset + i / 2, 'ride', vel])
}

const RIDE_A1 = [70, 56, 80, 58, 66, 78, 62, 74]
const RIDE_A2 = [68, 76, 62, 54, 78, 58, 66, 74]
const RIDE_B1 = [66, 74, 78, 56, 68, 76, 60, 72]
const RIDE_B2 = [72, 58, 76, 62, 66, 78, 64, 72]

const footHat = (bars: number): DrumHit[] =>
  Array.from({ length: bars }, (_, b): DrumHit[] => [
    [b * 4 + 1, 'hhPedal', 52],
    [b * 4 + 3, 'hhPedal', 52],
  ]).flat()

export const evenEighths: StyleDefinition = {
  id: 'even-eighths',
  name: 'Even 8ths',
  family: 'jazz',
  swing: 0.5,
  tempo: { default: 130, min: 100, max: 180 },

  // Flowing straight-eighth bass lines with chord tones and half-step approaches (not walking)
  bass: {
    mode: 'pattern',
    program: 32,
    range: [28, 55],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 84 },
          { at: 2, dur: 0.9, tone: '3', vel: 86 },
          { at: 3, dur: 0.45, tone: '5', vel: 82 },
          { at: 3.5, dur: 0.45, tone: 'app', vel: 84 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 94 },
          { at: 1, dur: 0.45, tone: '3', vel: 82 },
          { at: 1.5, dur: 0.9, tone: '5', vel: 86 },
          { at: 2.5, dur: 0.9, tone: '8', vel: 84 },
          { at: 3.5, dur: 0.45, tone: 'app', vel: 84 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.9, tone: '3', vel: 84 },
          { at: 2.5, dur: 0.45, tone: '5', vel: 84 },
          { at: 3, dur: 0.45, tone: '7', vel: 80 },
          { at: 3.5, dur: 0.45, tone: 'app', vel: 84 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 84 },
          { at: 2, dur: 0.45, tone: '3', vel: 84 },
          { at: 2.5, dur: 0.45, tone: 'app', vel: 84 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: 'app', vel: 84 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 94 },
          { at: 1, dur: 0.45, tone: '5', vel: 84 },
          { at: 1.5, dur: 0.45, tone: '3', vel: 82 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R', vel: 94 }]],
    },
  },

  // Acoustic piano (GM 0) with rootless voicings and sparse syncopated comping
  comp: {
    program: 0,
    voicing: 'rootless',
    velocity: [52, 70],
    anticipation: 0.2,
    rhythms: {
      '4': [
        [
          [0, 0.9],
          [1.5, 0.8],
          [3, 0.7],
        ],
        [
          [0.5, 0.7],
          [2.5, 1.1],
        ],
        [
          [0, 1.4],
          [2.5, 0.9],
        ],
        [
          [1.5, 1.3],
          [3.5, 0.45],
        ],
      ],
      '3': [
        [
          [0, 0.9],
          [1.5, 0.8],
        ],
        [
          [0.5, 0.8],
          [2, 0.8],
        ],
      ],
      '2': [
        [
          [0, 0.8],
          [1.5, 0.4],
        ],
        [[0.5, 0.9]],
      ],
      '1': [[[0, 0.7]]],
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
        {
          bars: 2,
          hits: [
            ...rideBar(0, RIDE_A1),
            ...rideBar(4, RIDE_A2),
            ...footHat(2),
            [1.5, 'sidestick', 58],
            [3, 'sidestick', 64, 0.85],
            [5.5, 'sidestick', 60],
            [7, 'sidestick', 62, 0.8],
            [0, 'kick', 68],
            [2.5, 'kick', 64],
            [5.5, 'kick', 66],
            [6.5, 'kick', 60, 0.65],
          ],
        },
        {
          bars: 2,
          hits: [
            ...rideBar(0, RIDE_B1),
            ...rideBar(4, RIDE_B2),
            ...footHat(2),
            [3, 'sidestick', 64],
            [3.5, 'sidestick', 48, 0.45],
            [5.5, 'sidestick', 62],
            [7.5, 'sidestick', 52, 0.5],
            [0, 'kick', 66],
            [1.5, 'kick', 60],
            [4, 'kick', 68],
            [6.5, 'kick', 64],
            [7.5, 'kick', 56, 0.5],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [
            ...rideBar(0, RIDE_A1),
            ...footHat(1),
            [0, 'crash', 86, 1, 2],
            [0, 'kick', 72],
            [2.5, 'kick', 64],
            [3, 'sidestick', 62],
          ],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...rideBar(0, RIDE_A1),
            ...footHat(1),
            [0, 'kick', 68],
            [1.5, 'sidestick', 58],
            [3, 'snare', 60, 0.8],
            [3.5, 'snare', 68, 0.8],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 98, 1, 3],
      [0, 'kick', 88],
    ],
  },
}
