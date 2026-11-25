import type { DrumHit, StyleDefinition } from '../types'

// Train beat: continuous snare eighths with strong backbeat accents on 2 and 4,
// kick on 1 and 3, and hi-hat foot on 2 and 4.
function trainBar(offset: number, withDownbeatSnare = true): DrumHit[] {
  const hits: DrumHit[] = [
    [offset, 'kick', 96],
    [offset + 2, 'kick', 92],
    [offset + 1, 'hhPedal', 66],
    [offset + 3, 'hhPedal', 66],
  ]
  for (let i = withDownbeatSnare ? 0 : 1; i < 8; i++) {
    const at = i / 2
    const vel = i === 2 || i === 6 ? 98 : i % 2 === 0 ? 54 : 44
    hits.push([offset + at, 'snare', vel])
  }
  return hits
}

// Simpler two-beat groove (Groove B): kick on 1 & 3, crisp snare on 2 & 4, closed hats on eighths.
function twoBeatBar(offset: number): DrumHit[] {
  const hits: DrumHit[] = [
    [offset, 'kick', 96],
    [offset + 2, 'kick', 92],
    [offset + 1, 'snare', 96],
    [offset + 3, 'snare', 96],
  ]
  for (let i = 0; i < 8; i++) {
    hits.push([offset + i / 2, 'hhClosed', i % 2 === 0 ? 74 : 52])
  }
  return hits
}

export const country: StyleDefinition = {
  id: 'country',
  name: 'Country',
  family: 'pop',
  swing: 0.5,
  tempo: { default: 120, min: 90, max: 180 },

  bass: {
    mode: 'pattern',
    program: 32, // acoustic upright bass
    range: [28, 52],
    patterns: {
      '4': [
        // Line A: clean root-five alternating two-beat
        [
          { at: 0, dur: 1.75, tone: 'R', vel: 98 },
          { at: 2, dur: 1.75, tone: '5', vel: 90 },
        ],
        // Line B: boom-chick feel adding short muted notes on 2 and 4
        [
          { at: 0, dur: 0.85, tone: 'R', vel: 98 },
          { at: 1, dur: 0.32, tone: 'R', vel: 68 },
          { at: 2, dur: 0.85, tone: '5', vel: 90 },
          { at: 3, dur: 0.32, tone: '5', vel: 68 },
        ],
        // Root-five with a beat-4 approach note into the next chord
        [
          { at: 0, dur: 1.75, tone: 'R', vel: 98 },
          { at: 2, dur: 0.9, tone: '5', vel: 90 },
          { at: 3, dur: 0.85, tone: 'app', vel: 86 },
        ],
        // Root-five with an eighth-note pickup approach on the "and" of 4
        [
          { at: 0, dur: 1.75, tone: 'R', vel: 98 },
          { at: 2, dur: 1.35, tone: '5', vel: 90 },
          { at: 3.5, dur: 0.42, tone: 'app', vel: 84 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 98 },
          { at: 1, dur: 0.9, tone: '5', vel: 82 },
          { at: 2, dur: 0.9, tone: '5', vel: 82 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 98 },
          { at: 1, dur: 0.9, tone: '5', vel: 84 },
          { at: 2, dur: 0.9, tone: 'app', vel: 84 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 98 },
          { at: 1, dur: 0.9, tone: '5', vel: 88 },
        ],
        [
          { at: 0, dur: 0.9, tone: 'R', vel: 98 },
          { at: 1, dur: 0.9, tone: 'app', vel: 86 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.85, tone: 'R', vel: 98 }]],
    },
  },

  // Steel-string acoustic guitar: Carter-style boom-chick on Pattern A, down-up eighths on Pattern B
  comp: {
    program: 25,
    voicing: 'guitar',
    velocity: [56, 86],
    rhythms: {
      '4': [
        // Pattern A: resonant down-beat anchor on 1 & 3, crisp short "chick" on 2 & 4
        [
          [0, 0.75, 68],
          [1, 0.28, 86],
          [2, 0.75, 66],
          [3, 0.28, 86],
        ],
        // Pattern B: down-up eighth-note strum with backbeat accents
        [
          [0, 0.42, 72],
          [0.5, 0.35, 56],
          [1, 0.38, 86],
          [1.5, 0.35, 60],
          [2, 0.42, 70],
          [2.5, 0.35, 56],
          [3, 0.38, 86],
          [3.5, 0.35, 60],
        ],
        // Boom-chick with a light upstroke pickup on 4&
        [
          [0, 0.75, 68],
          [1, 0.28, 86],
          [2, 0.75, 66],
          [3, 0.28, 84],
          [3.5, 0.3, 62],
        ],
      ],
      '3': [
        [
          [0, 0.75, 68],
          [1, 0.28, 84],
          [2, 0.28, 82],
        ],
        [
          [0, 0.42, 72],
          [0.5, 0.35, 56],
          [1, 0.38, 84],
          [1.5, 0.35, 58],
          [2, 0.38, 82],
          [2.5, 0.35, 58],
        ],
      ],
      '2': [
        [
          [0, 0.7, 68],
          [1, 0.28, 86],
        ],
        [
          [0, 0.42, 72],
          [0.5, 0.35, 56],
          [1, 0.38, 86],
          [1.5, 0.35, 58],
        ],
      ],
      '1': [[[0, 0.7, 74]]],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'sidestick', 90],
      [1, 'sidestick', 76],
      [2, 'sidestick', 76],
      [3, 'sidestick', 76],
    ],
    grooves: {
      middle: [
        {
          bars: 2,
          hits: [...trainBar(0), ...trainBar(4), [7.75, 'snare', 46, 0.4]],
        },
        {
          bars: 2,
          hits: [...twoBeatBar(0), ...twoBeatBar(4), [7.5, 'hhOpen', 64, 0.35]],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...trainBar(0, false), [0, 'crash', 92, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...trainBar(0).filter(([at]) => at < 2.5),
            [2.5, 'snare', 58],
            [3, 'snare', 88],
            [3.25, 'snare', 72],
            [3.5, 'snare', 94],
            [3.75, 'snare', 102],
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
