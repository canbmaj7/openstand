import { describe, expect, test } from 'vitest'
import { parseIrealLinks, parseMusic, unscramble } from '../src/formats/ireal'
import { chartToMusic, irealLink } from '../src/formats/irealWrite'
import { playbackOrder, type Chart, type ChartBar } from '../src/music/chart'

const stripLayout = (b: ChartBar) => {
  const copy = { ...b }
  delete (copy as Partial<ChartBar>).cells
  delete copy.rowStart
  return copy
}

// An original progression written in iReal Pro's text notation:
// A section with first and second endings, a B section, and a final bar.
const MUSIC =
  '{*AT44C^7   |A-7   |D-7 G7 |N1E-7 A7 }' +
  '        |N2D-7 G7 |C6   ]' +
  '[*BF^7   |Bb7   |E-7 A7 |D-7 G7 Z '

const IREALBOOK = `irealbook://${encodeURIComponent(
  ['Test Tune', 'Writer Some', 'Medium Swing', 'C', 'n', MUSIC].join('='),
)}`

// iReal Pro scrambles 50-character blocks; the swap is its own inverse
function scramble(plain: string): string {
  let s = plain.replace(/ {3}/g, 'XyQ').replace(/ \|/g, 'LZ')
  let out = ''
  while (s.length > 51) {
    const block = s.slice(0, 50).split('')
    s = s.slice(50)
    const swapped = block.slice()
    for (let i = 0; i < 5; i++) [swapped[i], swapped[49 - i]] = [block[49 - i], block[i]]
    for (let i = 10; i < 24; i++) [swapped[i], swapped[49 - i]] = [block[49 - i], block[i]]
    out += swapped.join('')
  }
  return out + s
}

