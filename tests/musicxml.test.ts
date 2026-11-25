import { describe, expect, test } from 'vitest'
import { chartToMusicXml } from '../src/formats/musicxml'
import { beatsPerBar, chartFromMeasures, type Chart } from '../src/music/chart'
import { setBarTime, updateBar } from '../src/music/edit'
import { EXAMPLES } from '../src/music/songs'

// Simple strict XML well-formedness validator (tag stack, self-closing tags, attribute quoting, raw '&' check).
function assertWellFormedXml(xml: string): void {
  expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  expect(xml).toContain('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">')

  const body = xml
    .replace(/^<\?xml[^?]*\?>\s*/, '')
    .replace(/^<!DOCTYPE[^>]*>\s*/, '')

  const stack: string[] = []
  let pos = 0
  let rootCount = 0

  while (pos < body.length) {
    const lt = body.indexOf('<', pos)
    if (lt === -1) {
      expect(body.slice(pos).trim()).toBe('')
      break
    }
    const text = body.slice(pos, lt)
    // No unescaped '&' or '>' in text nodes
    expect(text).not.toMatch(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/)
    expect(text).not.toContain('>')

    const gt = body.indexOf('>', lt + 1)
    expect(gt).toBeGreaterThan(lt)
    const tag = body.slice(lt + 1, gt)
    expect(tag).not.toContain('<')

    if (tag.startsWith('!--')) {
      const end = body.indexOf('-->', lt + 4)
      expect(end).toBeGreaterThan(lt)
      pos = end + 3
      continue
    }

    if (tag.startsWith('/')) {
      const name = tag.slice(1).trim()
      expect(stack.pop()).toBe(name)
    } else {
      const selfClosing = tag.endsWith('/')
      const inner = (selfClosing ? tag.slice(0, -1) : tag).trim()
      const nameMatch = /^([A-Za-z_][\w.-]*)/.exec(inner)
      expect(nameMatch).not.toBeNull()
      const name = nameMatch![1]
      const attrPart = inner.slice(name.length).trim()
      if (attrPart) {
        const cleaned = attrPart.replace(/[A-Za-z_][\w.-]*="[^"<&]*(&(?:amp|lt|gt|quot|apos);[^"<&]*)*"/g, '').trim()
        expect(cleaned).toBe('')
      }
      if (stack.length === 0) rootCount++
      if (!selfClosing) stack.push(name)
    }
    pos = gt + 1
  }

  expect(stack).toEqual([])
  expect(rootCount).toBe(1)
}

function measureBodies(xml: string): string[] {
  return [...xml.matchAll(/<measure number="\d+">([\s\S]*?)<\/measure>/g)].map((m) => m[1])
}

function noteDurationSum(measureXml: string): number {
  const durations = [...measureXml.matchAll(/<note>[\s\S]*?<duration>(\d+)<\/duration>[\s\S]*?<\/note>/g)].map((m) =>
    Number(m[1]),
  )
  return durations.reduce((sum, d) => sum + d, 0)
}

describe('chartToMusicXml', () => {
  test('all EXAMPLES produce well-formed XML with exact measure durations and harmony counts', () => {
    for (const tune of EXAMPLES) {
      const xml = chartToMusicXml(tune.chart)
      assertWellFormedXml(xml)

      const divMatch = /<divisions>(\d+)<\/divisions>/.exec(xml)
      expect(divMatch).not.toBeNull()
      const divisions = Number(divMatch![1])

      const playable = tune.chart.bars.filter((b) => !b.spacer)
      const measures = measureBodies(xml)
      expect(measures).toHaveLength(playable.length)

      let time = tune.chart.time
      playable.forEach((bar, idx) => {
        if (bar.time) time = bar.time
        const expected = Math.round(beatsPerBar(time) * divisions)
        expect(noteDurationSum(measures[idx])).toBe(expected)
      })

      const totalChords = playable.reduce((sum, b) => sum + b.chords.length, 0)
      const harmonies = xml.match(/<harmony>/g) ?? []
      expect(harmonies).toHaveLength(totalChords)
    }
  })

  test('writes header metadata, escapes XML characters, and omits composer when absent', () => {
    const plain = chartFromMeasures(
      { title: 'Rock & Roll <"1"> \'A\'', style: 'medium-swing', key: 0, bpm: 120 },
      [['C']],
    )
    const xml = chartToMusicXml(plain)
    assertWellFormedXml(xml)
    expect(xml).toContain('<work-title>Rock &amp; Roll &lt;&quot;1&quot;&gt; &apos;A&apos;</work-title>')
    expect(xml).toContain('<part-name>Chords</part-name>')
    expect(xml).not.toContain('<part-abbreviation>')
    expect(xml).not.toContain('<creator type="composer">')

    const withComposer = chartToMusicXml({ ...plain, composer: 'Bill & Ted' })
    assertWellFormedXml(withComposer)
    expect(withComposer).toContain('<creator type="composer">Bill &amp; Ted</creator>')
  })

  test('maps chord qualities, degrees, bass, root alterations, N.C., and unrecognized chords', () => {
    const chart = chartFromMeasures(
      { title: 'Chord Map', style: 'medium-swing', key: 0, bpm: 120 },
      [
        ['Cmaj7', 'Dm7'],
        ['G7', 'Bø'],
        ['C7b9', 'C/E'],
        ['Bb', 'C-^7'],
        ['C5', 'Csus2'],
        ['C7sus', 'C9'],
        ['Cadd9'],
      ],
    )
    const xml = chartToMusicXml(chart)
    assertWellFormedXml(xml)

    expect(xml).toMatch(/<root-step>C<\/root-step>[\s\S]*?<kind[^>]*>major-seventh<\/kind>/)
    expect(xml).toMatch(/<root-step>D<\/root-step>[\s\S]*?<kind[^>]*>minor-seventh<\/kind>/)
    expect(xml).toMatch(/<root-step>G<\/root-step>[\s\S]*?<kind[^>]*>dominant<\/kind>/)
    expect(xml).toMatch(/<root-step>B<\/root-step>[\s\S]*?<kind[^>]*>half-diminished<\/kind>/)
    expect(xml).toMatch(
      /<kind text="7b9">dominant<\/kind>[\s\S]*?<degree>\s*<degree-value>9<\/degree-value>\s*<degree-alter>-1<\/degree-alter>/,
    )
    expect(xml).toMatch(/<root-step>C<\/root-step>[\s\S]*?<kind>major<\/kind>\s*<bass>\s*<bass-step>E<\/bass-step>\s*<\/bass>/)
    expect(xml).toMatch(/<root-step>B<\/root-step>\s*<root-alter>-1<\/root-alter>/)
    expect(xml).toContain('>major-minor</kind>')
    expect(xml).toContain('>power</kind>')
    expect(xml).toContain('>suspended-second</kind>')
    expect(xml).toContain('>suspended-fourth</kind>')
    expect(xml).toContain('>dominant-ninth</kind>')
    expect(xml).toMatch(/<kind text="add9">major<\/kind>[\s\S]*?<degree-value>9<\/degree-value>\s*<degree-alter>0<\/degree-alter>\s*<degree-type>add<\/degree-type>/)

    // F#o7 in G major spells F# (diatonic #4/7) with diminished-seventh
    const sharpDim = chartFromMeasures(
      { title: 'Sharp Dim', style: 'medium-swing', key: 7, bpm: 120 },
      [['F#o7']],
    )
    const sharpDimXml = chartToMusicXml(sharpDim)
    assertWellFormedXml(sharpDimXml)
    expect(sharpDimXml).toMatch(/<root-step>F<\/root-step>\s*<root-alter>1<\/root-alter>[\s\S]*?<kind[^>]*>diminished-seventh<\/kind>/)

    const edgeChart: Chart = {
      format: 'openstand-chart',
      version: 1,
      title: 'Edge Chords',
      style: 'medium-swing',
      key: 0,
      bpm: 120,
      time: [4, 4],
      bars: [
        { chords: [{ symbol: null, beats: 2 }, { symbol: 'Cfoo', beats: 2 }], cells: 4 },
        { chords: [{ symbol: 'Xbar', beats: 4 }], cells: 4, barline: 'final' },
      ],
    }
    const edgeXml = chartToMusicXml(edgeChart)
    assertWellFormedXml(edgeXml)
    expect(edgeXml).toContain('<kind text="N.C.">none</kind>')
    expect(edgeXml).toContain('<kind text="foo">other</kind>')
    expect(edgeXml).toContain('<kind text="Xbar">other</kind>')
  })

  test('applies transpose (+2) to key fifths, chord roots, and bass, and handles minor mode', () => {
    const major = chartFromMeasures(
      { title: 'Transpose Test', style: 'medium-swing', key: 0, bpm: 120 },
      [['C^7', 'G/B']],
    )
    const xml = chartToMusicXml(major, 2) // C -> D (2 sharps)
    assertWellFormedXml(xml)
    expect(xml).toMatch(/<key>\s*<fifths>2<\/fifths>\s*<mode>major<\/mode>\s*<\/key>/)
    expect(xml).toMatch(/<root-step>D<\/root-step>[\s\S]*?<kind[^>]*>major-seventh<\/kind>/)
    expect(xml).toMatch(/<root-step>A<\/root-step>[\s\S]*?<bass>\s*<bass-step>C<\/bass-step>\s*<bass-alter>1<\/bass-alter>\s*<\/bass>/)

    const minor = chartFromMeasures(
      { title: 'Minor Key', style: 'medium-swing', key: 0, minor: true, bpm: 120 },
      [['C-7']],
    )
    const minorXml = chartToMusicXml(minor, 2) // Cm -> Dm (1 flat)
    assertWellFormedXml(minorXml)
    expect(minorXml).toMatch(/<key>\s*<fifths>-1<\/fifths>\s*<mode>minor<\/mode>\s*<\/key>/)
    expect(minorXml).toMatch(/<root-step>D<\/root-step>[\s\S]*?<kind[^>]*>minor-seventh<\/kind>/)
  })

  test('renders repeats, endings, rehearsal marks, segno, coda, directives, barlines, rowStart, empty bars, and omits alt', () => {
    let chart = chartFromMeasures(
      { title: 'Form & Markings', style: 'medium-swing', key: 0, bpm: 120 },
      [['C^7(Eb^7)'], [], ['D-7'], ['G7'], ['C^7'], ['F^7'], ['G7'], ['C^7']],
    )
    chart = updateBar(chart, 0, { section: 'A', repeatStart: true, segno: true })
    chart = updateBar(chart, 1, { barline: 'double' })
    chart = updateBar(chart, 2, { ending: 1 })
    chart = updateBar(chart, 3, { repeatEnd: true, repeatTimes: 3 })
    chart = updateBar(chart, 4, { ending: 2, coda: true, rowStart: true })
    chart = updateBar(chart, 5, { section: 'B', directive: 'D.S. al Coda' })
    chart = updateBar(chart, 6, { coda: true })
    chart = updateBar(chart, 7, { directive: 'Fine', barline: 'final' })

    const xml = chartToMusicXml(chart)
    assertWellFormedXml(xml)

    expect(xml).toContain('<rehearsal>A</rehearsal>')
    expect(xml).toContain('<rehearsal>B</rehearsal>')
    expect(xml).toContain('<repeat direction="forward"/>')
    expect(xml).toContain('<repeat direction="backward" times="3"/>')
    expect(xml).toContain('<ending number="1" type="start"/>')
    expect(xml).toContain('<ending number="1" type="stop"/>')
    expect(xml).toContain('<ending number="2" type="start"/>')
    expect(xml).toContain('<ending number="2" type="discontinue"/>')
    expect(xml).toContain('<bar-style>light-light</bar-style>')
    expect(xml).toContain('<bar-style>light-heavy</bar-style>')
    expect(xml).toContain('<segno/>')
    expect(xml).toContain('<sound segno="segno"/>')
    expect(xml).toContain('<coda/>')
    expect(xml).toContain('<sound tocoda="coda"/>')
    expect(xml).toContain('<sound coda="coda"/>')
    expect(xml).toContain('<sound dalsegno="segno"/>')
    expect(xml).toContain('<sound fine="yes"/>')
    expect(xml).toContain('<print new-system="yes"/>')
    expect(xml).toContain('<notehead>slash</notehead>')
    expect(xml).toContain('<stem>none</stem>')
    // Substitution alt must never appear, even as a comment
    expect(xml).not.toContain('Eb')
    expect(xml).not.toContain('<!--')

    // Empty bar (bar 2) has no harmony, and full-bar slash notes summing to 4 * divisions
    const measures = measureBodies(xml)
    expect(measures[1]).not.toContain('<harmony>')
    const divisions = Number(/<divisions>(\d+)<\/divisions>/.exec(xml)![1])
    expect(noteDurationSum(measures[1])).toBe(4 * divisions)
  })

  test('handles per-bar time signature changes with exact measure durations', () => {
    const base = chartFromMeasures(
      { title: 'Meter Shift', style: 'medium-swing', key: 0, bpm: 120 },
      [['C^7'], ['D-7', 'G7'], ['C^7'], ['F^7']],
    )
    const chart = setBarTime(base, 1, [3, 4], true)
    const xml = chartToMusicXml(chart)
    assertWellFormedXml(xml)

    const divisions = Number(/<divisions>(\d+)<\/divisions>/.exec(xml)![1])
    const measures = measureBodies(xml)
    expect(measures[1]).toContain('<beats>3</beats>')
    expect(measures[1]).toContain('<beat-type>4</beat-type>')
    expect(measures[2]).toContain('<beats>4</beats>')
    expect(noteDurationSum(measures[0])).toBe(4 * divisions)
    expect(noteDurationSum(measures[1])).toBe(3 * divisions)
    expect(noteDurationSum(measures[2])).toBe(4 * divisions)
    expect(noteDurationSum(measures[3])).toBe(4 * divisions)
  })
})
