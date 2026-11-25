import type { DrumHit, StyleDefinition } from '../types'

// Guacharaca / güiro long-short-short pattern on beats 1-1&-2 and 3-3&-4
function guacharaca(offset: number): DrumHit[] {
  return [
    [offset, 'guiroLong', 70, 1, 0.45],
    [offset + 0.5, 'guiroShort', 56],
    [offset + 1, 'guiroShort', 52],
    [offset + 2, 'guiroLong', 68, 1, 0.45],
    [offset + 2.5, 'guiroShort', 56],
    [offset + 3, 'guiroShort', 52],
  ]
}

// Alegre / conga open tones on 2& and 4&
function alegre(offset: number): DrumHit[] {
  return [
    [offset + 1.5, 'congaHigh', 76],
    [offset + 3.5, 'congaLow', 82],
  ]
}

// Very light kick on beats 1 and 3
function kick(offset: number): DrumHit[] {
  return [
    [offset, 'kick', 54],
    [offset + 2, 'kick', 50],
  ]
}

export const cumbia: StyleDefinition = {
  id: 'cumbia',
  name: 'Cumbia',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 96, min: 85, max: 110 },

  // Cumbia bass: root on 1, fifth on 3 (with beat-4 approach), and Pattern B arpeggio on 1, 2&, 3
  bass: {
    mode: 'pattern',
    program: 33,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 2, dur: 0.9, tone: '5', vel: 88 },
          { at: 3, dur: 0.85, tone: 'app', vel: 84 },
        ],
        [
          { at: 0, dur: 1.3, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '3', vel: 84 },
          { at: 2, dur: 1.6, tone: '5', vel: 88 },
        ],
        [
          { at: 0, dur: 1.8, tone: 'R', vel: 94 },
          { at: 2, dur: 1.6, tone: '5-', vel: 88 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 2, dur: 0.9, tone: '5', vel: 88 },
        ],
        [
          { at: 0, dur: 1.3, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '3', vel: 84 },
          { at: 2, dur: 0.9, tone: 'app', vel: 84 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 84 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: 'app', vel: 84 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R', vel: 94 }]],
    },
  },

  // Accordion (GM 21): short off-beat chords on 1&, 2&, 3&, 4& (Pattern A) and beats 2 & 4 (Pattern B)
  comp: {
    program: 21,
    voicing: 'close',
    velocity: [72, 92],
    rhythms: {
      '4': [
        [
          [0.5, 0.45, 82],
          [1.5, 0.45, 86],
          [2.5, 0.45, 82],
          [3.5, 0.45, 86],
        ],
        [
          [1, 0.5, 86],
          [3, 0.5, 88],
        ],
      ],
      '3': [
        [
          [0.5, 0.45, 82],
          [1.5, 0.45, 86],
          [2.5, 0.45, 82],
        ],
        [
          [1, 0.5, 86],
          [2, 0.5, 84],
        ],
      ],
      '2': [
        [
          [0.5, 0.45, 82],
          [1.5, 0.45, 86],
        ],
        [[1, 0.5, 86]],
      ],
      '1': [[[0.5, 0.45, 82]], [[0, 0.5, 82]]],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'claves', 90],
      [1, 'claves', 76],
      [2, 'claves', 76],
      [3, 'claves', 76],
    ],
    grooves: {
      middle: [
        { bars: 2, hits: [...guacharaca(0), ...guacharaca(4), ...alegre(0), ...alegre(4), ...kick(0), ...kick(4)] },
        {
          bars: 2,
          hits: [
            ...guacharaca(0),
            ...guacharaca(4),
            ...alegre(0),
            ...alegre(4),
            ...kick(0),
            ...kick(4),
            [1, 'congaMute', 60],
            [3, 'congaMute', 62],
            [5, 'congaMute', 60],
            [7, 'congaMute', 62],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...guacharaca(0), ...alegre(0), ...kick(0), [0, 'crash', 86, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...guacharaca(0).slice(0, 4),
            ...kick(0),
            [1.5, 'congaHigh', 76],
            [2.5, 'timbaleHigh', 72],
            [3, 'congaHigh', 78],
            [3.25, 'timbaleHigh', 74],
            [3.5, 'congaLow', 84],
            [3.75, 'timbaleLow', 80],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 92, 1, 3],
      [0, 'kick', 80],
      [0, 'congaLow', 82],
    ],
  },
}
