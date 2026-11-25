import type { DrumHit, StyleDefinition } from '../types'

// Bongo martillo in straight eighths with an open low bongo tone on beat 4
function martillo(offset: number): DrumHit[] {
  return [
    [offset, 'bongoHigh', 74],
    [offset + 0.5, 'bongoHigh', 46],
    [offset + 1, 'bongoHigh', 68],
    [offset + 1.5, 'bongoHigh', 46],
    [offset + 2, 'bongoHigh', 72],
    [offset + 2.5, 'bongoHigh', 46],
    [offset + 3, 'bongoLow', 82],
    [offset + 3.5, 'bongoHigh', 56],
  ]
}

// Steady maracas (GM 70) eighths, slightly accented on the beats
function maracas(offset: number): DrumHit[] {
  return Array.from({ length: 8 }, (_, i): DrumHit => [offset + i / 2, 'shaker', i % 2 === 0 ? 52 : 38])
}

// Soft 2-3 clave across two bars (bar 1: beats 2 & 3; bar 2: beats 1, 2& & 4)
const clave: DrumHit[] = [1, 2, 4, 5.5, 7].map((at): DrumHit => [at, 'claves', 58])

export const bolero: StyleDefinition = {
  id: 'bolero',
  name: 'Bolero',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 80, min: 60, max: 110 },

  // Bolero bass: root on 1, fifth on 2& and 3, with smooth approaches into the next chord
  bass: {
    mode: 'pattern',
    program: 32,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5-', vel: 78 },
          { at: 2, dur: 1.7, tone: '5-', vel: 88 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 80 },
          { at: 2, dur: 1.35, tone: '5', vel: 88 },
          { at: 3.5, dur: 0.45, tone: 'app', vel: 80 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5-', vel: 78 },
          { at: 2, dur: 0.9, tone: 'R', vel: 86 },
          { at: 3, dur: 0.85, tone: 'app', vel: 82 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5-', vel: 78 },
          { at: 2, dur: 0.9, tone: '5-', vel: 86 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 78 },
          { at: 2, dur: 0.9, tone: 'app', vel: 82 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5-', vel: 80 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: 'app', vel: 82 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R', vel: 94 }]],
    },
  },

  // Nylon-string guitar (GM 24): requinto-inspired eighth-note broken figures with gentle 2 & 4 strums
  comp: {
    program: 24,
    voicing: 'guitar',
    velocity: [48, 68],
    rhythms: {
      '4': [
        [
          [0, 0.55, 58],
          [0.5, 0.4, 48],
          [1, 0.45, 68],
          [1.5, 0.4, 50],
          [2, 0.5, 56],
          [2.5, 0.4, 48],
          [3, 0.45, 68],
          [3.5, 0.4, 52],
        ],
        [
          [0, 0.85, 60],
          [1, 0.45, 68],
          [1.5, 0.4, 50],
          [2.5, 0.4, 52],
          [3, 0.45, 68],
          [3.5, 0.4, 50],
        ],
        [
          [0, 0.55, 58],
          [0.5, 0.4, 48],
          [1, 0.75, 66],
          [2, 0.55, 56],
          [2.5, 0.4, 48],
          [3, 0.75, 66],
        ],
      ],
      '3': [
        [
          [0, 0.55, 58],
          [0.5, 0.4, 48],
          [1, 0.45, 68],
          [1.5, 0.4, 50],
          [2, 0.45, 66],
          [2.5, 0.4, 50],
        ],
      ],
      '2': [
        [
          [0, 0.55, 58],
          [0.5, 0.4, 48],
          [1, 0.45, 68],
          [1.5, 0.4, 50],
        ],
        [
          [0, 0.85, 60],
          [1, 0.45, 68],
          [1.5, 0.4, 50],
        ],
      ],
      '1': [
        [
          [0, 0.45, 62],
          [0.5, 0.4, 48],
        ],
      ],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'sidestick', 80],
      [1, 'sidestick', 66],
      [2, 'sidestick', 66],
      [3, 'sidestick', 66],
    ],
    grooves: {
      middle: [
        { bars: 2, hits: [...martillo(0), ...martillo(4), ...maracas(0), ...maracas(4), ...clave] },
        {
          bars: 2,
          hits: [
            ...martillo(0),
            ...martillo(4),
            ...maracas(0),
            ...maracas(4),
            ...clave,
            [1, 'sidestick', 44],
            [3, 'sidestick', 44],
            [5, 'sidestick', 44],
            [7, 'sidestick', 44],
          ],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...martillo(0).filter(([at]) => at < 3),
            ...maracas(0),
            [3, 'bongoLow', 84],
            [3.25, 'bongoHigh', 74],
            [3.5, 'bongoLow', 86],
            [3.75, 'bongoHigh', 78],
          ],
        },
      ],
    },
    ending: [
      [0, 'bongoLow', 78],
      [0, 'claves', 62],
      [0, 'shaker', 48],
    ],
  },
}
