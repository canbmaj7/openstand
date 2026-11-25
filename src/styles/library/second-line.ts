import type { DrumHit, StyleDefinition } from '../types'

// Two-bar New Orleans street beat: snare with abundant low-velocity ghost notes and
// crisp accents on syncopated "and"s and beat 4 (avoiding heavy 1 and 3 snare hits).
function streetSnare(offset: number, alt = false): DrumHit[] {
  const ghosts: DrumHit[] = [
    [offset + 0.25, 'snare', 28],
    [offset + 0.75, 'snare', 32],
    [offset + 1.25, 'snare', 30],
    [offset + 1.75, 'snare', 34],
    [offset + 2.25, 'snare', 28, 0.8],
    [offset + 2.5, 'snare', 36, 0.75],
    [offset + 2.75, 'snare', 32],
    [offset + 3.25, 'snare', 30, 0.85],
    [offset + 3.75, 'snare', 34],
    [offset + 4.25, 'snare', 28],
    [offset + 4.75, 'snare', 32],
    [offset + 5.25, 'snare', 30],
    [offset + 5.75, 'snare', 34],
    [offset + 6.25, 'snare', 28, 0.85],
    [offset + 6.75, 'snare', 32],
    [offset + 7.25, 'snare', 30, 0.8],
    [offset + 7.75, 'snare', 34, 0.75],
  ]
  const accents: DrumHit[] = alt
    ? [
        [offset + 0.5, 'snare', 96],
        [offset + 1.5, 'snare', 94],
        [offset + 3, 'snare', 102],
        [offset + 4.5, 'snare', 92],
        [offset + 5.5, 'snare', 98],
        [offset + 6.5, 'snare', 92],
        [offset + 7, 'snare', 100],
      ]
    : [
        [offset + 0.5, 'snare', 96],
        [offset + 1.5, 'snare', 94],
        [offset + 3, 'snare', 102],
        [offset + 4.5, 'snare', 94],
        [offset + 5.5, 'snare', 96],
        [offset + 6.5, 'snare', 90],
        [offset + 7.5, 'snare', 98],
      ]
  return [...ghosts, ...accents]
}

const footHat = (bars: number): DrumHit[] =>
  Array.from({ length: bars }, (_, b): DrumHit[] => [
    [b * 4 + 1, 'hhPedal', 56],
    [b * 4 + 3, 'hhPedal', 56],
  ]).flat()

export const secondLine: StyleDefinition = {
  id: 'second-line',
  name: 'Second Line',
  family: 'jazz',
  // Lighter swing than medium-swing so 16th-note street ghosts stay loose and bouncy
  swing: 0.59,
  tempo: { default: 108, min: 90, max: 130 },

  // Tuba-style two-beat feel on 1 and 3 with a 4& approach (acoustic bass GM 32, since GM 58 Tuba is not in the trimmed soundbank)
  bass: {
    mode: 'pattern',
    program: 32,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 100 },
          { at: 2, dur: 1.3, tone: '5', vel: 92 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 100 },
          { at: 2, dur: 1.3, tone: '5-', vel: 92 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 100 },
          { at: 1.5, dur: 0.4, tone: '5', vel: 84 },
          { at: 2, dur: 1.3, tone: 'R', vel: 94 },
          { at: 3.5, dur: 0.42, tone: '3', vel: 86 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 100 },
          { at: 2, dur: 0.45, tone: '5', vel: 90 },
          { at: 2.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 100 },
          { at: 1.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 100 },
          { at: 1, dur: 0.85, tone: '5', vel: 90 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R', vel: 100 }]],
    },
  },

  // Piano (GM 0): punchy 2 and 4 chords with 16th-note syncopated bounce
  comp: {
    program: 0,
    voicing: 'close',
    velocity: [60, 82],
    anticipation: 0.15,
    rhythms: {
      '4': [
        [
          [1, 0.35, 76],
          [1.75, 0.22, 68],
          [3, 0.35, 78],
          [3.5, 0.3, 72],
        ],
        [
          [0, 0.45, 74],
          [1, 0.3, 74],
          [2.5, 0.3, 76],
          [3, 0.3, 76],
          [3.75, 0.2, 68],
        ],
        [
          [1, 0.35, 76],
          [2.5, 0.25, 68],
          [3, 0.35, 78],
        ],
      ],
      '3': [
        [
          [1, 0.35, 76],
          [1.75, 0.22, 66],
          [2.5, 0.35, 74],
        ],
      ],
      '2': [
        [
          [0, 0.4, 74],
          [1, 0.3, 76],
          [1.5, 0.3, 70],
        ],
        [[1, 0.35, 76]],
      ],
      '1': [[[0, 0.45, 74]]],
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
      middle: [
        {
          bars: 2,
          hits: [
            ...streetSnare(0),
            ...footHat(2),
            [0, 'kick', 102],
            [1.5, 'kick', 92],
            [2, 'kick', 96],
            [3.5, 'kick', 88],
            [4, 'kick', 102],
            [5.5, 'kick', 92],
            [6, 'kick', 96],
            [7.5, 'kick', 88, 0.75],
          ],
        },
        {
          bars: 2,
          hits: [
            ...streetSnare(0, true),
            ...footHat(2),
            [0, 'kick', 102],
            [1.5, 'kick', 92],
            [2, 'kick', 96],
            [3.5, 'kick', 88],
            [4, 'kick', 102],
            [4.5, 'kick', 84, 0.7],
            [6, 'kick', 98],
            [7.5, 'kick', 90],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [
            ...streetSnare(0).filter(([at]) => at < 4),
            ...footHat(1),
            [0, 'crash', 96, 1, 2],
            [0, 'kick', 104],
            [1.5, 'kick', 92],
            [2, 'kick', 96],
            [3.5, 'kick', 88],
          ],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...streetSnare(0).filter(([at]) => at < 3),
            ...footHat(1),
            [0, 'kick', 102],
            [1.5, 'kick', 92],
            [2, 'kick', 96],
            [3, 'snare', 96],
            [3.25, 'snare', 78],
            [3.5, 'tomMid', 92],
            [3.75, 'snare', 102],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 106, 1, 3],
      [0, 'kick', 106],
      [0, 'snare', 98],
    ],
  },
}
