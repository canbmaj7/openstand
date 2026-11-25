import type { DrumHit, StyleDefinition } from '../types'

// Straight eighth-note closed hi-hats; Groove B opens the hi-hat on 4& of the second bar
function hats(offset: number, openLast = false): DrumHit[] {
  return Array.from({ length: 8 }, (_, i): DrumHit => {
    const isLast = openLast && i === 7
    return [offset + i / 2, isLast ? 'hhOpen' : 'hhClosed', isLast ? 64 : i % 2 === 0 ? 74 : 54]
  })
}

// Motown tambourine: strong accents locked to the snare on 2 and 4 with light eighth shakes
function tambourine(offset: number): DrumHit[] {
  return Array.from({ length: 8 }, (_, i): DrumHit => {
    const back = i === 2 || i === 6
    return [offset + i / 2, 'tambourine', back ? 76 : i % 2 === 0 ? 46 : 40]
  })
}

// Snare strictly on the backbeat (beats 2 and 4)
function backbeat(offset: number): DrumHit[] {
  return [
    [offset + 1, 'snare', 102],
    [offset + 3, 'snare', 102],
  ]
}

export const soul: StyleDefinition = {
  id: 'soul',
  name: 'Soul',
  family: 'pop',
  swing: 0.5,
  tempo: { default: 100, min: 80, max: 120 },

  // Melodic electric bass (GM 33): root on 1, fifth/octave on 2&, third or root on 3, approach on 4&
  bass: {
    mode: 'pattern',
    program: 33,
    range: [28, 55],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 102 },
          { at: 1.5, dur: 0.42, tone: '5', vel: 88 },
          { at: 2, dur: 1.35, tone: '3', vel: 92 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 102 },
          { at: 1.5, dur: 0.42, tone: '8', vel: 90 },
          { at: 2, dur: 0.9, tone: 'R', vel: 94 },
          { at: 3, dur: 0.42, tone: '6', vel: 86 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 102 },
          { at: 1, dur: 0.42, tone: '5', vel: 86 },
          { at: 1.5, dur: 0.42, tone: '8', vel: 90 },
          { at: 2, dur: 0.9, tone: '3', vel: 92 },
          { at: 3, dur: 0.42, tone: '5', vel: 88 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 102 },
          { at: 1.5, dur: 0.42, tone: '5', vel: 88 },
          { at: 2, dur: 0.45, tone: '3', vel: 92 },
          { at: 2.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 102 },
          { at: 1, dur: 0.42, tone: '5', vel: 88 },
          { at: 1.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 102 },
          { at: 1.5, dur: 0.42, tone: '8', vel: 88 },
        ],
      ],
      '1': [
        [
          { at: 0, dur: 0.45, tone: 'R', vel: 102 },
          { at: 0.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [{ at: 0, dur: 0.9, tone: 'R', vel: 102 }],
      ],
    },
  },

  // Electric piano (GM 4): long beat-1 anchor + short crisp backbeat chicks on 2 & 4; Pattern B plays light eighths
  comp: {
    program: 4,
    voicing: 'close',
    velocity: [56, 78],
    rhythms: {
      '4': [
        [
          [0, 0.9, 72],
          [1, 0.22, 76],
          [3, 0.22, 76],
        ],
        [
          [0, 0.42, 68],
          [0.5, 0.35, 56],
          [1, 0.42, 72],
          [1.5, 0.35, 56],
          [2, 0.42, 66],
          [2.5, 0.35, 56],
          [3, 0.42, 72],
          [3.5, 0.35, 56],
        ],
      ],
      '3': [
        [
          [0, 0.9, 72],
          [1, 0.22, 76],
          [2, 0.22, 74],
        ],
        [
          [0, 0.42, 68],
          [0.5, 0.35, 56],
          [1, 0.42, 72],
          [1.5, 0.35, 56],
          [2, 0.42, 68],
          [2.5, 0.35, 56],
        ],
      ],
      '2': [
        [
          [0, 0.9, 72],
          [1, 0.22, 76],
        ],
        [
          [0, 0.42, 68],
          [0.5, 0.35, 56],
          [1, 0.42, 72],
          [1.5, 0.35, 56],
        ],
      ],
      '1': [
        [[0, 0.85, 72]],
        [
          [0, 0.42, 68],
          [0.5, 0.35, 56],
        ],
      ],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'hhClosed', 90],
      [1, 'hhClosed', 80],
      [2, 'hhClosed', 80],
      [3, 'hhClosed', 80],
    ],
    grooves: {
      middle: [
        {
          bars: 2,
          hits: [
            ...hats(0),
            ...hats(4),
            ...tambourine(0),
            ...tambourine(4),
            ...backbeat(0),
            ...backbeat(4),
            [0, 'kick', 104],
            [1.5, 'kick', 86],
            [2, 'kick', 94],
            [4, 'kick', 104],
            [6, 'kick', 94],
            [6.5, 'kick', 86],
          ],
        },
        {
          bars: 2,
          hits: [
            ...hats(0),
            ...hats(4, true),
            ...tambourine(0),
            ...tambourine(4),
            ...backbeat(0),
            ...backbeat(4),
            [0, 'kick', 104],
            [0.75, 'kick', 78, 0.55],
            [2, 'kick', 94],
            [2.5, 'kick', 86],
            [4, 'kick', 104],
            [5.5, 'kick', 84],
            [6, 'kick', 96],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [
            ...hats(0).slice(1),
            ...tambourine(0),
            ...backbeat(0),
            [0, 'crash', 96, 1, 2],
            [0, 'kick', 104],
            [1.5, 'kick', 86],
            [2, 'kick', 94],
          ],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...hats(0).slice(0, 6),
            ...tambourine(0).slice(0, 6),
            ...backbeat(0),
            [0, 'kick', 104],
            [1.5, 'kick', 86],
            [2, 'kick', 94],
            [3, 'tomHigh', 90],
            [3.5, 'tomMid', 94],
            [3.75, 'tomLow', 98],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 104, 1, 3],
      [0, 'kick', 106],
      [0, 'snare', 96],
      [0, 'tambourine', 82],
    ],
  },
}
