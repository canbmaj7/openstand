import type { DrumHit, StyleDefinition } from '../types'

// One drop: kick and rim together on beat 3 only, nothing on beat 1
const offbeatHats: DrumHit[] = Array.from({ length: 8 }, (_, i): DrumHit => [i / 2, 'hhClosed', i % 2 === 0 ? 70 : 85])

export const reggae: StyleDefinition = {
  id: 'reggae',
  name: 'Reggae',
  family: 'world',
  swing: 0.5,
  tempo: { default: 80, min: 60, max: 110 },

  bass: {
    mode: 'pattern',
    program: 33, // fingered electric bass
    range: [28, 50],
    patterns: {
      '4': [
        // Riff that leaves beat one empty: root, fifth, octave
        [
          { at: 1, dur: 0.9, tone: 'R' },
          { at: 2.5, dur: 0.42, tone: '5' },
          { at: 3, dur: 0.9, tone: '8' },
        ],
        [
          { at: 0.5, dur: 0.42, tone: 'R' },
          { at: 1, dur: 0.9, tone: 'R' },
          { at: 2.5, dur: 0.42, tone: '5' },
          { at: 3.5, dur: 0.42, tone: 'app' },
        ],
      ],
      '2': [
        [
          { at: 1, dur: 0.9, tone: 'R' },
          { at: 1.5, dur: 0.42, tone: '5' },
        ],
      ],
      '1': [[{ at: 0.5, dur: 0.42, tone: 'R' }]],
    },
  },

  comp: {
    program: 27, // clean electric guitar: the skank
    voicing: 'close',
    velocity: [60, 76],
    rhythms: {
      // Short chords on the off-beats only
      '4': [
        [
          [0.5, 0.3],
          [1.5, 0.3],
          [2.5, 0.3],
          [3.5, 0.3],
        ],
        [
          [1.5, 0.3],
          [2.5, 0.3],
          [3.5, 0.3],
        ],
      ],
      '2': [
        [
          [0.5, 0.3],
          [1.5, 0.3],
        ],
      ],
      '1': [[[0.5, 0.3]]],
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
          bars: 1,
          hits: [
            ...offbeatHats,
            [2, 'kick', 105],
            [2, 'sidestick', 100],
            [3.5, 'hhOpen', 70, 0.3],
          ],
        },
        {
          bars: 1,
          hits: [
            ...offbeatHats,
            [2, 'kick', 105],
            [2, 'sidestick', 100],
            [3.75, 'hhOpen', 70, 0.5],
          ],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...offbeatHats.slice(0, 4),
            [2, 'kick', 105],
            [2, 'sidestick', 100],
            [3, 'tomHigh', 90],
            [3.5, 'tomMid', 95],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 110, 1, 3],
      [2, 'kick', 105],
      [2, 'sidestick', 100],
    ],
  },
}
