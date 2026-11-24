import type { DrumHit, StyleDefinition } from '../types'

// Fixed 2-3 son clave (bar 1: beats 2, 3; bar 2: beats 1, 2&, 4).
// 3-2 clave is not offered separately; this style is always anchored in 2-3.
const clave: DrumHit[] = [1, 2, 4, 5.5, 7].map((at): DrumHit => [at, 'claves', 82])

// Conga tumbao: slap/mute on 2, open high and low tones on 4 and 4&
function conga(offset: number): DrumHit[] {
  return [
    [offset + 1, 'congaMute', 84],
    [offset + 3, 'congaHigh', 76],
    [offset + 3.5, 'congaLow', 84],
  ]
}

// Kick reinforces the tumbao anticipation on 2& and 4
function kick(offset: number): DrumHit[] {
  return [
    [offset + 1.5, 'kick', 74],
    [offset + 3, 'kick', 80],
  ]
}

// Mambo cowbell (campana) pattern per bar
function bell(offset: number): DrumHit[] {
  return [
    [offset, 'cowbell', 76],
    [offset + 1, 'cowbell', 68],
    [offset + 1.5, 'cowbell', 62],
    [offset + 2.5, 'cowbell', 68],
    [offset + 3, 'cowbell', 72],
  ]
}

// 2-3 cáscara on the cross-stick with light ride bell accents
const cascara: DrumHit[] = [
  ...[0, 0.5, 1.5, 2.5, 3, 3.5, 4, 5, 5.5, 6.5, 7].map((at): DrumHit => [at, 'sidestick', 68]),
  ...[0, 2, 4, 6].map((at): DrumHit => [at, 'rideBell', 64, 0.6]),
]

export const afroCuban: StyleDefinition = {
  id: 'afro-cuban',
  name: 'Afro-Cuban',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 180, min: 120, max: 240 },

  // Tumbao bass: anticipates on 2& and 4 across the barline, rarely hitting beat 1
  bass: {
    mode: 'pattern',
    program: 32,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 1.5, dur: 1.4, tone: '5', vel: 92 },
          { at: 3, dur: 1.4, tone: 'app', vel: 96 },
        ],
        [
          { at: 1.5, dur: 1.4, tone: 'R', vel: 92 },
          { at: 3, dur: 1.4, tone: 'app', vel: 96 },
        ],
        [
          { at: 1.5, dur: 1.4, tone: '5-', vel: 92 },
          { at: 3, dur: 1.4, tone: 'R', vel: 96 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 90 },
          { at: 1.5, dur: 1.4, tone: '5', vel: 92 },
          { at: 3, dur: 1.4, tone: 'app', vel: 96 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.4, tone: 'R' },
          { at: 1.5, dur: 0.45, tone: '5' },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R' },
          { at: 1.5, dur: 0.45, tone: 'app' },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R' }]],
    },
  },

  // Piano montuno: two-bar syncopated figure in close voicings on Bright Piano
  comp: {
    program: 1,
    voicing: 'close',
    velocity: [64, 84],
    twoBar: [
      [
        [0, 0.45],
        [1, 0.45],
        [2.5, 0.45],
        [3.5, 0.8],
        [4.5, 0.45],
        [5.5, 0.45],
        [7, 0.45],
      ],
      [
        [0, 0.45],
        [1.5, 0.45],
        [2.5, 0.45],
        [3.5, 0.8],
        [4.5, 0.45],
        [5.5, 0.45],
        [6.5, 0.45],
        [7.5, 0.45],
      ],
    ],
    rhythms: {
      '4': [
        [[0, 0.45], [1, 0.45], [2.5, 0.45], [3.5, 0.8]],
        [[0.5, 0.45], [1.5, 0.45], [3, 0.45]],
      ],
      '2': [
        [[0, 0.45], [1.5, 0.45]],
        [[0.5, 0.45], [1.5, 0.45]],
      ],
      '1': [[[0, 0.45]]],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'claves', 92],
      [1, 'claves', 78],
      [2, 'claves', 78],
      [3, 'claves', 78],
    ],
    grooves: {
      middle: [
        { bars: 2, hits: [...clave, ...conga(0), ...conga(4), ...bell(0), ...bell(4), ...kick(0), ...kick(4)] },
        { bars: 2, hits: [...clave, ...conga(0), ...conga(4), ...cascara, ...kick(0), ...kick(4)] },
      ],
      first: [
        {
          bars: 1,
          hits: [...clave.filter(([at]) => at < 4), ...conga(0), ...bell(0), ...kick(0), [0, 'crash', 94, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            [1, 'claves', 82],
            [2, 'claves', 82],
            [1, 'congaMute', 84],
            [0, 'cowbell', 76],
            [1, 'cowbell', 68],
            [1.5, 'cowbell', 62],
            [1.5, 'kick', 74],
            [2.5, 'tomHigh', 84],
            [3, 'tomMid', 88],
            [3.25, 'congaHigh', 84],
            [3.5, 'congaLow', 90],
            [3.75, 'congaLow', 94],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 100, 1, 3],
      [0, 'kick', 92],
    ],
  },
}
