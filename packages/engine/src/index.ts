export { backingTrack, type BackingTrackInput, type BackingTrackResult } from './backingTrack'

export {
  beatsPerBar,
  chartFromMeasures,
  evenSplit,
  isCompound,
  playbackOrder,
  type BarChord,
  type Chart,
  type ChartBar,
  type TimeSignature,
} from '../../../src/music/chart'
export { groupsFor } from '../../../src/music/meter'

export {
  chordLabel,
  chordTones,
  closeVoicingTones,
  keyPrefersFlats,
  noteName,
  parseChord,
  rootlessVoicings,
  spellRoot,
  transposeChord,
  type Chord,
  type Quality,
} from '../../../src/music/chords'

export { parseIrealLinks, unknownChords, type IrealPlaylist } from '../../../src/formats/ireal'
export { chartToIrealSong, chartToMusic, irealLink } from '../../../src/formats/irealWrite'
export { chartToFile, parseChartFile, validateChart } from '../../../src/formats/chartFile'
export { chartToChordPro } from '../../../src/formats/chordpro'

export { getStyle, STYLES } from '../../../src/styles/index'
export type { DrumName } from '../../../src/styles/drums'
export type {
  BassNote,
  BassPart,
  BassTone,
  ByChordLength,
  CompHit,
  CompPart,
  DrumHit,
  DrumPart,
  Groove,
  Position,
  StyleDefinition,
  StyleFamily,
} from '../../../src/styles/types'

export { arrange, BASE_BPM, CHANNELS, type Arrangement, type Part } from '../../../src/engine/arrange'
export {
  buildTimeline,
  chorusKeyOffset,
  chorusTranspose,
  countInBeats,
  countInClicks,
  practiceOrder,
  slotAtBeat,
  type Bar,
  type Click,
  type CountInMode,
  type PracticeOptions,
  type Slot,
  type Timeline,
} from '../../../src/engine/timeline'
