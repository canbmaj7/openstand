import type { DrumHit, StyleDefinition } from '../types'
import { mediumSwing } from './medium-swing'

// Light two-feel time: gentle ride pattern and hi-hat on 2 and 4, no kick
const twoTime: DrumHit[] = [
  [0, 'ride', 64],
  [1, 'ride', 72],
  [1.5, 'ride', 52],
  [2, 'ride', 64],
  [3, 'ride', 72],
  [3.5, 'ride', 52],
  [1, 'hhPedal', 72],
  [3, 'hhPedal', 72],
]

export const swingTwoFour: StyleDefinition = {
  id: 'swing-two-four',
  name: 'Swing Two/Four',
  family: mediumSwing.family,
  swing: mediumSwing.swing,
  tempo: { ...mediumSwing.tempo },

  bass: { ...mediumSwing.bass },
  comp: { ...mediumSwing.comp },
  drums: { ...mediumSwing.drums },

  firstChorus: {
    bass: {
      mode: 'pattern',
      program: mediumSwing.bass.program,
      range: mediumSwing.bass.range,
      patterns: {
        '4': [
          [
            { at: 0, dur: 1.9, tone: 'R' },
            { at: 2, dur: 1.9, tone: '5' },
          ],
          [
            { at: 0, dur: 1.9, tone: 'R' },
            { at: 2, dur: 1.9, tone: 'app' },
          ],
          [
            { at: 0, dur: 1.9, tone: 'R' },
            { at: 2, dur: 1.9, tone: '8' },
          ],
        ],
        '3': [
          [
            { at: 0, dur: 1.9, tone: 'R' },
            { at: 2, dur: 0.95, tone: 'app' },
          ],
          [
            { at: 0, dur: 1.9, tone: 'R' },
            { at: 2, dur: 0.95, tone: '5' },
          ],
        ],
        '2': [[{ at: 0, dur: 1.9, tone: 'R' }]],
        '1': [[{ at: 0, dur: 0.95, tone: 'R' }]],
      },
    },
    drums: {
      ...mediumSwing.drums,
      grooves: {
        middle: [
          { bars: 1, hits: twoTime },
          { bars: 1, hits: [...twoTime, [2.5, 'sidestick', 42, 0.2]] },
        ],
        first: [{ bars: 1, hits: [...twoTime, [0, 'crash', 72, 0.5, 2]] }],
        last: [{ bars: 1, hits: [...twoTime, [3, 'snare', 58, 0.6], [3.5, 'snare', 68, 0.6]] }],
      },
    },
  },
}
