import type { DrumHit, StyleDefinition } from '../types'

// 16th-note closed hi-hat with clear accents on the 8th notes
function sixteenthHats(offset: number): DrumHit[] {
  return Array.from({ length: 16 }, (_, i): DrumHit => {
    const vel = i % 4 === 0 ? 76 : i % 2 === 0 ? 60 : 38
    return [offset + i / 4, 'hhClosed', vel]
  })
}

// Light rimshot / cross-stick on 2 and 4; optional soft snare ghost notes
function rimBackbeat(offset: number, withGhosts = false): DrumHit[] {
  const hits: DrumHit[] = [
    [offset + 1, 'sidestick', 76],
    [offset + 3, 'sidestick', 76],
  ]
  if (withGhosts) {
    hits.push([offset + 1.75, 'snare', 28, 0.45], [offset + 3.75, 'snare', 26, 0.4])
  }
  return hits
}

export const smoothJazz: StyleDefinition = {
  id: 'smooth-jazz',
  name: 'Smooth Jazz',
  // Pop family: urban R&B 16th-note pocket (closed hat + backbeat in compound/odd meters, keeps syncopation on guitar)
  family: 'pop',
  swing: 0.5,
  tempo: { default: 92, min: 80, max: 110 },

  // Electric bass (GM 33): sustained anchors paired with crisp 16th-note pickups
  bass: {
    mode: 'pattern',
    program: 33,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 96 },
          { at: 1.5, dur: 0.9, tone: '5', vel: 86 },
          { at: 2.75, dur: 0.22, tone: '7', vel: 80 },
          { at: 3, dur: 0.45, tone: '8', vel: 88 },
          { at: 3.75, dur: 0.22, tone: 'app', vel: 82 },
        ],
        [
          { at: 0, dur: 1.65, tone: 'R', vel: 96 },
          { at: 1.75, dur: 0.22, tone: '3', vel: 82 },
          { at: 2, dur: 1.2, tone: '5', vel: 88 },
          { at: 3.5, dur: 0.22, tone: '7', vel: 80 },
          { at: 3.75, dur: 0.22, tone: 'app', vel: 84 },
        ],
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 96 },
          { at: 1.5, dur: 1.15, tone: '8', vel: 88 },
          { at: 2.75, dur: 0.22, tone: '5', vel: 82 },
          { at: 3, dur: 0.65, tone: '3', vel: 84 },
          { at: 3.75, dur: 0.22, tone: 'app', vel: 82 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 96 },
          { at: 1.5, dur: 0.9, tone: '5', vel: 86 },
          { at: 2.75, dur: 0.22, tone: 'app', vel: 82 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 96 },
          { at: 1.75, dur: 0.22, tone: 'app', vel: 82 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 96 },
          { at: 1.25, dur: 0.22, tone: '5', vel: 82 },
          { at: 1.5, dur: 0.42, tone: 'app', vel: 84 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R', vel: 96 }]],
    },
  },

  // Electric piano (GM 4): pedaled rootless chords with 2&/4& punches, or lush pad-like Pattern B
  comp: {
    program: 4,
    voicing: 'rootless',
    velocity: [52, 70],
    pedal: true,
    anticipation: 0.15,
    rhythms: {
      '4': [
        [
          [0, 1.35, 64],
          [1.5, 0.35, 68],
          [2, 1.35, 60],
          [3.5, 0.35, 68],
        ],
        [
          [0, 1.9, 62],
          [2, 1.9, 58],
        ],
      ],
      '3': [
        [
          [0, 1.35, 64],
          [1.5, 0.35, 68],
          [2, 0.85, 60],
        ],
        [[0, 2.8, 62]],
      ],
      '2': [
        [
          [0, 1.35, 64],
          [1.5, 0.35, 68],
        ],
        [[0, 1.9, 62]],
      ],
      '1': [[[0, 0.9, 62]]],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'hhClosed', 88],
      [1, 'hhClosed', 78],
      [2, 'hhClosed', 78],
      [3, 'hhClosed', 78],
    ],
    grooves: {
      middle: [
        {
          bars: 2,
          hits: [
            ...sixteenthHats(0),
            ...sixteenthHats(4),
            ...rimBackbeat(0),
            ...rimBackbeat(4),
            [0, 'kick', 92],
            [1.5, 'kick', 78],
            [2.75, 'kick', 74, 0.7],
            [3.5, 'kick', 72, 0.5],
            [4, 'kick', 92],
            [4.75, 'kick', 74, 0.65],
            [5.5, 'kick', 80],
            [6.75, 'kick', 74],
          ],
        },
        {
          bars: 2,
          hits: [
            ...sixteenthHats(0),
            ...sixteenthHats(4),
            ...rimBackbeat(0, true),
            ...rimBackbeat(4, true),
            [0, 'kick', 92],
            [1.5, 'kick', 80],
            [2.25, 'kick', 70, 0.6],
            [4, 'kick', 92],
            [5.5, 'kick', 80],
            [6.5, 'kick', 76],
            [7.75, 'kick', 68, 0.5],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [
            ...sixteenthHats(0).slice(1),
            ...rimBackbeat(0),
            [0, 'crash', 86, 1, 2],
            [0, 'kick', 94],
            [1.5, 'kick', 78],
            [2.75, 'kick', 74, 0.7],
          ],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...sixteenthHats(0).slice(0, 12),
            ...rimBackbeat(0),
            [0, 'kick', 92],
            [1.5, 'kick', 78],
            [3, 'tomHigh', 76],
            [3.25, 'tomHigh', 72],
            [3.5, 'tomMid', 78],
            [3.75, 'tomLow', 82],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 94, 1, 3],
      [0, 'kick', 96],
      [0, 'sidestick', 84],
    ],
  },
}