describe('iReal Pro links', () => {
  test('reads an irealbook:// link', () => {
    const [list] = parseIrealLinks(IREALBOOK)
    expect(list.charts).toHaveLength(1)
    const chart = list.charts[0]
    expect(chart.title).toBe('Test Tune')
    expect(chart.composer).toBe('Some Writer')
    expect(chart.style).toBe('medium-swing')
    expect(chart.key).toBe(0)
    expect(chart.time).toEqual([4, 4])
  })

  test('reads bars, chord lengths and markings', () => {
    const { bars } = parseMusic(MUSIC, [4, 4])
    const played = bars.filter((b) => !b.spacer)
    expect(played.map((b) => b.chords.map((c) => `${c.symbol}:${c.beats}`).join(' '))).toEqual([
      'C^7:4',
      'A-7:4',
      'D-7:2 G7:2',
      'E-7:2 A7:2',
      'D-7:2 G7:2',
      'C6:4',
      'F^7:4',
      'Bb7:4',
      'E-7:2 A7:2',
      'D-7:2 G7:2',
    ])
    expect(played[0]).toMatchObject({ section: 'A', repeatStart: true })
    expect(played[3]).toMatchObject({ ending: 1, repeatEnd: true })
    expect(played[4]).toMatchObject({ ending: 2 })
    expect(played[5].barline).toBe('double')
    expect(played[6].section).toBe('B')
    expect(played[9].barline).toBe('final')
  })

  test('unscrambles irealb:// music the same way', () => {
    const plain = MUSIC.replace(/Z $/, 'Z')
    expect(unscramble(scramble(plain))).toBe(plain)
    const link = `irealb://${encodeURIComponent(
      ['Test Tune', 'Writer Some', '', 'Bossa Nova', 'A-', '', `1r34LbKcu7${scramble(plain)}`, '', '120', '3'].join('='),
    )}===My%20List`
    const [list] = parseIrealLinks(link)
    expect(list.name).toBe('My List')
    expect(list.charts[0]).toMatchObject({ style: 'bossa-nova', key: 9, minor: true, bpm: 120 })
    expect(list.charts[0].bars.filter((b) => !b.spacer)).toHaveLength(10)
  })

  test('finds several links in pasted HTML', () => {
    const html = `<a href="${IREALBOOK}">one</a> and <a href="${IREALBOOK}">two</a>`
    expect(parseIrealLinks(html)).toHaveLength(2)
  })

  test('repeats bar with x right before a new section, repeat start, or end of string', () => {
    const music = '[*AT44C   |x[*BF   |x{*AG   |x'
    const { bars, time } = parseMusic(music, [4, 4])
    expect(bars.map((b) => b.chords)).toEqual([
      [{ symbol: 'C', beats: 4 }],
      [{ symbol: 'C', beats: 4 }],
      [{ symbol: 'F', beats: 4 }],
      [{ symbol: 'F', beats: 4 }],
      [{ symbol: 'G', beats: 4 }],
      [{ symbol: 'G', beats: 4 }],
    ])

    const chart: Chart = {
      format: 'openstand-chart',
      version: 1,
      title: 'Repeat Section Test',
      style: 'medium-swing',
      key: 0,
      bpm: 120,
      time,
      bars,
    }
    const [back] = parseIrealLinks(irealLink([chart]))[0].charts
    expect(back.bars.map((b) => b.chords)).toEqual(bars.map((b) => b.chords))
  })

  test('marks bracket-opened row padding before sections or codas as spacers, unlike mid-section blank bars', () => {
    const music = '[*iT44C   [            {*AD-7   |    |G7   [        [*BF^7   [        [QC6   Z'
    const { bars, time } = parseMusic(music, [4, 4])
    expect(bars[0].chords).toEqual([{ symbol: 'C', beats: 4 }])
    expect(bars[1]).toMatchObject({ chords: [], spacer: true })
    expect(bars[2]).toMatchObject({ section: 'A', repeatStart: true })
    expect(bars[3].chords).toEqual([])
    expect(bars[3].spacer).toBeUndefined()
    expect(bars[4].chords).toEqual([{ symbol: 'G7', beats: 4 }])
    expect(bars[5]).toMatchObject({ chords: [], spacer: true })
    expect(bars[6]).toMatchObject({ section: 'B' })
    expect(bars[7]).toMatchObject({ chords: [], spacer: true })
    expect(bars[8]).toMatchObject({ coda: true, barline: 'final' })

    const rt = parseMusic(chartToMusic({ format: 'openstand-chart', version: 1, title: 'Spacers', style: 'medium-swing', key: 0, bpm: 120, time, bars: bars.map((b, i) => (i === 3 ? { ...b, chords: [{ symbol: 'D-7', beats: 4 }] } : b)) }), [4, 4])
    expect(rt.bars.map((b) => Boolean(b.spacer))).toEqual(bars.map((b) => Boolean(b.spacer)))
  })

  test('fits repeated bars (x and r) to the new bar length on mid-tune time changes', () => {
    const music = '[*AT44C   |T24x |T44x |D-7 G7 |T24x |T44F   |T12x |T68x |T44C   |G7   |T24r   |    Z'
    const { bars, time } = parseMusic(music, [4, 4])
    expect(bars.map((b) => b.chords)).toEqual([
      [{ symbol: 'C', beats: 4 }],
      [{ symbol: 'C', beats: 2 }],
      [{ symbol: 'C', beats: 4 }],
      [{ symbol: 'D-7', beats: 2 }, { symbol: 'G7', beats: 2 }],
      [{ symbol: 'D-7', beats: 1 }, { symbol: 'G7', beats: 1 }],
      [{ symbol: 'F', beats: 4 }],
      [{ symbol: 'F', beats: 6 }],
      [{ symbol: 'F', beats: 3 }],
      [{ symbol: 'C', beats: 4 }],
      [{ symbol: 'G7', beats: 4 }],
      [{ symbol: 'C', beats: 2 }],
      [{ symbol: 'G7', beats: 2 }],
    ])

    const chart: Chart = {
      format: 'openstand-chart',
      version: 1,
      title: 'Time Repeat Test',
      style: 'medium-swing',
      key: 0,
      bpm: 120,
      time,
      bars,
    }
    const [back] = parseIrealLinks(irealLink([chart]))[0].charts
    expect(back.bars.map(stripLayout)).toEqual(bars.map(stripLayout))
  })

  test('ignores N0 endings and omits default 2x repeat counts for clean round-trip', () => {
    const music = '{*AT44C   |N1G7   }N2F   }N0C<4.>   |D-7<2x> }G7<3x> Z'
    const { bars, time } = parseMusic(music, [4, 4])
    expect(bars[1].ending).toBe(1)
    expect(bars[2].ending).toBe(2)
    expect(bars[3].ending).toBeUndefined()
    expect(bars[3].comment).toBe('4.')
    expect(bars[4].repeatTimes).toBeUndefined()
    expect(bars[5].repeatTimes).toBe(3)

    const chart: Chart = {
      format: 'openstand-chart',
      version: 1,
      title: 'Marks Test',
      style: 'medium-swing',
      key: 0,
      bpm: 120,
      time,
      bars,
    }
    const [back] = parseIrealLinks(irealLink([chart]))[0].charts
    expect(back.bars.map(stripLayout)).toEqual(bars.map(stripLayout))
  })

  test('marks blank padding after } or ] before a section, repeat, coda, or segno as spacers, unlike mid-section blank bars', () => {
    const music =
      '{*AT44C   |F   |G   |C   }        ' +
      '{*BF   |G   ]        ' +
      '[*CC   |    |F   }    ' +
      '[QD-7   |G7   Z'
    const { bars, time } = parseMusic(music, [4, 4])

    // Padding after } before {*B and after ] before [*C and after } before [Q are spacers
    expect(bars[3]).toMatchObject({ repeatEnd: true })
    expect(bars[4]).toMatchObject({ chords: [], spacer: true })
    expect(bars[5]).toMatchObject({ section: 'B', repeatStart: true })
    expect(bars[6]).toMatchObject({ barline: 'double' })
    expect(bars[7]).toMatchObject({ chords: [], spacer: true })
    expect(bars[8]).toMatchObject({ section: 'C' })
    // Mid-section |    | stays a played blank bar (not a spacer)
    expect(bars[9]).toMatchObject({ chords: [] })
    expect(bars[9].spacer).toBeUndefined()
    expect(bars[10]).toMatchObject({ repeatEnd: true })
    expect(bars[11]).toMatchObject({ chords: [], spacer: true })
    expect(bars[12]).toMatchObject({ coda: true })

    // Trailing blank padding after } at the end of a chart is not played
    const trailing = parseMusic('{*AT44C   |F   }        ', [4, 4])
    expect(trailing.bars.filter((b) => !b.spacer)).toHaveLength(2)

    // Round-trip preserves spacers and played bars
    const rtMusic =
      '{*AT44C   |F   |G   |C   }        ' +
      '{*BF   |G   ]        ' +
      '[*CC   |D-7   |F   }    ' +
      '[QD-7   |G7   Z'
    const parsed = parseMusic(rtMusic, [4, 4])
    const chart: Chart = {
      format: 'openstand-chart',
      version: 1,
      title: 'Repeat Padding Round-Trip',
      style: 'medium-swing',
      key: 0,
      bpm: 120,
      time: parsed.time,
      bars: parsed.bars,
    }
    const back = parseMusic(chartToMusic(chart), time)
    expect(back.bars.map((b) => Boolean(b.spacer))).toEqual(parsed.bars.map((b) => Boolean(b.spacer)))
    expect(back.bars.filter((b) => !b.spacer).map(stripLayout)).toEqual(
      parsed.bars.filter((b) => !b.spacer).map(stripLayout),
    )
  })

  test('writes held chord explicitly for a real blank bar in a spacer-like position after ] or }', () => {
    const { bars, time } = parseMusic('[*AT44C   |F G ][*BF   |C   Z', [4, 4])
    const chart: Chart = {
      format: 'openstand-chart',
      version: 1,
      title: 'Blank After Double',
      style: 'medium-swing',
      key: 0,
      bpm: 120,
      time,
      bars: [...bars.slice(0, 2), { chords: [], cells: 4 }, ...bars.slice(2)],
    }

    const reparsed = parseMusic(chartToMusic(chart), time)
    const back: Chart = { ...chart, time: reparsed.time, bars: reparsed.bars }

    expect(playbackOrder(chart)).toHaveLength(5)
    expect(playbackOrder(back)).toHaveLength(5)
    expect(reparsed.bars[2].spacer).toBeUndefined()
    expect(reparsed.bars[2].chords).toEqual([{ symbol: 'G', beats: 4 }])
  })
})
