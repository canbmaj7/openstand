// The tune library, stored in the browser (IndexedDB). Nothing leaves the device.

import Dexie, { type EntityTable } from 'dexie'
import { mergeSetlists, type ParsedBackup, type RestoreSummary } from '../formats/backup'
import { mapStyle } from '../formats/ireal'
import type { Chart } from '../music/chart'
import type { Setlist } from '../music/setlist'
import type { Tune } from '../music/songs'
import { mergeMyStyles } from './myStyles'

const db = new Dexie('openstand') as Dexie & {
  tunes: EntityTable<Tune, 'id'>
  setlists: EntityTable<Setlist, 'id'>
}

db.version(1).stores({ tunes: 'id, playlist, addedAt' })
db.version(2).stores({ tunes: 'id, playlist, addedAt', setlists: 'id, updatedAt' })

export type { Setlist }

export const STORAGE_ERROR = "Couldn't save to this browser's storage."

export async function loadTunes(): Promise<Tune[]> {
  try {
    const tunes = await db.tunes.orderBy('addedAt').toArray()
    // Imported tunes follow the current style mapping, so new styles reach tunes imported earlier
    return tunes.map((t) =>
      t.chart.sourceStyle ? { ...t, chart: { ...t.chart, style: mapStyle(t.chart.sourceStyle, t.chart.time) } } : t,
    )
  } catch {
    return []
  }
}

// A stable id from the chart's content, so importing the same tune twice doesn't duplicate it
export async function chartId(chart: Chart): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(chart))
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data))
  return Array.from(hash.slice(0, 9), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function addTunes(
  charts: Chart[],
  source: Tune['source'],
  playlist: string,
  onError?: (message: string) => void,
): Promise<Tune[]> {
  const now = Date.now()
  const tunes = await Promise.all(
    charts.map(async (chart, i): Promise<Tune> => ({ id: await chartId(chart), chart, source, playlist, addedAt: now + i })),
  )
  try {
    await db.tunes.bulkPut(tunes)
  } catch {
    onError?.(STORAGE_ERROR)
  }
  return tunes
}

export async function removePlaylist(playlist: string): Promise<void> {
  try {
    await db.tunes.where('playlist').equals(playlist).delete()
  } catch {
    // Storage may be closed or unavailable
  }
}

export async function removeTune(id: string): Promise<void> {
  try {
    await db.tunes.delete(id)
  } catch {
    // Storage may be closed or unavailable
  }
}

export async function saveTune(tune: Tune, onError?: (message: string) => void): Promise<boolean> {
  try {
    await db.tunes.put(tune)
    return true
  } catch {
    onError?.(STORAGE_ERROR)
    return false
  }
}

export async function loadSetlists(onError?: (message: string) => void): Promise<Setlist[]> {
  try {
    return await db.setlists.orderBy('updatedAt').reverse().toArray()
  } catch {
    onError?.(STORAGE_ERROR)
    return []
  }
}

export async function saveSetlist(setlist: Setlist, onError?: (message: string) => void): Promise<boolean> {
  try {
    await db.setlists.put(setlist)
    return true
  } catch {
    onError?.(STORAGE_ERROR)
    return false
  }
}

export async function removeSetlist(id: string, onError?: (message: string) => void): Promise<boolean> {
  try {
    await db.setlists.delete(id)
    return true
  } catch {
    onError?.(STORAGE_ERROR)
    return false
  }
}

export async function restoreBackup(backup: ParsedBackup, onError?: (message: string) => void): Promise<RestoreSummary> {
  // Compute SHA-256 chart ids before opening the Dexie transaction so async crypto never stalls IDB.
  const computed = await Promise.all(backup.tunes.map(async (bt) => ({ bt, newId: await chartId(bt.chart) })))

  try {
    const { tunesAdded, tunesSkipped, setlistsAdded, setlistsSkipped } = await db.transaction(
      'rw',
      db.tunes,
      db.setlists,
      async () => {
        const existingTunes = await db.tunes.toArray()
        const existingById = new Map(existingTunes.map((t) => [t.id, t]))
        const existingIds = new Set(existingById.keys())
        const idMap = new Map<string, string>()
        const tunesToAdd: Tune[] = []
        let added = 0
        let skipped = 0

        for (const { bt, newId } of computed) {
          const existingSameId = bt.id ? existingById.get(bt.id) : undefined
          if (bt.id && existingSameId && JSON.stringify(existingSameId.chart) === JSON.stringify(bt.chart)) {
            idMap.set(bt.id, bt.id)
            skipped++
            continue
          }
          if (bt.id) idMap.set(bt.id, newId)
          if (existingIds.has(newId)) {
            skipped++
            continue
          }
          existingIds.add(newId)
          tunesToAdd.push({
            id: newId,
            chart: bt.chart,
            source: bt.source,
            ...(bt.playlist !== undefined ? { playlist: bt.playlist } : {}),
            addedAt: bt.addedAt,
          })
          added++
        }

        const existingSetlists = await db.setlists.toArray()
        const setlistMerge = mergeSetlists(existingSetlists, backup.setlists, idMap)

        if (tunesToAdd.length) await db.tunes.bulkPut(tunesToAdd)
        if (setlistMerge.toAdd.length) await db.setlists.bulkPut(setlistMerge.toAdd)

        return {
          tunesAdded: added,
          tunesSkipped: skipped,
          setlistsAdded: setlistMerge.added,
          setlistsSkipped: setlistMerge.skipped,
        }
      },
    )

    const styleMerge = mergeMyStyles(backup.styles)
    return {
      tunes: { added: tunesAdded, skipped: tunesSkipped, invalid: backup.invalidTunes },
      setlists: { added: setlistsAdded, skipped: setlistsSkipped },
      styles: { added: styleMerge.added, skipped: styleMerge.skipped },
    }
  } catch {
    onError?.(STORAGE_ERROR)
    throw new Error(STORAGE_ERROR)
  }
}
