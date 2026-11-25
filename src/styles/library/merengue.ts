import type { DrumHit, StyleDefinition } from '../types'

// Tambora mapped to congas/toms: bass tone on 1, slap on 2, and 16th-note pickup roll at 3.5-3.75
function tambora(offset: number): DrumHit[] {
  return [
    [offset, 'congaLow', 84],
    [offset + 1, 'congaMute', 74],
    [offset + 1.5, 'congaHigh', 66],
    [offset + 2, 'congaLow', 78],
    [offset + 3, 'congaHigh', 74],
    [offset + 3.5, 'tomLow', 76],
    [offset + 3.75, 'congaHigh', 82],
  ]
}

// Continuous güira eighths: long scrape on beats 1 and 3, crisp short strokes elsewhere
function guira(offset: number): DrumHit[] {
  return Array.from({ length: 8 }, (_, i): DrumHit => {
    const at = offset + i / 2
    if (i === 0 || i === 4) return [at, 'guiroLong', i === 0 ? 68 : 64, 1, 0.42]
    return [at, 'guiroShort', i % 2 === 0 ? 54 : 46]
  })
}

// Light four-on-the-floor kick pulse
function kick(offset: number): DrumHit[] {
  return [
    [offset, 'kick', 66],
    [offset + 1, 'kick', 58],
    [offset + 2, 'kick', 64],
    [offset + 3, 'kick', 58],
  ]
}

export const merengue: StyleDefinition = {
  id: 'merengue',
  name: 'Merengue',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 150, min: 120, max: 170 },

  // Fast 1-5 bass alternation with eighth-note pickups (1, 2, 2&, 3, 4, 4&)
  bass: {
    mode: 'pattern',
    program: 33,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 0.85, tone: 'R', vel: 96 },
          { at: 1, dur: 0.42, tone: '5', vel: 84 },
          { at: 1.5, dur: 0.42, tone: 'R', vel: 88 },
          { at: 2, dur: 0.85, tone: 'R', vel: 94 },
          { at: 3, dur: 0.42, tone: '5', vel: 84 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 0.85, tone: 'R', vel: 96 },
          { at: 1, dur: 0.42, tone: '5-', vel: 84 },
          { at: 1.5, dur: 0.42, tone: 'R', vel: 88 },
          { at: 2, dur: 0.85, tone: 'R', vel: 94 },
          { at: 3, dur: 0.42, tone: '5-', vel: 84 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 0.85, tone: 'R', vel: 96 },
          { at: 1, dur: 0.42, tone: '5', vel: 84 },
          { at: 1.5, dur: 0.42, tone: 'R', vel: 88 },
          { at: 2, dur: 0.85, tone: 'R', vel: 94 },
          { at: 3, dur: 0.42, tone: '5', vel: 84 },
          { at: 3.5, dur: 0.42, tone: '5', vel: 82 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 0.85, tone: 'R', vel: 96 },
          { at: 1, dur: 0.42, tone: '5', vel: 84 },
          { at: 1.5, dur: 0.42, tone: 'R', vel: 88 },
          { at: 2, dur: 0.45, tone: '5', vel: 86 },
          { at: 2.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 0.85, tone: 'R', vel: 96 },
          { at: 1, dur: 0.42, tone: '5', vel: 84 },
          { at: 1.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 0.85, tone: 'R', vel: 96 },
          { at: 1, dur: 0.42, tone: '5', vel: 84 },
          { at: 1.5, dur: 0.42, tone: 'R', vel: 86 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R', vel: 96 }]],
    },
  },

  // Piano (GM 0): short hits on 1, 2&, 4& (Pattern A) and a light eighth guajeo (Pattern B)
  comp: {
    program: 0,
    voicing: 'close',
    velocity: [60, 80],
    rhythms: {
      '4': [
        [
          [0, 0.35, 72],
          [1.5, 0.35, 74],
          [3.5, 0.35, 74],
        ],
        [
          [0, 0.32, 68],
          [1, 0.32, 62],
          [1.5, 0.32, 70],
          [2.5, 0.32, 64],
          [3, 0.32, 70],
          [3.5, 0.32, 68],
        ],
      ],
      '3': [
        [
          [0, 0.35, 72],
          [1.5, 0.35, 74],
          [2.5, 0.35, 72],
        ],
        [
          [0, 0.32, 68],
          [1, 0.32, 62],
          [1.5, 0.32, 70],
          [2.5, 0.32, 66],
        ],
      ],
      '2': [
        [
          [0, 0.35, 72],
          [1.5, 0.35, 74],
        ],
        [
          [0, 0.32, 68],
          [1, 0.32, 62],
          [1.5, 0.32, 70],
        ],
      ],
      '1': [[[0, 0.35, 72]]],
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
        { bars: 2, hits: [...tambora(0), ...tambora(4), ...guira(0), ...guira(4), ...kick(0), ...kick(4)] },
        {
          bars: 2,
          hits: [
            ...tambora(0),
            ...tambora(4),
            ...guira(0),
            ...guira(4),
            ...kick(0),
            ...kick(4),
            [3.25, 'congaHigh', 68],
            [7.25, 'congaHigh', 72],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...tambora(0), ...guira(0), ...kick(0), [0, 'crash', 90, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...tambora(0).filter(([at]) => at < 3),
            ...guira(0),
            ...kick(0),
            [3, 'congaHigh', 80],
            [3.25, 'tomLow', 78],
            [3.5, 'congaLow', 84],
            [3.75, 'congaHigh', 86],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 96, 1, 3],
      [0, 'kick', 86],
      [0, 'congaLow', 84],
    ],
  },
}
