import { arrange } from '../../../src/engine/arrange'
import type { PracticeOptions, Timeline } from '../../../src/engine/timeline'
import { parseIrealLinks } from '../../../src/formats/ireal'
import type { Chart } from '../../../src/music/chart'
import { getStyle, type StyleDefinition } from '../../../src/styles/index'

export interface BackingTrackInput {
  chart?: Chart
  ireal?: string
  style?: string
  transpose?: number
  choruses?: number
  bpm?: number
  practice?: PracticeOptions
}

export interface BackingTrackResult {
  midi: Uint8Array
  timeline: Timeline
  chart: Chart
  style: StyleDefinition
}

const DEFAULT_CHORUSES = 3

function resolveChart(input: BackingTrackInput): Chart {
  if (input.chart) return input.chart
  if (input.ireal !== undefined) {
    const charts = parseIrealLinks(input.ireal).flatMap((list) => list.charts)
    if (charts.length === 0) throw new Error('No valid chart found in iReal link.')
    return charts[0]
  }
  throw new Error('Either "chart" or "ireal" must be provided.')
}

/** Generate a backing-track MIDI file and timeline from a Chart or iReal Pro link. */
export function backingTrack(input: BackingTrackInput): BackingTrackResult {
  const chart = resolveChart(input)
  const style = getStyle(input.style ?? chart.style)
  const transpose = input.transpose ?? 0
  const choruses = input.choruses ?? DEFAULT_CHORUSES
  const bpm = input.bpm ?? chart.bpm
  const { midi, timeline } = arrange(chart, style, transpose, choruses, input.practice ?? {}, bpm)
  return { midi, timeline, chart, style }
}
