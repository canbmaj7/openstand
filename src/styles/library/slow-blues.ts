import type { DrumHit, StyleDefinition } from '../types'

// Exact quarter-note triplet step; engine's toTicks rounds beats * 480 to exact 160-tick subdivisions
const T = 1 / 3

function tripletCymbal(offset: number, drum: 'ride' | 'hhClosed'): DrumHit[] {
  const hits: DrumHit[] = []
  for (let b = 0; b < 4; b++) {
    const down = b % 2 === 0 ? 80 : 74
    hits.push([offset + b, drum, down])
    hits.push([offset + b + T, drum, 50])
    hits.push([offset + b + 2 * T, drum, 58])
  }
  return hits
}

function grooveBar(offset: number, drum: 'ride' | 'hhClosed', bar2 = false): DrumHit[] {
  const hits: DrumHit[] = [
    ...tripletCymbal(offset, drum),
    [offset + 1, 'snare', 98],
    [offset + 3, 'snare', 98],
    [offset, 'kick', 98],
    [offset + 2, 'kick', 90],
    [offset + 2 + 2 * T, 'kick', 68, 0.45],
  ]
  if (drum === 'ride') {
    hits.push([offset + 1, 'hhPedal', 60], [offset + 3, 'hhPedal', 60])
  } else {
    hits.push([offset + 1 + 2 * T, 'snare', 32, 0.35])
  }
  if (bar2) {
    hits.push([offset + 3 + 2 * T, 'kick', 70, 0.35])
  }
  return hits
}

export const slowBlues: StyleDefinition = {
  id: 'slow-blues',
  name: 'Slow Blues',
  family: 'pop',
  // Keep straight 0.5 so explicit 1/3 and 2/3 triplet positions are preserved untouched
  swing: 0.5,
  tempo: { default: 64, min: 50, max: 80 },

  bass: {
    mode: 'pattern',
    program: 33, // fingered electric bass
    range: [28, 52],
    patterns: {
      '4': [
        // Classic 12/8 root-fifth groove with triplet pickups
        [
          { at: 0, dur: 1.5, tone: 'R', vel: 100 },
          { at: 1 + 2 * T, dur: 0.3, tone: 'R', vel: 76 },
          { at: 2, dur: 1.5, tone: '5', vel: 92 },
          { at: 3 + 2 * T, dur: 0.3, tone: 'app', vel: 84 },
        ],
        // Walking triplet pickup via the 3rd and 6th
        [
          { at: 0, dur: 1.5, tone: 'R', vel: 100 },
          { at: 1 + 2 * T, dur: 0.3, tone: '3', vel: 78 },
          { at: 2, dur: 0.9, tone: '5', vel: 92 },
          { at: 3, dur: 0.6, tone: '6', vel: 86 },
          { at: 3 + 2 * T, dur: 0.3, tone: 'app', vel: 84 },
        ],
        // Root on 3 with low-fifth pickup
        [
          { at: 0, dur: 1.5, tone: 'R', vel: 100 },
          { at: 1 + 2 * T, dur: 0.3, tone: '5-', vel: 78 },
          { at: 2, dur: 1.5, tone: 'R', vel: 94 },
          { at: 3 + 2 * T, dur: 0.3, tone: 'app', vel: 84 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.5, tone: 'R', vel: 100 },
          { at: 1 + 2 * T, dur: 0.3, tone: '5', vel: 80 },
          { at: 2, dur: 0.6, tone: '5', vel: 90 },
          { at: 2 + 2 * T, dur: 0.3, tone: 'app', vel: 84 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.5, tone: 'R', vel: 100 },
          { at: 1 + 2 * T, dur: 0.3, tone: 'app', vel: 82 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 100 },
          { at: 1, dur: 0.6, tone: '5', vel: 90 },
          { at: 1 + 2 * T, dur: 0.3, tone: 'app', vel: 82 },
        ],
      ],
      '1': [
        [
          { at: 0, dur: 0.6, tone: 'R', vel: 100 },
          { at: 2 * T, dur: 0.3, tone: 'app', vel: 82 },
        ],
        [{ at: 0, dur: 0.9, tone: 'R', vel: 100 }],
      ],
    },
  },

  comp: {
    program: 0, // acoustic piano
    voicing: 'close',
    velocity: [54, 74],
    anticipation: 0.1,
    pedal: true,
    rhythms: {
      '4': [
        // Pattern A: 12/8 triplet piano comp (beat 1 anchored, light 2nd and 3rd triplets)
        [0, 1, 2, 3].flatMap((b) => [
          [b, b === 0 ? 0.32 : 0.28, b === 0 ? 72 : b === 2 ? 66 : 62] as [number, number, number],
          [b + T, 0.2, 48] as [number, number, number],
          [b + 2 * T, 0.2, 54] as [number, number, number],
        ]),
        // Pattern B: sustained chords on 1 and 3 with short triplet answers on 2&3 and 4&3
        [
          [0, 1.45, 72],
          [1 + 2 * T, 0.24, 58],
          [2, 1.45, 68],
          [3 + 2 * T, 0.24, 58],
        ],
      ],
      '3': [
        [0, 1, 2].flatMap((b) => [
          [b, b === 0 ? 0.32 : 0.28, b === 0 ? 72 : 62] as [number, number, number],
          [b + T, 0.2, 48] as [number, number, number],
          [b + 2 * T, 0.2, 54] as [number, number, number],
        ]),
        [
          [0, 1.45, 72],
          [1 + 2 * T, 0.24, 58],
          [2, 0.85, 68],
        ],
      ],
      '2': [
        [0, 1].flatMap((b) => [
          [b, b === 0 ? 0.32 : 0.28, b === 0 ? 72 : 62] as [number, number, number],
          [b + T, 0.2, 48] as [number, number, number],
          [b + 2 * T, 0.2, 54] as [number, number, number],
        ]),
        [
          [0, 1.45, 72],
          [1 + 2 * T, 0.24, 58],
        ],
      ],
      '1': [[[0, 0.9, 70]]],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'hhClosed', 88],
      [1, 'hhClosed', 78],
      [2, 'hhClosed', 78],
      [3, 'hhClosed', 78],
    ],
    grooves: {
      middle: [
        {
          bars: 2,
          hits: [...grooveBar(0, 'ride'), ...grooveBar(4, 'ride', true)],
        },
        {
          bars: 2,
          hits: [...grooveBar(0, 'hhClosed'), ...grooveBar(4, 'hhClosed', true)],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...grooveBar(0, 'ride'), [0, 'crash', 94, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...tripletCymbal(0, 'ride').filter(([at]) => at < 2),
            [0, 'kick', 98],
            [1, 'snare', 98],
            [1, 'hhPedal', 60],
            [2, 'kick', 90],
            [2 + T, 'snare', 72],
            [2 + 2 * T, 'snare', 80],
            [3, 'snare', 90],
            [3 + T, 'tomMid', 92],
            [3 + 2 * T, 'tomLow', 96],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 104, 1, 3],
      [0, 'kick', 102],
      [0, 'snare', 92],
    ],
  },
}
