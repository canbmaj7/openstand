import type { DrumHit, StyleDefinition } from '../types'

// Choro: pandeiro 16ths without surdo, 7-string nylon guitar baixaria runs,
// and high close-voiced steel-string cavaquinho syncopations.

// Pandeiro: continuous 16th-note tambourine jingles with low thumb on 1 & 3 and muted slap on 2 & 4
function pandeiro(offset: number): DrumHit[] {
  const jingles = Array.from({ length: 16 }, (_, i): DrumHit => {
    const vel = i % 4 === 3 ? 62 : i % 4 === 2 ? 52 : i % 4 === 0 ? 44 : 30
    return [offset + i / 4, 'tambourine', vel]
  })
  return [
    ...jingles,
    [offset, 'congaLow', 72],
    [offset + 1, 'congaMute', 54],
    [offset + 2, 'congaLow', 72],
    [offset + 3, 'congaMute', 54],
  ]
}

export const choro: StyleDefinition = {
  id: 'choro',
  name: 'Choro',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 100, min: 80, max: 130 },

  // 7-string nylon guitar (GM 24, low register): root on 1, fifth on 2, and short 8th/16th baixaria pickups
  bass: {
    mode: 'pattern',
    program: 24,
    range: [36, 55],
    patterns: {
      '4': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 114 },
          { at: 1, dur: 0.9, tone: '5-', vel: 104 },
          { at: 2, dur: 0.9, tone: 'R', vel: 110 },
          { at: 3, dur: 0.45, tone: '3', vel: 102 },
          { at: 3.5, dur: 0.22, tone: '5', vel: 100 },
          { at: 3.75, dur: 0.22, tone: 'app', vel: 104 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 114 },
          { at: 1, dur: 0.45, tone: '5', vel: 104 },
          { at: 1.5, dur: 0.45, tone: '3', vel: 100 },
          { at: 2, dur: 0.9, tone: 'R', vel: 110 },
          { at: 3, dur: 0.24, tone: '6', vel: 102 },
          { at: 3.25, dur: 0.24, tone: '5', vel: 100 },
          { at: 3.5, dur: 0.24, tone: '3', vel: 100 },
          { at: 3.75, dur: 0.22, tone: 'app', vel: 104 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 114 },
          { at: 1, dur: 0.9, tone: '5-', vel: 104 },
          { at: 2, dur: 0.7, tone: '3', vel: 106 },
          { at: 2.75, dur: 0.22, tone: '5', vel: 100 },
          { at: 3, dur: 0.45, tone: '7', vel: 102 },
          { at: 3.5, dur: 0.45, tone: 'app', vel: 104 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 114 },
          { at: 1, dur: 0.9, tone: '5-', vel: 104 },
          { at: 2, dur: 0.45, tone: '3', vel: 102 },
          { at: 2.5, dur: 0.45, tone: 'app', vel: 102 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 114 },
          { at: 1, dur: 0.45, tone: '5-', vel: 104 },
          { at: 1.5, dur: 0.22, tone: '3', vel: 100 },
          { at: 1.75, dur: 0.22, tone: 'app', vel: 104 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 114 },
          { at: 1, dur: 0.45, tone: '5', vel: 104 },
          { at: 1.5, dur: 0.45, tone: 'app', vel: 102 },
        ],
      ],
      '1': [
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 114 },
          { at: 0.75, dur: 0.22, tone: 'app', vel: 100 },
        ],
      ],
    },
  },

  // Cavaquinho feel: steel-string guitar (GM 25) in high close voicings with short 16th-note syncopations
  comp: {
    program: 25,
    voicing: 'close',
    velocity: [52, 70],
    anticipation: 0.2,
    rhythms: {
      '4': [
        [[0, 0.2, 60], [0.75, 0.22, 66], [1.5, 0.22, 62], [2.25, 0.22, 66], [3, 0.2, 60], [3.75, 0.2, 64]],
        [[0.25, 0.22, 64], [1, 0.2, 58], [1.75, 0.22, 68], [2.5, 0.22, 62], [3.25, 0.22, 66]],
        [[0, 0.2, 60], [0.5, 0.2, 56], [1.25, 0.22, 66], [2, 0.2, 60], [2.75, 0.22, 66], [3.5, 0.22, 62]],
      ],
      '3': [
        [[0, 0.2, 60], [0.75, 0.22, 66], [1.5, 0.22, 62], [2.25, 0.22, 66]],
      ],
      '2': [
        [[0, 0.2, 60], [0.75, 0.22, 66], [1.5, 0.22, 62]],
        [[0.25, 0.22, 64], [1, 0.2, 58], [1.75, 0.2, 66]],
      ],
      '1': [[[0, 0.2, 60], [0.75, 0.2, 66]]],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'sidestick', 84],
      [1, 'sidestick', 68],
      [2, 'sidestick', 68],
      [3, 'sidestick', 68],
    ],
    grooves: {
      middle: [
        { bars: 2, hits: [...pandeiro(0), ...pandeiro(4)] },
        {
          bars: 2,
          hits: [
            ...pandeiro(0),
            ...pandeiro(4),
            [1.75, 'congaHigh', 62, 0.6],
            [5.75, 'congaHigh', 64, 0.6],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...pandeiro(0), [0, 'crash', 76, 1, 1.5]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...pandeiro(0).filter(([at]) => at < 3),
            [3, 'congaHigh', 74],
            [3.25, 'tambourine', 68],
            [3.5, 'congaHigh', 78],
            [3.75, 'tambourine', 74],
          ],
        },
      ],
    },
    ending: [
      [0, 'congaLow', 80],
      [0, 'tambourine', 66],
    ],
  },
}
