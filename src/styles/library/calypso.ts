import type { DrumHit, StyleDefinition } from '../types'

// Steady eighth-note maracas/shaker pulse (GM 70)
function shakerBar(offset: number): DrumHit[] {
  return Array.from({ length: 8 }, (_, i): DrumHit => [offset + i / 2, 'shaker', i % 2 === 0 ? 56 : 46])
}

// Straight eighth hi-hats with light downbeat emphasis
function hatBar(offset: number): DrumHit[] {
  return Array.from({ length: 8 }, (_, i): DrumHit => [offset + i / 2, 'hhClosed', i % 2 === 0 ? 74 : 58])
}

// Syncopated cowbell pattern typical of Trinidadian calypso
function cowbellBar(offset: number): DrumHit[] {
  return [
    [offset, 'cowbell', 74],
    [offset + 1.5, 'cowbell', 68],
    [offset + 2.5, 'cowbell', 64],
    [offset + 3, 'cowbell', 72],
  ]
}

// Two-bar clave pattern for Groove B
const claveTwoBar: DrumHit[] = [0, 1.5, 3, 5, 6.5].map((at): DrumHit => [at, 'claves', 78])

// Groove A: calypso kick on 1, 2&, 3 with syncopated cross-stick
function calypsoKitA(offset: number): DrumHit[] {
  return [
    [offset, 'kick', 94],
    [offset + 1.5, 'kick', 74],
    [offset + 2, 'kick', 90],
    [offset + 1, 'sidestick', 84],
    [offset + 2.5, 'sidestick', 74],
    [offset + 3, 'sidestick', 86],
  ]
}

// Groove B: soca-inflected kick with snare backbeat and ghost cross-stick
function calypsoKitB(offset: number): DrumHit[] {
  return [
    [offset, 'kick', 96],
    [offset + 1.5, 'kick', 78],
    [offset + 2, 'kick', 90],
    [offset + 3.5, 'kick', 72],
    [offset + 1, 'snare', 84],
    [offset + 3, 'snare', 86],
    [offset + 1.5, 'sidestick', 64],
  ]
}

export const calypso: StyleDefinition = {
  id: 'calypso',
  name: 'Calypso',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 118, min: 100, max: 140 },

  // Syncopated Caribbean electric bass on 1, 2&, 3, 4& using root, fifth and octave
  bass: {
    mode: 'pattern',
    program: 33,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.2, tone: 'R', vel: 98 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 90 },
          { at: 2, dur: 1.2, tone: '8', vel: 94 },
          { at: 3.5, dur: 0.45, tone: '5', vel: 88 },
        ],
        [
          { at: 0, dur: 1.35, tone: 'R', vel: 98 },
          { at: 1.5, dur: 1.35, tone: '5', vel: 92 },
          { at: 3, dur: 0.9, tone: '8', vel: 90 },
        ],
        [
          { at: 0, dur: 1.2, tone: 'R', vel: 98 },
          { at: 1.5, dur: 0.45, tone: '3', vel: 88 },
          { at: 2, dur: 1.2, tone: '5', vel: 92 },
          { at: 3.5, dur: 0.45, tone: 'app', vel: 90 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.2, tone: 'R', vel: 98 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 88 },
          { at: 2, dur: 0.9, tone: '8', vel: 92 },
        ],
        [
          { at: 0, dur: 1.2, tone: 'R', vel: 98 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 88 },
          { at: 2, dur: 0.9, tone: 'app', vel: 88 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.2, tone: 'R', vel: 98 },
          { at: 1.5, dur: 0.45, tone: '5', vel: 90 },
        ],
        [
          { at: 0, dur: 1.2, tone: 'R', vel: 98 },
          { at: 1.5, dur: 0.45, tone: 'app', vel: 88 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.85, tone: 'R', vel: 98 }]],
    },
  },

  // Piano (GM 0): bright off-beat syncopated stabs emphasizing 1&, 2&, 3&, 4&
  comp: {
    program: 0,
    voicing: 'close',
    velocity: [64, 86],
    rhythms: {
      '4': [
        [
          [0.5, 0.35, 80],
          [1.5, 0.45, 84],
          [2.5, 0.35, 78],
          [3.5, 0.45, 86],
        ],
        [
          [0, 0.45, 76],
          [1.5, 0.45, 84],
          [2.5, 0.35, 78],
          [3.5, 0.45, 84],
        ],
        [
          [0.5, 0.4, 82],
          [1.5, 0.8, 84],
          [3, 0.35, 74],
          [3.5, 0.45, 86],
        ],
      ],
      '3': [
        [
          [0.5, 0.35, 80],
          [1.5, 0.45, 84],
          [2.5, 0.35, 78],
        ],
        [
          [0, 0.45, 76],
          [1.5, 0.45, 84],
          [2.5, 0.35, 80],
        ],
      ],
      '2': [
        [
          [0.5, 0.35, 80],
          [1.5, 0.45, 84],
        ],
        [
          [0, 0.45, 76],
          [1.5, 0.45, 84],
        ],
      ],
      '1': [[[0.5, 0.35, 82]]],
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
        {
          bars: 2,
          hits: [
            ...shakerBar(0),
            ...shakerBar(4),
            ...hatBar(0),
            ...hatBar(4),
            ...cowbellBar(0),
            ...cowbellBar(4),
            ...calypsoKitA(0),
            ...calypsoKitA(4),
            [7.5, 'hhOpen', 68, 0.35],
          ],
        },
        {
          bars: 2,
          hits: [
            ...shakerBar(0),
            ...shakerBar(4),
            ...hatBar(0),
            ...hatBar(4),
            ...claveTwoBar,
            ...calypsoKitB(0),
            ...calypsoKitB(4),
            [7.5, 'hhOpen', 68, 0.35],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...shakerBar(0), ...hatBar(0).slice(1), ...cowbellBar(0), ...calypsoKitA(0), [0, 'crash', 92, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...shakerBar(0).slice(0, 5),
            ...hatBar(0).slice(0, 5),
            [0, 'kick', 94],
            [1, 'sidestick', 84],
            [1.5, 'kick', 74],
            [2, 'kick', 90],
            [2.5, 'tomHigh', 84],
            [3, 'tomMid', 88],
            [3.5, 'snare', 90],
            [3.75, 'tomLow', 92],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 100, 1, 3],
      [0, 'kick', 96],
      [0, 'cowbell', 82],
    ],
  },
}
