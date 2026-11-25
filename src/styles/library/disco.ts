import type { DrumHit, StyleDefinition } from '../types'

// Classic disco hi-hat: closed on the beats, open sizzling on every "&";
// Groove B adds 16th-note closed hi-hat subdivisions in between.
function hats(offset: number, sixteenths = false): DrumHit[] {
  const hits: DrumHit[] = []
  for (let b = 0; b < 4; b++) {
    hits.push([offset + b, 'hhClosed', b % 2 === 0 ? 78 : 70])
    hits.push([offset + b + 0.5, 'hhOpen', 70, 1, 0.35])
    if (sixteenths) {
      hits.push([offset + b + 0.25, 'hhClosed', 44])
      hits.push([offset + b + 0.75, 'hhClosed', 36, 0.75])
    }
  }
  return hits
}

function fourOnTheFloor(offset: number): DrumHit[] {
  return [
    [offset, 'kick', 104],
    [offset + 1, 'kick', 98],
    [offset + 2, 'kick', 102],
    [offset + 3, 'kick', 98],
  ]
}

function backbeat(offset: number): DrumHit[] {
  return [
    [offset + 1, 'snare', 102],
    [offset + 1, 'clap', 74],
    [offset + 3, 'snare', 102],
    [offset + 3, 'clap', 74],
  ]
}

export const disco: StyleDefinition = {
  id: 'disco',
  name: 'Disco',
  family: 'pop',
  swing: 0.5,
  tempo: { default: 118, min: 105, max: 130 },

  // Fingered electric bass (GM 33) playing eighth-note root-octave jumps
  bass: {
    mode: 'pattern',
    program: 33,
    range: [28, 55],
    patterns: {
      '4': [
        [
          { at: 0, dur: 0.4, tone: 'R', vel: 102 },
          { at: 0.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 1, dur: 0.4, tone: 'R', vel: 96 },
          { at: 1.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 2, dur: 0.4, tone: 'R', vel: 98 },
          { at: 2.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 3, dur: 0.4, tone: 'R', vel: 96 },
          { at: 3.5, dur: 0.4, tone: '8', vel: 88 },
        ],
        [
          { at: 0, dur: 0.4, tone: 'R', vel: 102 },
          { at: 0.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 1, dur: 0.4, tone: 'R', vel: 96 },
          { at: 1.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 2, dur: 0.4, tone: 'R', vel: 98 },
          { at: 2.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 3, dur: 0.4, tone: '5', vel: 90 },
          { at: 3.5, dur: 0.4, tone: 'app', vel: 86 },
        ],
        [
          { at: 0, dur: 0.4, tone: 'R', vel: 102 },
          { at: 0.75, dur: 0.2, tone: 'R', vel: 82 },
          { at: 1, dur: 0.4, tone: '8', vel: 90 },
          { at: 1.5, dur: 0.4, tone: 'R', vel: 92 },
          { at: 2, dur: 0.4, tone: 'R', vel: 98 },
          { at: 2.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 3, dur: 0.4, tone: '7', vel: 88 },
          { at: 3.5, dur: 0.4, tone: 'app', vel: 86 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 0.4, tone: 'R', vel: 102 },
          { at: 0.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 1, dur: 0.4, tone: 'R', vel: 96 },
          { at: 1.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 2, dur: 0.4, tone: 'R', vel: 96 },
          { at: 2.5, dur: 0.4, tone: 'app', vel: 86 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 0.4, tone: 'R', vel: 102 },
          { at: 0.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 1, dur: 0.4, tone: 'R', vel: 96 },
          { at: 1.5, dur: 0.4, tone: '8', vel: 88 },
        ],
        [
          { at: 0, dur: 0.4, tone: 'R', vel: 102 },
          { at: 0.5, dur: 0.4, tone: '8', vel: 88 },
          { at: 1, dur: 0.4, tone: '5', vel: 90 },
          { at: 1.5, dur: 0.4, tone: 'app', vel: 86 },
        ],
      ],
      '1': [
        [
          { at: 0, dur: 0.4, tone: 'R', vel: 102 },
          { at: 0.5, dur: 0.4, tone: '8', vel: 88 },
        ],
      ],
    },
  },

  // Clean electric guitar (GM 27): short 16th-note "chank" strums centered on 2& and 4&
  comp: {
    program: 27,
    voicing: 'guitar',
    velocity: [68, 88],
    rhythms: {
      '4': [
        [
          [0.5, 0.16, 76],
          [1.5, 0.18, 90],
          [1.75, 0.14, 74],
          [2.5, 0.16, 76],
          [3.5, 0.18, 90],
          [3.75, 0.14, 74],
        ],
        [
          [0, 0.16, 78],
          [1.5, 0.18, 90],
          [2.25, 0.14, 72],
          [2.75, 0.14, 76],
          [3.5, 0.18, 90],
        ],
        [
          [0, 0.22, 80],
          [1.5, 0.18, 90],
          [3.5, 0.18, 90],
          [3.75, 0.14, 74],
        ],
      ],
      '3': [
        [
          [0.5, 0.16, 76],
          [1.5, 0.18, 90],
          [2.5, 0.18, 88],
        ],
        [
          [0, 0.2, 78],
          [1.5, 0.18, 90],
          [2.5, 0.18, 88],
        ],
      ],
      '2': [
        [
          [0.5, 0.16, 76],
          [1.5, 0.18, 90],
        ],
        [
          [0, 0.2, 78],
          [1.5, 0.18, 90],
          [1.75, 0.14, 74],
        ],
      ],
      '1': [[[0.5, 0.18, 86]], [[0, 0.2, 82]]],
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
          hits: [...hats(0), ...hats(4), ...fourOnTheFloor(0), ...fourOnTheFloor(4), ...backbeat(0), ...backbeat(4)],
        },
        {
          bars: 2,
          hits: [
            ...hats(0, true),
            ...hats(4, true),
            ...fourOnTheFloor(0),
            ...fourOnTheFloor(4),
            ...backbeat(0),
            ...backbeat(4),
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...hats(0).slice(1), ...fourOnTheFloor(0), ...backbeat(0), [0, 'crash', 98, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...hats(0).slice(0, 4),
            ...fourOnTheFloor(0),
            [1, 'snare', 102],
            [1, 'clap', 74],
            [2.5, 'snare', 84],
            [3, 'snare', 92],
            [3.25, 'tomHigh', 94],
            [3.5, 'tomMid', 98],
            [3.75, 'tomLow', 102],
          ],
        },
        {
          bars: 1,
          hits: [...hats(0), ...fourOnTheFloor(0), ...backbeat(0), [3.5, 'snare', 92], [3.75, 'snare', 100]],
        },
      ],
    },
    ending: [
      [0, 'crash', 108, 1, 3],
      [0, 'kick', 108],
      [0, 'snare', 98],
      [0, 'clap', 78],
    ],
  },
}
