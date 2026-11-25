import { describe, expect, test } from 'vitest'
import { chartFromMeasures } from '../src/music/chart'
import type { Tune } from '../src/music/songs'
import { parseTuneSort, sortTunes, tuneMatchesQuery } from '../src/music/sortTunes'

function makeTune(
  id: string,
  title: string,
  opts: { composer?: string; style?: string; sourceStyle?: string; key?: number; minor?: boolean } = {},
): Tune {
  return {
    id,
    chart: chartFromMeasures(
      {
        title,
        composer: opts.composer,
        style: opts.style ?? 'medium-swing',
        sourceStyle: opts.sourceStyle,
        key: opts.key ?? 0,
        minor: opts.minor,
        bpm: 120,
      },
      [['C^7']],
    ),
    source: 'own',
    addedAt: 0,
  }
}

const styleOf = (t: Tune) => t.chart.sourceStyle ?? t.chart.style

describe('parseTuneSort', () => {
  test('accepts valid sort keys and falls back to title for unknown values', () => {
    expect(parseTuneSort('title')).toBe('title')
    expect(parseTuneSort('composer')).toBe('composer')
    expect(parseTuneSort('style')).toBe('style')
    expect(parseTuneSort('key')).toBe('key')

    expect(parseTuneSort(null)).toBe('title')
    expect(parseTuneSort(undefined)).toBe('title')
    expect(parseTuneSort('')).toBe('title')
    expect(parseTuneSort('bpm')).toBe('title')
    expect(parseTuneSort(42)).toBe('title')
  })
})

describe('sortTunes', () => {
  test('returns a new array without mutating the input', () => {
    const input = [makeTune('b', 'Beta'), makeTune('a', 'Alpha')]
    const snapshot = [...input]
    const sorted = sortTunes(input, 'title', styleOf)

    expect(sorted).not.toBe(input)
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b'])
    expect(input).toEqual(snapshot)
  })

  test('title sort uses base sensitivity, numeric order, and keeps leading articles', () => {
    const tunes = [
      makeTune('t10', 'Tune 10'),
      makeTune('the', 'The Days'),
      makeTune('t2', 'tune 2'),
      makeTune('a', 'A Night'),
      makeTune('all', 'All Blues'),
    ]

    expect(sortTunes(tunes, 'title', styleOf).map((t) => t.id)).toEqual(['a', 'all', 'the', 't2', 't10'])
  })

  test('composer sort puts empty composers last and breaks ties by title', () => {
    const tunes = [
      makeTune('none1', 'Zeta'),
      makeTune('evans2', 'Waltz for Debby', { composer: 'Bill Evans' }),
      makeTune('none2', 'Alpha', { composer: '   ' }),
      makeTune('evans1', 'Blue in Green', { composer: 'bill evans' }),
      makeTune('davis', 'So What', { composer: 'Miles Davis' }),
    ]

    expect(sortTunes(tunes, 'composer', styleOf).map((t) => t.id)).toEqual([
      'evans1',
      'evans2',
      'davis',
      'none2',
      'none1',
    ])
  })

  test('style sort uses the resolved style name and breaks ties by title', () => {
    const overrides: Record<string, string> = { a: 'Bossa Nova' }
    const tunes = [
      makeTune('a', 'Zebra', { style: 'pop-rock' }),
      makeTune('b', 'Beta', { style: 'medium-swing', sourceStyle: 'Bossa Nova' }),
      makeTune('c', 'Alpha', { style: 'aksak', sourceStyle: 'Aksak' }),
    ]

    expect(sortTunes(tunes, 'style', (t) => overrides[t.id] ?? styleOf(t)).map((t) => t.id)).toEqual(['c', 'b', 'a'])
  })

  test('key sort orders pitch classes C..B with major before minor and breaks ties by title', () => {
    const tunes = [
      makeTune('b-maj', 'B Major', { key: 11 }),
      makeTune('c-min', 'C Minor', { key: 0, minor: true }),
      makeTune('c-maj-z', 'Zed in C', { key: 0 }),
      makeTune('c-maj-a', 'Ace in C', { key: 0 }),
      makeTune('d-min', 'D Minor', { key: 2, minor: true }),
      makeTune('d-maj', 'D Major', { key: 2 }),
    ]

    expect(sortTunes(tunes, 'key', styleOf).map((t) => t.id)).toEqual([
      'c-maj-a',
      'c-maj-z',
      'c-min',
      'd-maj',
      'd-min',
      'b-maj',
    ])
  })
})

describe('tuneMatchesQuery', () => {
  test('matches title, composer, and resolved style name case- and accent-insensitively', () => {
    const bossaTune = makeTune('afro-68', 'Afro 6/8 Minor', {
      composer: 'Antônio Carlos',
      style: 'bossa-nova',
      sourceStyle: 'Bossa Nova',
    })
    const overrideTune = makeTune('overridden', 'Blue Sketch', { style: 'medium-swing' })
    const resolveStyle = (t: Tune) => (t.id === 'overridden' ? 'Aksak' : styleOf(t))

    expect(tuneMatchesQuery(bossaTune, '', resolveStyle)).toBe(true)
    expect(tuneMatchesQuery(bossaTune, 'afro', resolveStyle)).toBe(true)
    expect(tuneMatchesQuery(bossaTune, 'antonio', resolveStyle)).toBe(true)
    expect(tuneMatchesQuery(bossaTune, 'bossa', resolveStyle)).toBe(true)
    expect(tuneMatchesQuery(overrideTune, 'aksak', resolveStyle)).toBe(true)
    expect(tuneMatchesQuery(bossaTune, 'reggae', resolveStyle)).toBe(false)
  })
})
