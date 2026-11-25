import type { DrumHit, StyleDefinition } from '../types'

// Partido Alto: 16th-note syncopated nylon guitar over a two-bar cycle,
// pandeiro sixteenths, and surdo answering on beats 2 and 4.

// Pandeiro: 16th-note tambourine jingles with low thumb on 1 & 3 and muted slap on 2 & 4
function pandeiro(offset: number): DrumHit[] {
  const jingles = Array.from({ length: 16 }, (_, i): DrumHit => {
    const vel = i % 4 === 3 || i % 4 === 2 ? (i % 4 === 3 ? 62 : 54) : i % 4 === 0 ? 46 : 32
    return [offset + i / 4, 'tambourine', vel]
  })
  return [
    ...jingles,
    [offset, 'congaLow', 68],
    [offset + 1, 'congaMute', 58],
    [offset + 2, 'congaLow', 68],
    [offset + 3, 'congaMute', 58],
  ]
}

// Surdo: light on 1 & 3, strong answer on 2 & 4, subtle 16th pickups
function surdo(offset: number): DrumHit[] {
  return [
    [offset, 'kick', 54],
    [offset + 0.75, 'kick', 42],
    [offset + 1, 'kick', 84],
    [offset + 2, 'kick', 54],
    [offset + 2.75, 'kick', 42],
    [offset + 3, 'kick', 84],
  ]
}

// Two-bar partido alto tamborim/rim phrasing on the cross-stick
const partidoRim: DrumHit[] = [0, 0.75, 1.5, 2.25, 3, 3.75, 4.25, 5, 5.75, 6.5, 7.25].map(
  (at): DrumHit => [at, 'sidestick', 60],
)

export const partidoAlto: StyleDefinition = {
  id: 'partido-alto',
  name: 'Partido Alto',
  family: 'latin',
  swing: 0.5,
  tempo: { default: 104, min: 90, max: 120 },

  // Bass: root on 1, fifth on 2 (locked with the surdo), with 16th-note pickups
  bass: {
    mode: 'pattern',
    program: 32,
    range: [28, 52],
    patterns: {
      '4': [
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 92 },
          { at: 0.75, dur: 0.2, tone: '5-', vel: 78 },
          { at: 1, dur: 0.7, tone: '5-', vel: 98 },
          { at: 1.75, dur: 0.2, tone: 'R', vel: 78 },
          { at: 2, dur: 0.7, tone: 'R', vel: 92 },
          { at: 2.75, dur: 0.2, tone: '5-', vel: 78 },
          { at: 3, dur: 0.9, tone: '5-', vel: 98 },
        ],
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 92 },
          { at: 0.75, dur: 0.2, tone: '3', vel: 78 },
          { at: 1, dur: 0.9, tone: '5-', vel: 98 },
          { at: 2, dur: 0.7, tone: 'R', vel: 92 },
          { at: 2.75, dur: 0.2, tone: '5', vel: 78 },
          { at: 3, dur: 0.7, tone: '5-', vel: 96 },
          { at: 3.75, dur: 0.2, tone: 'app', vel: 80 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 92 },
          { at: 0.75, dur: 0.2, tone: '5-', vel: 78 },
          { at: 1, dur: 0.9, tone: '5-', vel: 98 },
        ],
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 92 },
          { at: 1, dur: 0.7, tone: '5-', vel: 96 },
          { at: 1.75, dur: 0.2, tone: 'app', vel: 80 },
        ],
      ],
      '1': [
        [
          { at: 0, dur: 0.7, tone: 'R', vel: 92 },
          { at: 0.75, dur: 0.2, tone: '5-', vel: 78 },
        ],
      ],
    },
  },

  // Nylon-string guitar (GM 24): two-bar syncopated partido alto figures on the 16th grid
  comp: {
    program: 24,
    voicing: 'guitar',
    velocity: [48, 66],
    anticipation: 0.25,
    twoBar: [
      [
        [0, 0.24, 56],
        [0.75, 0.4, 62],
        [1.5, 0.35, 58],
        [2.25, 0.4, 62],
        [3, 0.35, 56],
        [3.75, 0.22, 60],
        [4.25, 0.4, 60],
        [5, 0.35, 58],
        [5.75, 0.4, 64],
        [6.5, 0.4, 58],
        [7.25, 0.4, 62],
      ],
      [
        [0.25, 0.4, 60],
        [1, 0.35, 56],
        [1.75, 0.4, 64],
        [2.5, 0.4, 58],
        [3.25, 0.4, 62],
        [4, 0.25, 56],
        [4.75, 0.4, 62],
        [5.5, 0.35, 58],
        [6.25, 0.4, 62],
        [7, 0.35, 56],
        [7.75, 0.22, 60],
      ],
    ],
    rhythms: {
      '4': [
        [[0, 0.24, 56], [0.75, 0.4, 62], [1.5, 0.35, 58], [2.25, 0.4, 62], [3, 0.35, 56], [3.75, 0.22, 60]],
        [[0.25, 0.4, 60], [1, 0.35, 56], [1.75, 0.4, 64], [2.5, 0.4, 58], [3.25, 0.4, 62]],
      ],
      '2': [
        [[0, 0.24, 56], [0.75, 0.4, 62], [1.5, 0.35, 58]],
        [[0.25, 0.4, 60], [1, 0.35, 56], [1.75, 0.22, 62]],
      ],
      '1': [[[0, 0.24, 56], [0.75, 0.22, 62]]],
    },
  },

  drums: {
    kit: 0,
    countIn: [
      [0, 'sidestick', 85],
      [1, 'sidestick', 70],
      [2, 'sidestick', 70],
      [3, 'sidestick', 70],
    ],
    grooves: {
      middle: [
        { bars: 2, hits: [...pandeiro(0), ...pandeiro(4), ...surdo(0), ...surdo(4), ...partidoRim] },
        {
          bars: 2,
          hits: [
            ...pandeiro(0),
            ...pandeiro(4),
            ...surdo(0),
            ...surdo(4),
            ...partidoRim,
            [1.75, 'congaHigh', 66, 0.6],
            [5.75, 'congaHigh', 68, 0.6],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...pandeiro(0), ...surdo(0), ...partidoRim.filter(([at]) => at < 4), [0, 'crash', 88, 1, 2]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...pandeiro(0).filter(([at]) => at < 3),
            ...surdo(0).slice(0, 3),
            [2.5, 'snare', 72],
            [2.75, 'snare', 68],
            [3, 'tomHigh', 82],
            [3.25, 'tomMid', 82],
            [3.5, 'tomLow', 88],
            [3.75, 'kick', 90],
          ],
        },
      ],
    },
    ending: [
      [0, 'kick', 90],
      [0, 'crash', 94, 1, 3],
      [0, 'tambourine', 56],
    ],
  },
}
