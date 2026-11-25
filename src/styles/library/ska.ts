import type { DrumHit, StyleDefinition } from '../types'

// Driving eighth-note ska hats: crisp closed chick on the beat, short open bark on every "&"
function skaHats(offset: number): DrumHit[] {
  return Array.from({ length: 8 }, (_, i): DrumHit =>
    i % 2 === 0 ? [offset + i / 2, 'hhClosed', 74] : [offset + i / 2, 'hhOpen', 82, 1, 0.25],
  )
}

// Groove A: four-on-the-floor kick with crisp snare backbeat on 2 and 4
function skaKitA(offset: number): DrumHit[] {
  return [
    [offset, 'kick', 98],
    [offset + 1, 'kick', 86],
    [offset + 2, 'kick', 96],
    [offset + 3, 'kick', 86],
    [offset + 1, 'snare', 100],
    [offset + 3, 'snare', 100],
  ]
}

// Groove B: 1 & 3 kick with tight cross-stick backbeat on 2 and 4
function skaKitB(offset: number): DrumHit[] {
  return [
    [offset, 'kick', 100],
    [offset + 2, 'kick', 96],
    [offset + 1, 'sidestick', 96],
    [offset + 3, 'sidestick', 96],
  ]
}

export const ska: StyleDefinition = {
  id: 'ska',
  name: 'Ska',
  family: 'world',
  swing: 0.5,
  tempo: { default: 150, min: 120, max: 180 },

  // Brisk walking-style quarter-note bass lines outlining root, 3rd, 5th and approach
  bass: {
    mode: 'pattern',
    program: 33,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 100 },
          { at: 1, dur: 0.9, tone: '3', vel: 92 },
          { at: 2, dur: 0.9, tone: '5', vel: 94 },
          { at: 3, dur: 0.9, tone: 'app', vel: 90 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 100 },
          { at: 1, dur: 0.9, tone: '3', vel: 92 },
          { at: 2, dur: 0.9, tone: '5', vel: 94 },
          { at: 3, dur: 0.9, tone: '6', vel: 90 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 100 },
          { at: 1, dur: 0.9, tone: '5', vel: 92 },
          { at: 2, dur: 0.9, tone: '8', vel: 94 },
          { at: 3, dur: 0.45, tone: '5', vel: 88 },
          { at: 3.5, dur: 0.45, tone: 'app', vel: 90 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 100 },
          { at: 1, dur: 0.9, tone: '3', vel: 92 },
          { at: 2, dur: 0.9, tone: '5', vel: 94 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 100 },
          { at: 1, dur: 0.9, tone: '5', vel: 92 },
          { at: 2, dur: 0.9, tone: 'app', vel: 90 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 100 },
          { at: 1, dur: 0.9, tone: '5', vel: 92 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 100 },
          { at: 1, dur: 0.9, tone: 'app', vel: 90 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.85, tone: 'R', vel: 100 }]],
    },
  },

  // Acoustic piano (GM 0) playing crisp, even off-beat skank chords on every "&"
  comp: {
    program: 0,
    voicing: 'close',
    velocity: [74, 82],
    rhythms: {
      '4': [
        [
          [0.5, 0.15, 78],
          [1.5, 0.15, 78],
          [2.5, 0.15, 78],
          [3.5, 0.15, 78],
        ],
        [
          [0.5, 0.15, 76],
          [1.5, 0.15, 80],
          [2.5, 0.15, 76],
          [3.5, 0.15, 80],
        ],
      ],
      '3': [
        [
          [0.5, 0.15, 78],
          [1.5, 0.15, 78],
          [2.5, 0.15, 78],
        ],
      ],
      '2': [
        [
          [0.5, 0.15, 78],
          [1.5, 0.15, 78],
        ],
      ],
      '1': [[[0.5, 0.15, 78]]],
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
        { bars: 2, hits: [...skaHats(0), ...skaHats(4), ...skaKitA(0), ...skaKitA(4)] },
        { bars: 2, hits: [...skaHats(0), ...skaHats(4), ...skaKitB(0), ...skaKitB(4)] },
      ],
      first: [
        {
          bars: 1,
          hits: [...skaHats(0).slice(1), [0, 'crash', 98, 1, 2], [0, 'kick', 100], [1, 'snare', 100], [2, 'kick', 96], [3, 'snare', 100]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...skaHats(0).slice(0, 6),
            [0, 'kick', 98],
            [1, 'snare', 100],
            [2, 'kick', 96],
            [3, 'tomHigh', 92],
            [3.5, 'tomMid', 96],
            [3.75, 'snare', 102],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 106, 1, 3],
      [0, 'kick', 104],
      [0, 'snare', 96],
    ],
  },
}
