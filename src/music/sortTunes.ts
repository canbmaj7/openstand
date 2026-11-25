import type { Tune } from './songs'

export type TuneSort = 'title' | 'composer' | 'style' | 'key'

const VALID_SORTS = new Set<TuneSort>(['title', 'composer', 'style', 'key'])

/** Normalize an untrusted sort value (e.g. from localStorage) to a valid TuneSort. */
export function parseTuneSort(value: unknown): TuneSort {
  return typeof value === 'string' && VALID_SORTS.has(value as TuneSort) ? (value as TuneSort) : 'title'
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
}

/** Return a new array of tunes sorted by title, composer, style, or key. */
export function sortTunes(tunes: readonly Tune[], sort: TuneSort, styleNameOf: (t: Tune) => string): Tune[] {
  return [...tunes].sort((a, b) => {
    if (sort === 'composer') {
      const ca = (a.chart.composer ?? '').trim()
      const cb = (b.chart.composer ?? '').trim()
      if (!ca && cb) return 1
      if (ca && !cb) return -1
      if (ca && cb) {
        const diff = compareText(ca, cb)
        if (diff !== 0) return diff
      }
    } else if (sort === 'style') {
      const diff = compareText(styleNameOf(a), styleNameOf(b))
      if (diff !== 0) return diff
    } else if (sort === 'key') {
      const keyDiff = (((a.chart.key % 12) + 12) % 12) - (((b.chart.key % 12) + 12) % 12)
      if (keyDiff !== 0) return keyDiff
      const modeDiff = (a.chart.minor ? 1 : 0) - (b.chart.minor ? 1 : 0)
      if (modeDiff !== 0) return modeDiff
    }
    return compareText(a.chart.title, b.chart.title)
  })
}
