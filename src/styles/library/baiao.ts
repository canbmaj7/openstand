import type { DrumHit, StyleDefinition } from '../types'

// Baião (Northeast Brazil): zabumba drum, open/muted triangle sixteenths, and accordion.
// Each 4/4 bar holds two 2/4 baião cells (beats 1-2 and 3-4).

// Triangle 16ths: open on the eighths, muted on the sixteenths in between
function triangle(offset: number): DrumHit[] {
  return Array.from({ length: 16 }, (_, i): DrumHit => {
    const open = i % 2 === 0
    const vel = open ? (i % 4 === 2 ? 66 : 54) : 40
    return [offset + i / 4, open ? 'triangleOpen' : 'triangleMute', vel]
  })
}

// Zabumba: low head on 1, 16th before 2 (0.75) and 2; bacalhau stick on the "and" of 2 (1.5)
function zabumba(offset: number): DrumHit[] {
  return [
    [offset, 'kick', 88],
    [offset + 0.75, 'tomLow', 76],
    [offset + 1, 'kick', 82],
    [offset + 1.5, 'sidestick', 72],
    [offset + 2, 'kick', 88],
    [offset + 2.75, 'tomLow', 76],
    [offset + 3, 'kick', 82],
    [offset + 3.5, 'sidestick', 72],
  ]
}

export const baiao: StyleDefinition = {
  id: 'baiao',
  name: 'Baião',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 120, min: 100, max: 140 },

  // Baião bass: dotted eighth on 1 (0 -> 0.75), 16th pickup to beat 2, and octave/root motion
  bass: {
    mode: 'pattern',
    program: 32,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 96 },
          { at: 0.75, dur: 0.22, tone: '5', vel: 84 },
          { at: 1, dur: 0.85, tone: '8', vel: 90 },
          { at: 2, dur: 0.7, tone: 'R', vel: 94 },
          { at: 2.75, dur: 0.22, tone: '5', vel: 84 },
          { at: 3, dur: 0.85, tone: '8', vel: 90 },
        ],
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 96 },
          { at: 0.75, dur: 0.22, tone: '5-', vel: 84 },
          { at: 1, dur: 0.85, tone: '8', vel: 90 },
          { at: 2, dur: 0.7, tone: 'R', vel: 94 },
          { at: 2.75, dur: 0.22, tone: '5', vel: 84 },
          { at: 3, dur: 0.65, tone: '5-', vel: 88 },
          { at: 3.75, dur: 0.2, tone: 'app', vel: 82 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 96 },
          { at: 0.75, dur: 0.22, tone: '5', vel: 84 },
          { at: 1, dur: 0.85, tone: '8', vel: 90 },
          { at: 2, dur: 0.85, tone: '5-', vel: 88 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 96 },
          { at: 0.75, dur: 0.22, tone: '5', vel: 84 },
          { at: 1, dur: 0.85, tone: '8', vel: 90 },
        ],
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 96 },
          { at: 0.75, dur: 0.22, tone: '5-', vel: 84 },
          { at: 1, dur: 0.65, tone: '8', vel: 88 },
          { at: 1.75, dur: 0.2, tone: 'app', vel: 82 },
        ],
      ],
      '1': [
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 96 },
          { at: 0.75, dur: 0.22, tone: '5', vel: 84 },
        ],
      ],
    },
  },

  // Accordion (GM 21): punchy short chords on beat 1, 1-a (0.75), and 2& (1.5)
  comp: {
    program: 21,
    voicing: 'close',
    velocity: [80, 90],
    rhythms: {
      '4': [
        [
          [0, 0.35, 86],
          [0.75, 0.2, 82],
          [1.5, 0.35, 88],
          [2, 0.35, 84],
          [2.75, 0.2, 82],
          [3.5, 0.35, 88],
        ],
        [
          [0, 0.35, 86],
          [0.75, 0.2, 82],
          [1.5, 0.4, 88],
          [2.75, 0.22, 84],
          [3.5, 0.35, 88],
        ],
      ],
      '3': [
        [
          [0, 0.35, 86],
          [0.75, 0.2, 82],
          [1.5, 0.35, 88],
          [2.5, 0.35, 86],
        ],
      ],
      '2': [
        [
          [0, 0.35, 86],
          [0.75, 0.2, 82],
          [1.5, 0.35, 88],
        ],
      ],
      '1': [
        [
          [0, 0.35, 86],
          [0.75, 0.2, 82],
        ],
      ],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'sidestick', 86],
      [1, 'sidestick', 72],
      [2, 'sidestick', 72],
      [3, 'sidestick', 72],
    ],
    grooves: {
      middle: [
        { bars: 2, hits: [...triangle(0), ...triangle(4), ...zabumba(0), ...zabumba(4)] },
        {
          bars: 2,
          hits: [
            ...triangle(0),
            ...triangle(4),
            ...zabumba(0),
            ...zabumba(4),
            [1.25, 'snare', 50, 0.5],
            [5.25, 'snare', 52, 0.5],
            [7.5, 'tomLow', 78, 0.5],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...triangle(0), ...zabumba(0), [0, 'crash', 86, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...triangle(0).filter(([at]) => at < 3),
            ...zabumba(0).filter(([at]) => at < 2.5),
            [2.5, 'snare', 72],
            [2.75, 'tomHigh', 78],
            [3, 'tomMid', 82],
            [3.25, 'tomLow', 84],
            [3.5, 'snare', 80],
            [3.75, 'kick', 90],
          ],
        },
      ],
    },
    ending: [
      [0, 'kick', 92],
      [0, 'crash', 94, 1, 3],
      [0, 'triangleOpen', 72],
    ],
  },
}
