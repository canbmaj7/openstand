import type { DrumHit, StyleDefinition } from '../types'

// Exact quarter-note triplet step; engine's toTicks rounds beats * 480 to exact 160-tick subdivisions
const T = 1 / 3

function tripletCymbal(offset: number, drum: 'hhClosed' | 'ride'): DrumHit[] {
  const hits: DrumHit[] = []
  for (let b = 0; b < 4; b++) {
    hits.push([offset + b, drum, b % 2 === 0 ? 84 : 76])
    hits.push([offset + b + T, drum, 54])
    hits.push([offset + b + 2 * T, drum, 62])
  }
  return hits
}

function grooveBar(offset: number, drum: 'hhClosed' | 'ride', bar2 = false): DrumHit[] {
  const hits: DrumHit[] = [
    ...tripletCymbal(offset, drum),
    [offset + 1, 'snare', 106],
    [offset + 3, 'snare', 106],
    [offset, 'kick', 104],
    [offset + 2, 'kick', 98],
    [offset + 2 + 2 * T, 'kick', 82],
  ]
  if (drum === 'ride') {
    hits.push([offset + 1, 'hhPedal', 62], [offset + 3, 'hhPedal', 62])
  }
  if (bar2) {
    hits.push([offset + 1 + 2 * T, 'kick', 76, 0.5], [offset + 3 + 2 * T, 'kick', 80, 0.5])
  }
  return hits
}

const tripletPiano = (beats: number): [number, number, number][] =>
  Array.from({ length: beats }, (_, b): [number, number, number][] => [
    [b, b === 0 ? 0.95 : 0.3, b === 0 ? 76 : 68],
    [b + T, 0.28, 64],
    [b + 2 * T, 0.28, 66],
  ]).flat()

export const rock128: StyleDefinition = {
  id: 'rock-12-8',
  name: 'Rock 12/8',
  family: 'pop',
  // Keep straight 0.5 so explicit 1/3 and 2/3 triplet positions are preserved untouched
  swing: 0.5,
  tempo: { default: 66, min: 50, max: 80 },

  // Fingered electric bass (GM 33): long roots with triplet pickups and approaches
  bass: {
    mode: 'pattern',
    program: 33,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.5, tone: 'R', vel: 102 },
          { at: 1 + 2 * T, dur: 0.3, tone: 'R', vel: 82 },
          { at: 2, dur: 1.5, tone: 'R', vel: 96 },
          { at: 3 + 2 * T, dur: 0.3, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 1.5, tone: 'R', vel: 102 },
          { at: 1 + 2 * T, dur: 0.3, tone: '5-', vel: 82 },
          { at: 2, dur: 0.9, tone: 'R', vel: 96 },
          { at: 3, dur: 0.6, tone: '5', vel: 88 },
          { at: 3 + 2 * T, dur: 0.3, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 2.5, tone: 'R', vel: 102 },
          { at: 2 + 2 * T, dur: 0.3, tone: '5', vel: 84 },
          { at: 3, dur: 0.6, tone: 'R', vel: 92 },
          { at: 3 + 2 * T, dur: 0.3, tone: 'app', vel: 86 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.5, tone: 'R', vel: 102 },
          { at: 1 + 2 * T, dur: 0.3, tone: 'R', vel: 82 },
          { at: 2, dur: 0.6, tone: 'R', vel: 94 },
          { at: 2 + 2 * T, dur: 0.3, tone: 'app', vel: 86 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.5, tone: 'R', vel: 102 },
          { at: 1 + 2 * T, dur: 0.3, tone: 'app', vel: 84 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 102 },
          { at: 1, dur: 0.6, tone: '5', vel: 88 },
          { at: 1 + 2 * T, dur: 0.3, tone: 'app', vel: 84 },
        ],
      ],
      '1': [
        [
          { at: 0, dur: 0.6, tone: 'R', vel: 102 },
          { at: 2 * T, dur: 0.3, tone: 'app', vel: 84 },
        ],
        [{ at: 0, dur: 0.9, tone: 'R', vel: 102 }],
      ],
    },
  },

  // Acoustic piano (GM 0): sustained beat-1 anchor with even 12/8 rock triplets, or broad 1 & 3 power-block chords
  comp: {
    program: 0,
    voicing: 'close',
    velocity: [62, 80],
    pedal: true,
    rhythms: {
      '4': [
        tripletPiano(4),
        [
          [0, 1.9, 78],
          [2, 1.9, 74],
        ],
      ],
      '3': [
        tripletPiano(3),
        [
          [0, 1.9, 78],
          [2, 0.95, 72],
        ],
      ],
      '2': [tripletPiano(2), [[0, 1.9, 78]]],
      '1': [[[0, 0.95, 76]], tripletPiano(1)],
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
          hits: [...grooveBar(0, 'hhClosed'), ...grooveBar(4, 'hhClosed', true)],
        },
        {
          bars: 2,
          hits: [...grooveBar(0, 'ride'), ...grooveBar(4, 'ride', true)],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...grooveBar(0, 'hhClosed'), [0, 'crash', 98, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...tripletCymbal(0, 'hhClosed').filter(([at]) => at < 2),
            [0, 'kick', 104],
            [1, 'snare', 106],
            [2, 'kick', 98],
            [2 + T, 'snare', 86],
            [2 + 2 * T, 'snare', 92],
            [3, 'tomHigh', 96],
            [3 + T, 'tomMid', 98],
            [3 + 2 * T, 'tomLow', 104],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 108, 1, 3],
      [0, 'kick', 106],
      [0, 'snare', 100],
    ],
  },
}
