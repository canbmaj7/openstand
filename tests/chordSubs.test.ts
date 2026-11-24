import { describe, expect, test } from 'vitest'
import { buildTimeline } from '../src/engine/timeline'
import { parseChartFile, validateChart } from '../src/formats/chartFile'
import { chartToChordPro } from '../src/formats/chordpro'
import { MUSIC_PREFIX, parseIrealLinks, parseMusic, swapBlocks } from '../src/formats/ireal'
import { irealLink } from '../src/formats/irealWrite'
import { chartFromMeasures, type Chart } from '../src/music/chart'
import { barToInput, parseBarInput } from '../src/music/notation'
import { EXAMPLES } from '../src/music/songs'

function makeChart(bars: Chart['bars']): Chart {
  return {
    format: 'openstand-chart',
    version: 1,
    title: 'Subs Test',
    style: 'medium-swing',
    key: 0,
    bpm: 120,
    time: [4, 4],
    bars,
  }
}

describe('chord substitutions', () => {
  test('notation parses and formats C7(Gb7) with optional beat lengths', () => {
    expect(parseBarInput('C7(Gb7)', [4, 4])).toEqual({
      ok: true,
      chords: [{ symbol: 'C7', alt: 'Gb7', beats: 4 }],
    })
    expect(parseBarInput('Dm7(Fm7):3 G7(Db7):1', [4, 4])).toEqual({
      ok: true,
      chords: [
        { symbol: 'D-7', alt: 'F-7', beats: 3 },
        { symbol: 'G7', alt: 'Db7', beats: 1 },
      ],
    })
    expect(barToInput([{ symbol: 'C7', alt: 'Gb7', beats: 4 }], [4, 4])).toBe('C7(Gb7)')
    expect(
      barToInput(
        [
          { symbol: 'D-7', alt: 'F-7', beats: 3 },
          { symbol: 'G7', alt: 'Db7', beats: 1 },
        ],
        [4, 4],
      ),
    ).toBe('D-7(F-7):3 G7(Db7):1')

    expect(parseBarInput('Ebm(maj7)', [4, 4])).toEqual({
      ok: true,
      chords: [{ symbol: 'Eb-^7', beats: 4 }],
    })

    const bad = parseBarInput('C7(xyz)', [4, 4])
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error).toMatch(/Can't read/)
    expect(parseBarInput('C7()', [4, 4]).ok).toBe(false)
  })

  test('iReal reader parses C^7(A-7) from irealb:// and drops invalid or chordless parens', () => {
    const music = '[*AT44C^7(A-7)   |D-7 G7(Db7) Z '
    const scrambled = MUSIC_PREFIX + swapBlocks(music.replace(/ {3}/g, 'XyQ').replace(/ \|/g, 'LZ'))
    const link = `irealb://${encodeURIComponent(['Sub Tune', 'Writer Test', '', 'Medium Swing', 'C', '', scrambled, '', '120', '0'].join('='))}`
    const [list] = parseIrealLinks(link)
    expect(list.charts).toHaveLength(1)
    expect(list.charts[0].bars[0].chords[0]).toEqual({ symbol: 'C^7', alt: 'A-7', beats: 4 })
    expect(list.charts[0].bars[1].chords[1]).toEqual({ symbol: 'G7', alt: 'Db7', beats: 2 })

    const edge = parseMusic('[T44(A-7)   |C^7 (A-7)  |n(A-7)   |F7(2nd x)   Z', [4, 4])
    for (const bar of edge.bars) {
      for (const c of bar.chords) expect(c.alt).toBeUndefined()
    }
  })

  test('iReal writer/reader round-trips alt chords', () => {
    const chart = makeChart([
      { chords: [{ symbol: 'C^7', alt: 'A-7', beats: 4 }], cells: 4, rowStart: true },
      { chords: [{ symbol: 'D-7', beats: 2 }, { symbol: 'G7', alt: 'Db7', beats: 2 }], cells: 4, barline: 'final' },
    ])
    const [list] = parseIrealLinks(irealLink([chart]))
    const back = list.charts[0]
    expect(back.bars[0].chords[0]).toEqual({ symbol: 'C^7', alt: 'A-7', beats: 4 })
    expect(back.bars[1].chords[1]).toEqual({ symbol: 'G7', alt: 'Db7', beats: 2 })
  })

  test('buildTimeline handles off, alternate, and deterministic random subs with loop and keyStep', () => {
    const chart = makeChart([
      { chords: [{ symbol: 'C7', alt: 'Gb7', beats: 4 }], cells: 4, rowStart: true },
      { chords: [], cells: 4 },
      { chords: [{ symbol: 'F7', beats: 4 }], cells: 4, barline: 'final' },
    ])

    const off = buildTimeline(chart, 0, 4, { subs: 'off' })
    expect(off.slots.every((s) => s.sub === undefined)).toBe(true)
    expect(off.slots.filter((s) => s.measure === 0).map((s) => s.chord.root)).toEqual([0, 0, 0, 0])

    const alt = buildTimeline(chart, 0, 4, { subs: 'alternate' })
    const bar0Alt = alt.slots.filter((s) => s.measure === 0)
    expect(bar0Alt.map((s) => s.chord.root)).toEqual([0, 6, 0, 6])
    expect(bar0Alt.map((s) => Boolean(s.sub))).toEqual([false, true, false, true])
    // Held blank bar carries the substitution too
    const bar1Alt = alt.slots.filter((s) => s.measure === 1)
    expect(bar1Alt.map((s) => s.chord.root)).toEqual([0, 6, 0, 6])
    expect(bar1Alt.map((s) => Boolean(s.sub))).toEqual([false, true, false, true])

    const randA = buildTimeline(chart, 0, 8, { subs: 'random' })
    const randB = buildTimeline(chart, 0, 8, { subs: 'random' })
    expect(randA.slots).toEqual(randB.slots)
    const randBar0 = randA.slots.filter((s) => s.measure === 0)
    expect(randBar0.some((s) => s.sub === true)).toBe(true)
    expect(randBar0.some((s) => !s.sub)).toBe(true)

    // Works with countIn, loop (starting on held blank bar), and keyStep
    const looped = buildTimeline(chart, 0, 2, { loop: [1, 2], keyStep: 5, subs: 'alternate' })
    expect(looped.countIn).toBe(8)
    const loopedBar1 = looped.slots.filter((s) => s.measure === 1)
    // Chorus 0: C7 (root 0, no sub); Chorus 1: Gb7 transposed up 5 semitones -> B7 (root 11, sub: true)
    expect(loopedBar1.map((s) => ({ root: s.chord.root, sub: Boolean(s.sub) }))).toEqual([
      { root: 0, sub: false },
      { root: 11, sub: true },
    ])
  })

  test('validateChart accepts string alt and rejects non-string alt', () => {
    const valid = makeChart([{ chords: [{ symbol: 'C7', alt: 'Gb7', beats: 4 }], cells: 4 }])
    expect(parseChartFile(JSON.stringify(valid))).toEqual(valid)

    const invalid = { ...valid, bars: [{ chords: [{ symbol: 'C7', alt: 123, beats: 4 }], cells: 4 }] }
    expect(() => validateChart(invalid)).toThrow(/"alt" must be a string/)
  })

  test('ChordPro export ignores alt and outputs only the main chord', () => {
    const chart = chartFromMeasures(
      { title: 'ChordPro Subs', style: 'medium-swing', key: 5, bpm: 140 },
      [['F7'], ['C7(Gb7)'], ['Bb7'], ['G-7', 'C7(Gb7)']],
    )
    const out = chartToChordPro(chart)
    expect(out).toContain('| F7 . . . | C7 . . . | Bb7 . . . | Gm7 . C7 . ||')
    expect(out).not.toContain('Gb7')
  })

  test('Jazz Blues example carries chord substitutions', () => {
    const blues = EXAMPLES.find((t) => t.id === 'jazz-blues-f')!
    const alts = blues.chart.bars.flatMap((b) => b.chords.filter((c) => c.alt))
    expect(alts.length).toBeGreaterThanOrEqual(2)
  })
})
