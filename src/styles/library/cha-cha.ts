import type { DrumHit, StyleDefinition } from '../types'

// Cencerro (cowbell) on every quarter note, accented on beats 1 and 3
function cowbell(offset: number): DrumHit[] {
  return [
    [offset, 'cowbell', 76],
    [offset + 1, 'cowbell', 60],
    [offset + 2, 'cowbell', 72],
    [offset + 3, 'cowbell', 60],
  ]
}

// Güiro long-short-short figure per half-bar (1, 2, 2& and 3, 4, 4&)
function guiro(offset: number): DrumHit[] {
  return [
    [offset, 'guiroLong', 68, 1, 0.45],
    [offset + 1, 'guiroShort', 56],
    [offset + 1.5, 'guiroShort', 50],
    [offset + 2, 'guiroLong', 64, 1, 0.45],
    [offset + 3, 'guiroShort', 56],
    [offset + 3.5, 'guiroShort', 52],
  ]
}

// Conga tumbao with the signature "cha-cha" two-eighth accent on 4 and 4&
function conga(offset: number): DrumHit[] {
  return [
    [offset + 1, 'congaMute', 74],
    [offset + 3, 'congaHigh', 78],
    [offset + 3.5, 'congaLow', 84],
  ]
}

// Light kick anchor on beat 1
function kick(offset: number): DrumHit[] {
  return [[offset, 'kick', 66]]
}

export const chaCha: StyleDefinition = {
  id: 'cha-cha',
  name: 'Cha-Cha-Chá',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 116, min: 100, max: 130 },

  // Tumbao bass: anticipates on 2& and 4 across the barline, keeping beat 1 empty or light
  bass: {
    mode: 'pattern',
    program: 32,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 1.5, dur: 1.4, tone: '5', vel: 90 },
          { at: 3, dur: 1.4, tone: 'app', vel: 94 },
        ],
        [
          { at: 1.5, dur: 1.4, tone: 'R', vel: 90 },
          { at: 3, dur: 1.4, tone: 'app', vel: 94 },
        ],
        [
          { at: 1.5, dur: 1.4, tone: '5-', vel: 90 },
          { at: 3, dur: 1.4, tone: 'R', vel: 94 },
        ],
        [
          { at: 0, dur: 0.85, tone: 'R', vel: 68 },
          { at: 1.5, dur: 1.4, tone: '5', vel: 90 },
          { at: 3, dur: 1.4, tone: 'app', vel: 94 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 84 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 88 },
          { at: 2, dur: 0.95, tone: 'app', vel: 92 },
        ],
        [
          { at: 1.5, dur: 0.45, tone: '5', vel: 88 },
          { at: 2, dur: 0.95, tone: 'R', vel: 92 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 88 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 86 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 88 },
          { at: 1.5, dur: 0.45, tone: 'app', vel: 90 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R', vel: 90 }]],
    },
  },

  // Piano (GM 0): short cha-cha hits on 1, 2&, 4, 4& (Pattern A) and a light eighth guajeo (Pattern B)
  comp: {
    program: 0,
    voicing: 'close',
    velocity: [62, 80],
    rhythms: {
      '4': [
        [
          [0, 0.38, 74],
          [1.5, 0.38, 72],
          [3, 0.35, 76],
          [3.5, 0.35, 72],
        ],
        [
          [0, 0.36, 72],
          [1, 0.36, 64],
          [1.5, 0.36, 74],
          [2.5, 0.36, 66],
          [3, 0.34, 76],
          [3.5, 0.34, 70],
        ],
      ],
      '3': [
        [
          [0, 0.38, 74],
          [1.5, 0.38, 72],
          [2.5, 0.35, 74],
        ],
        [
          [0, 0.36, 72],
          [1, 0.36, 64],
          [1.5, 0.36, 72],
          [2.5, 0.34, 70],
        ],
      ],
      '2': [
        [
          [0, 0.38, 74],
          [1.5, 0.35, 72],
        ],
        [
          [0, 0.36, 72],
          [1, 0.36, 66],
          [1.5, 0.34, 72],
        ],
      ],
      '1': [[[0, 0.38, 74]]],
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
        {
          bars: 2,
          hits: [...cowbell(0), ...cowbell(4), ...guiro(0), ...guiro(4), ...conga(0), ...conga(4), ...kick(0), ...kick(4)],
        },
        {
          bars: 2,
          hits: [
            ...cowbell(0),
            ...cowbell(4),
            ...guiro(0),
            ...guiro(4),
            ...conga(0),
            ...conga(4),
            ...kick(0),
            ...kick(4),
            [3, 'timbaleHigh', 68],
            [3.5, 'timbaleLow', 72],
            [7, 'timbaleHigh', 68],
            [7.5, 'timbaleLow', 74],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...cowbell(0), ...guiro(0), ...conga(0), ...kick(0), [0, 'crash', 88, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...cowbell(0).slice(0, 2),
            ...guiro(0).slice(0, 3),
            ...kick(0),
            [1, 'congaMute', 74],
            [2, 'timbaleHigh', 76],
            [2.5, 'timbaleLow', 80],
            [3, 'congaHigh', 82],
            [3.25, 'timbaleHigh', 76],
            [3.5, 'congaLow', 86],
            [3.75, 'timbaleLow', 84],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 96, 1, 3],
      [0, 'kick', 86],
      [0, 'cowbell', 78],
      [0, 'congaLow', 80],
    ],
  },
}
