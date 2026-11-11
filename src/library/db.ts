// The tune library, stored in the browser (IndexedDB). Nothing leaves the device.

import Dexie, { type EntityTable } from 'dexie'
import { mapStyle } from '../formats/ireal'
import type { Chart } from '../music/chart'
import type { Tune } from '../music/songs'

const db = new Dexie('openstand') as Dexie & { tunes: EntityTable<Tune, 'id'> }

db.version(1).stores({ tunes: 'id, playlist, addedAt' })

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
