import type { DrumHit, StyleDefinition } from '../types'

// Straight eighth-note hi-hats; Groove B opens the hi-hat on the "and" of 4
function hats(offset: number, openFourAnd = false): DrumHit[] {
  return Array.from({ length: 8 }, (_, i): DrumHit => {
    const drum = openFourAnd && i === 7 ? 'hhOpen' : 'hhClosed'
    const vel = drum === 'hhOpen' ? 68 : i % 2 === 0 ? 78 : 54
    return [offset + i / 2, drum, vel]
  })
}

// Strong backbeat on 2 and 4 with low-velocity 16th-note ghost snares
function snare(offset: number): DrumHit[] {
  return [
    [offset + 1, 'snare', 106],
    [offset + 3, 'snare', 106],
    [offset + 0.75, 'snare', 28, 0.55],
    [offset + 1.75, 'snare', 32],
    [offset + 2.25, 'snare', 28, 0.6],
    [offset + 3.75, 'snare', 34, 0.75],
  ]
}

export const gospel: StyleDefinition = {
  id: 'gospel',
  name: 'Gospel',
  family: 'pop',
  // Gentle swing pocket on the eighths without losing crisp 16th-note ghost notes
  swing: 0.56,
  tempo: { default: 96, min: 70, max: 130 },

  bass: {
    mode: 'pattern',
    program: 33, // fingered electric bass
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 102 },
          { at: 1.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 2, dur: 1.35, tone: '5', vel: 94 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 102 },
          { at: 1.5, dur: 0.4, tone: 'R', vel: 84 },
          { at: 2, dur: 0.9, tone: '5', vel: 94 },
          { at: 3, dur: 0.4, tone: '8', vel: 88 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 102 },
          { at: 1.5, dur: 0.4, tone: '3', vel: 86 },
          { at: 2, dur: 0.9, tone: '5', vel: 94 },
          { at: 3, dur: 0.4, tone: '6', vel: 86 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 102 },
          { at: 1.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 2, dur: 0.45, tone: '5', vel: 92 },
          { at: 2.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 102 },
          { at: 1.5, dur: 0.42, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 102 },
          { at: 1, dur: 0.42, tone: '8', vel: 88 },
          { at: 1.5, dur: 0.42, tone: '5', vel: 86 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.85, tone: 'R', vel: 102 }]],
    },
  },

  comp: {
    program: 0, // acoustic piano
    voicing: 'close',
    velocity: [62, 84],
    anticipation: 0.15,
    rhythms: {
      '4': [
        // Pattern A: full chord on 1, short rhythmic stabs on 2& and 3, accented push on 4&
        [
          [0, 1.35, 76],
          [1.5, 0.35, 72],
          [2, 0.45, 74],
          [3.5, 0.42, 82],
        ],
        // Pattern B: sparser half-note anchors on 1 and 3
        [
          [0, 1.75, 76],
          [2, 1.45, 70],
        ],
      ],
      '3': [
        [
          [0, 1.35, 76],
          [1.5, 0.35, 72],
          [2, 0.45, 74],
          [2.5, 0.4, 80],
        ],
        [
          [0, 1.75, 76],
          [2, 0.85, 70],
        ],
      ],
      '2': [
        [
          [0, 1.35, 76],
          [1.5, 0.4, 80],
        ],
        [[0, 1.75, 76]],
      ],
      '1': [[[0, 0.85, 76]]],
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
            ...snare(0),
            ...snare(4),
            [0, 'kick', 104],
            [1.5, 'kick', 90],
            [2, 'kick', 94],
            [4, 'kick', 104],
            [5.5, 'kick', 92],
            [6, 'kick', 94],
            [6.75, 'kick', 78, 0.45],
          ],
        },
        {
          bars: 2,
          hits: [
            ...hats(0, true),
            ...hats(4, true),
            ...snare(0),
            ...snare(4),
            [0, 'kick', 104],
            [1.5, 'kick', 92],
            [2, 'kick', 92],
            [4, 'kick', 104],
            [5.5, 'kick', 92],
            [6, 'kick', 94],
            [6.5, 'kick', 82, 0.6],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...hats(0).slice(1), ...snare(0), [0, 'crash', 98, 1, 2], [0, 'kick', 106], [1.5, 'kick', 90], [2, 'kick', 94]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...hats(0).slice(0, 6),
            [0, 'kick', 104],
            [1, 'snare', 106],
            [1.5, 'kick', 90],
            [1.75, 'snare', 32],
            [2, 'kick', 94],
            [2.5, 'snare', 84],
            [3, 'snare', 92],
            [3.25, 'tomHigh', 90],
            [3.5, 'tomMid', 96],
            [3.75, 'tomLow', 102],
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
