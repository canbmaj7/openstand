import { describe, expect, test } from 'vitest'
import { buildTimeline } from '../src/engine/timeline'
import { chartFromMeasures } from '../src/music/chart'
import { updateBar } from '../src/music/edit'
import { startBeatFor } from '../src/music/practice'

describe('startBeatFor', () => {
  const chart = chartFromMeasures(
    { title: 'Test Tune', key: 0, bpm: 120, style: 'medium-swing' },
    [
      ['C^7', 'A-7'], // Bar 0: 2 beats each in 4/4
      ['D-7', 'G7'],  // Bar 1: 2 beats each
      ['C^7'],        // Bar 2: 4 beats
      ['C^7'],        // Bar 3: 4 beats
    ],
  )
  const timeline = buildTimeline(chart, 0, 1)

  test('starts at the first chord of the first bar right after count-in', () => {
    const beat = startBeatFor(timeline, 0, 0, chart)
    expect(beat).toBe(timeline.countIn)
  })

  test('starts at the second chord of a bar with beat offset', () => {
    const beat = startBeatFor(timeline, 0, 1, chart)
    expect(beat).toBe(timeline.countIn + 2)

    const bar1Chord1 = startBeatFor(timeline, 1, 1, chart)
    expect(bar1Chord1).toBe(timeline.countIn + 6)
  })

  test('falls back to bar start if chordIndex is out of bounds', () => {
    const beat = startBeatFor(timeline, 0, 99, chart)
    expect(beat).toBe(timeline.countIn)
  })

  test('falls back to count-in if bar is not in timeline', () => {
    const beat = startBeatFor(timeline, 99, 0, chart)
    expect(beat).toBe(timeline.countIn)
  })

  test('works with repeat sections by finding the first occurrence in chorus 0', () => {
    // Repeat bars 0 and 1: playback order 0, 1, 0, 1, 2, 3
    const repeatChart = updateBar(updateBar(chart, 0, { repeatStart: true }), 1, { repeatEnd: true })
    const repeatTimeline = buildTimeline(repeatChart, 0, 1)

    // Bar 0 plays at countIn and countIn + 8
    const firstPassBar0 = startBeatFor(repeatTimeline, 0, 0, repeatChart)
    expect(firstPassBar0).toBe(repeatTimeline.countIn)

    // Bar 1 first occurrence is at countIn + 4
    const firstPassBar1 = startBeatFor(repeatTimeline, 1, 0, repeatChart)
    expect(firstPassBar1).toBe(repeatTimeline.countIn + 4)

    // Bar 1 second chord on first occurrence is at countIn + 6
    const firstPassBar1Chord1 = startBeatFor(repeatTimeline, 1, 1, repeatChart)
    expect(firstPassBar1Chord1).toBe(repeatTimeline.countIn + 6)
  })

  test('calculates correct beat when called without chart argument using slots', () => {
    const bar0Chord0 = startBeatFor(timeline, 0, 0)
    expect(bar0Chord0).toBe(timeline.countIn)

    const bar0Chord1 = startBeatFor(timeline, 0, 1)
    expect(bar0Chord1).toBe(timeline.countIn + 2)

    const bar1Chord1 = startBeatFor(timeline, 1, 1)
    expect(bar1Chord1).toBe(timeline.countIn + 6)
  })

  test('handles charts with NC (null symbol) correctly when chart is provided', () => {
    const ncChart = {
      ...chart,
      bars: [
        {
          cells: 4,
          chords: [
            { symbol: null, beats: 2 },
            { symbol: 'C^7', beats: 2 },
          ],
        },
      ],
    }
    const ncTimeline = buildTimeline(ncChart, 0, 1)
    // chordIndex 1 is C^7, which starts at offset 2 beats
    const beat = startBeatFor(ncTimeline, 0, 1, ncChart)
    expect(beat).toBe(ncTimeline.countIn + 2)
  })
})
