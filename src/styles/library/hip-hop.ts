import type { DrumHit, StyleDefinition } from '../types'

// Undulating eighth-note closed hi-hats for a relaxed boom-bap pocket
function eighthHats(offset: number): DrumHit[] {
  const vels = [78, 50, 68, 46, 74, 52, 66, 48]
  return vels.map((vel, i): DrumHit => [offset + i / 2, 'hhClosed', vel])
}

// Groove B adds soft ghosted sixteenth-note subdivisions on the hi-hat
function sixteenthHats(offset: number): DrumHit[] {
  const out = eighthHats(offset)
  for (const sub of [0.75, 1.75, 2.75, 3.75]) {
    out.push([offset + sub, 'hhClosed', 34, 0.7])
  }
  return out
}

function backbeat(offset: number): DrumHit[] {
  return [
    [offset + 1, 'snare', 102],
    [offset + 3, 'snare', 102],
    [offset + 1.75, 'snare', 28, 0.35],
  ]
}

export const hipHop: StyleDefinition = {
  id: 'hip-hop',
  name: 'Hip-Hop',
  family: 'pop',
  // Engine swing shifts 8th-note offbeats (x.5), not 16ths, so keep straight 0.5 and let humanize breathe
  swing: 0.5,
  tempo: { default: 88, min: 70, max: 100 },

  // Fingered electric bass (GM 33) locked to the kick on 1 and 3&, with rare approaches
  bass: {
    mode: 'pattern',
    program: 33,
    range: [28, 50],
    patterns: {
      '4': [
        [
          { at: 0, dur: 1.9, tone: 'R', vel: 102 },
          { at: 2.5, dur: 0.9, tone: 'R', vel: 92 },
        ],
        [
          { at: 0, dur: 1.6, tone: 'R', vel: 102 },
          { at: 1.75, dur: 0.45, tone: '5-', vel: 84 },
          { at: 2.5, dur: 0.9, tone: 'R', vel: 92 },
        ],
        [
          { at: 0, dur: 1.9, tone: 'R', vel: 102 },
          { at: 2.5, dur: 0.75, tone: 'R', vel: 92 },
        ],
        [
          { at: 0, dur: 1.9, tone: 'R', vel: 102 },
          { at: 2.5, dur: 0.8, tone: 'R', vel: 92 },
          { at: 3.5, dur: 0.45, tone: 'app', vel: 82 },
        ],
      ],
      '3': [
        [
          { at: 0, dur: 1.9, tone: 'R', vel: 102 },
          { at: 2.5, dur: 0.45, tone: 'R', vel: 90 },
        ],
        [
          { at: 0, dur: 1.6, tone: 'R', vel: 102 },
          { at: 1.75, dur: 0.45, tone: '5-', vel: 84 },
          { at: 2.5, dur: 0.45, tone: 'app', vel: 82 },
        ],
      ],
      '2': [
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 102 },
          { at: 1.5, dur: 0.45, tone: 'R', vel: 88 },
        ],
        [
          { at: 0, dur: 1.4, tone: 'R', vel: 102 },
          { at: 1.75, dur: 0.22, tone: 'app', vel: 82 },
        ],
      ],
      '1': [[{ at: 0, dur: 0.9, tone: 'R', vel: 102 }]],
    },
  },

  // Rhodes electric piano (GM 4): sparse long rootless chords (1 and 3&), Pattern B adds a short 2& stab
  comp: {
    program: 4,
    voicing: 'rootless',
    velocity: [54, 72],
    rhythms: {
      '4': [
        [
          [0, 1.9, 64],
          [2.5, 1.35, 60],
        ],
        [
          [0, 1.25, 64],
          [1.5, 0.32, 70],
          [2.5, 1.3, 58],
        ],
      ],
      '3': [
        [
          [0, 1.9, 64],
          [2.5, 0.45, 60],
        ],
        [
          [0, 1.2, 64],
          [1.5, 0.32, 70],
        ],
      ],
      '2': [
        [[0, 1.75, 64]],
        [
          [0, 1.2, 64],
          [1.5, 0.32, 70],
        ],
      ],
      '1': [[[0, 0.9, 64]]],
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
            ...eighthHats(0),
            ...eighthHats(4),
            ...backbeat(0),
            ...backbeat(4),
            [0, 'kick', 106],
            [1.75, 'kick', 82, 0.55],
            [2.5, 'kick', 96],
            [4, 'kick', 106],
            [5.75, 'kick', 86],
            [6.5, 'kick', 96],
            [7.5, 'hhOpen', 62, 0.35],
          ],
        },
        {
          bars: 2,
          hits: [
            ...sixteenthHats(0),
            ...sixteenthHats(4),
            ...backbeat(0),
            ...backbeat(4),
            [0, 'kick', 106],
            [0.75, 'kick', 78],
            [2.5, 'kick', 96],
            [4, 'kick', 106],
            [5.75, 'kick', 88],
            [6.5, 'kick', 96],
            [7.5, 'kick', 76, 0.6],
            [7.5, 'hhOpen', 64, 0.45],
          ],
        },
      ],
      first: [
        {
          bars: 1,
          hits: [...eighthHats(0).slice(1), ...backbeat(0), [0, 'crash', 96, 1, 2], [0, 'kick', 106], [2.5, 'kick', 96]],
        },
      ],
      last: [
        {
          bars: 1,
          hits: [
            ...eighthHats(0).slice(0, 6),
            [0, 'kick', 106],
            [1, 'snare', 102],
            [2.5, 'kick', 94],
            [3, 'snare', 90],
            [3.25, 'hhClosed', 66],
            [3.5, 'snare', 94],
            [3.75, 'snare', 100],
          ],
        },
      ],
    },
    ending: [
      [0, 'crash', 102, 1, 3],
      [0, 'kick', 106],
      [0, 'snare', 96],
    ],
  },
}
