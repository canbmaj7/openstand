import type { DrumHit, StyleDefinition } from '../types'

// Bongo martillo in straight eighths with an open low bongo tone on beat 4
function martillo(offset: number): DrumHit[] {
  return [
    [offset, 'bongoHigh', 76],
    [offset + 0.5, 'bongoHigh', 48],
    [offset + 1, 'bongoHigh', 70],
    [offset + 1.5, 'bongoHigh', 48],
    [offset + 2, 'bongoHigh', 74],
    [offset + 2.5, 'bongoHigh', 48],
    [offset + 3, 'bongoLow', 82],
    [offset + 3.5, 'bongoHigh', 58],
  ]
}

// Steady güira eighths, slightly accented on the beats
function guira(offset: number): DrumHit[] {
  return Array.from({ length: 8 }, (_, i): DrumHit => [offset + i / 2, 'guiroShort', i % 2 === 0 ? 54 : 40])
}

// Soft kick anchor on beats 1 and 3
function kick(offset: number): DrumHit[] {
  return [
    [offset, 'kick', 66],
    [offset + 2, 'kick', 62],
  ]
}

export const bachata: StyleDefinition = {
  id: 'bachata',
  name: 'Bachata',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 128, min: 110, max: 150 },

  // Electric bass: root on 1, fifth on 2&, root on 3, approach into next chord on 4&
  bass: {
    mode: 'pattern',
    program: 33,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 84 },
          { at: 2, dur: 1.4, tone: 'R', vel: 92 },
          { at: 3.5, dur: 0.45, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5-', vel: 84 },
          { at: 2, dur: 1.4, tone: 'R', vel: 92 },
          { at: 3.5, dur: 0.45, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 84 },
          { at: 2, dur: 1.4, tone: 'R', vel: 92 },
          { at: 3.5, dur: 0.45, tone: '5', vel: 82 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 84 },
          { at: 2, dur: 0.9, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5-', vel: 84 },
          { at: 2, dur: 0.9, tone: 'R', vel: 88 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 94 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 84 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R', vel: 94 }]],
    },
  },

  // Steel-string guitar (GM 25): soft eighth-note requinto-style strokes with a beat-4 accent
  comp: {
    program: 25,
    voicing: 'guitar',
    velocity: [46, 68],
    rhythms: {
      '4': [
        [
          [0, 0.36, 54],
          [0.5, 0.32, 46],
          [1, 0.34, 52],
          [1.5, 0.32, 48],
          [2, 0.36, 54],
          [2.5, 0.32, 46],
          [3, 0.38, 68],
          [3.5, 0.32, 50],
        ],
        [
          [0, 0.38, 56],
          [0.5, 0.32, 46],
          [1.5, 0.34, 50],
          [2, 0.36, 52],
          [2.5, 0.32, 46],
          [3, 0.38, 68],
          [3.5, 0.32, 52],
        ],
      ],
      '3': [
        [
          [0, 0.36, 54],
          [0.5, 0.32, 46],
          [1, 0.34, 52],
          [1.5, 0.32, 48],
          [2, 0.38, 66],
          [2.5, 0.32, 50],
        ],
      ],
      '2': [
        [
          [0, 0.36, 54],
          [0.5, 0.32, 46],
          [1, 0.36, 64],
          [1.5, 0.32, 48],
        ],
      ],
      '1': [
        [
          [0, 0.36, 58],
          [0.5, 0.32, 46],
        ],
      ],
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
        { bars: 2, hits: [...martillo(0), ...martillo(4), ...guira(0), ...guira(4), ...kick(0), ...kick(4)] },
        {
          bars: 2,
          hits: [
            ...martillo(0),
            ...martillo(4),
            ...guira(0),
            ...guira(4),
            ...kick(0),
            ...kick(4),
            [3.5, 'bongoLow', 70],
            [7.5, 'bongoLow', 74],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...martillo(0), ...guira(0), ...kick(0), [0, 'crash', 86, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...martillo(0).filter(([at]) => at < 3),
            ...guira(0),
            ...kick(0),
            [3, 'bongoLow', 84],
            [3.25, 'bongoHigh', 76],
            [3.5, 'bongoLow', 86],
            [3.75, 'bongoHigh', 80],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 94, 1, 3],
      [0, 'kick', 82],
      [0, 'bongoLow', 80],
    ],
  },
}
