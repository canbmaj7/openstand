import { describe, expect, test } from 'vitest'
import { makeBackup, mergeSetlists, parseBackup, remapSetlistTuneIds } from '../src/formats/backup'
import { chartFromMeasures } from '../src/music/chart'
import type { Setlist } from '../src/music/setlist'
import { EXAMPLES, type Tune } from '../src/music/songs'
import { getStyle } from '../src/styles'
import { labFromStyle } from '../src/styles/lab'

const customChart = chartFromMeasures(
  { title: 'Backup Blues', composer: 'Tester', style: 'medium-swing', key: 5, bpm: 132 },
  [['F7'], ['Bb7'], ['F7'], ['C-7']],
)

const userTune: Tune = {
  id: 'old-tune-id-1',
  chart: customChart,
  source: 'own',
  playlist: 'My tunes',
  addedAt: 1700000000000,
}

const sampleSetlist: Setlist = {
  id: 'set-1',
  name: 'Friday Set',
  tuneIds: [EXAMPLES[0].id, userTune.id],
  updatedAt: 1700000001000,
}

const sampleStyle = { ...labFromStyle(getStyle('medium-swing')), name: 'Warm Swing' }

describe('backup format (.json)', () => {
  test('round-trips non-example tunes, setlists and styles, excluding examples', () => {
    const fixedTime = '2026-11-25T00:00:00.000Z'
    const json = makeBackup([EXAMPLES[0], userTune], [sampleSetlist], [sampleStyle], fixedTime)
    const parsed = parseBackup(json)

    expect(parsed.format).toBe('openstand-backup')
    expect(parsed.version).toBe(1)
    expect(parsed.exportedAt).toBe(fixedTime)
    expect(parsed.invalidTunes).toBe(0)
    expect(parsed.tunes).toEqual([
      {
        id: userTune.id,
        chart: userTune.chart,
        source: 'own',
        playlist: 'My tunes',
        addedAt: userTune.addedAt,
      },
    ])
    expect(parsed.setlists).toEqual([sampleSetlist])
    expect(parsed.styles).toEqual([sampleStyle])
  })

  test('skips and counts invalid tunes and invalid styles without rejecting the backup', () => {
    const raw = JSON.parse(makeBackup([userTune], [sampleSetlist], [sampleStyle], '2026-11-25T00:00:00.000Z')) as {
      tunes: unknown[]
      styles: unknown[]
    }
    raw.tunes.push({
      id: 'bad-1',
      chart: { format: 'openstand-chart', version: 1, title: 'Broken', style: 'medium-swing', key: 0, bpm: 120, time: [4, 4], bars: [] },
      source: 'import',
      addedAt: 10,
    })
    raw.tunes.push({ source: 'unknown-source', chart: customChart, addedAt: 10 })
    raw.styles.push({ base: 'nonexistent-style', name: 'Bad' })

    const parsed = parseBackup(JSON.stringify(raw))
    expect(parsed.tunes).toHaveLength(1)
    expect(parsed.invalidTunes).toBe(2)
    expect(parsed.styles).toHaveLength(1)
  })

  test('rejects invalid JSON, wrong format/version, or malformed setlists', () => {
    expect(() => parseBackup('{ broken')).toThrow(/Invalid JSON/i)
    expect(() => parseBackup('[]')).toThrow(/JSON object/i)

    const base = JSON.parse(makeBackup([userTune], [sampleSetlist], [])) as Record<string, unknown>
    expect(() => parseBackup(JSON.stringify({ ...base, format: 'openstand-chart' }))).toThrow(/openstand-backup/i)
    expect(() => parseBackup(JSON.stringify({ ...base, version: 2 }))).toThrow(/version 1/i)
    expect(() => parseBackup(JSON.stringify({ ...base, exportedAt: 'not-a-date' }))).toThrow(/exportedAt/i)
    expect(() =>
      parseBackup(JSON.stringify({ ...base, setlists: [{ id: 's1', name: 'Bad', tuneIds: [123], updatedAt: 1 }] })),
    ).toThrow(/tuneIds/i)
  })

  test('remapSetlistTuneIds maps old tune ids and preserves unmapped example ids', () => {
    const idMap = new Map([
      ['old-1', 'new-1'],
      ['old-2', 'new-1'],
    ])
    expect(remapSetlistTuneIds(['jazz-blues-f', 'old-1', 'old-2', 'bossa-c'], idMap)).toEqual([
      'jazz-blues-f',
      'new-1',
      'bossa-c',
    ])
  })

  test('mergeSetlists skips identical setlists and renames conflicting ones with (restored)', () => {
    const existing: Setlist[] = [
      { id: 'same', name: 'Club Set', tuneIds: ['jazz-blues-f', 'new-1'], updatedAt: 10 },
      { id: 'conflict', name: 'Sunday Set', tuneIds: ['jazz-blues-f'], updatedAt: 20 },
    ]
    const incoming: Setlist[] = [
      { id: 'same', name: 'Club Set', tuneIds: ['jazz-blues-f', 'old-1'], updatedAt: 99 },
      { id: 'conflict', name: 'Sunday Set', tuneIds: ['jazz-blues-f', 'old-1'], updatedAt: 30 },
      { id: 'fresh', name: 'New Set', tuneIds: ['old-1'], updatedAt: 40 },
    ]
    const idMap = new Map([['old-1', 'new-1']])
    let seq = 0
    const merged = mergeSetlists(existing, incoming, idMap, () => `restored-${++seq}`)

    expect(merged.skipped).toBe(1)
    expect(merged.added).toBe(2)
    expect(merged.toAdd).toEqual([
      { id: 'restored-1', name: 'Sunday Set (restored)', tuneIds: ['jazz-blues-f', 'new-1'], updatedAt: 30 },
      { id: 'fresh', name: 'New Set', tuneIds: ['new-1'], updatedAt: 40 },
    ])
  })
})
