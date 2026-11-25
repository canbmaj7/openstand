// Serialization, validation, and merge helpers for full-library .json backups (format version 1).

import type { Chart } from '../music/chart'
import type { Setlist } from '../music/setlist'
import type { Tune } from '../music/songs'
import { normalizeLab, type LabStyle } from '../styles/lab'
import { validateChart } from './chartFile'

export type BackupSource = Exclude<Tune['source'], 'example'>

export interface BackupTune {
  id?: string
  chart: Chart
  source: BackupSource
  playlist?: string
  addedAt: number
}

export interface Backup {
  format: 'openstand-backup'
  version: 1
  exportedAt: string
  tunes: BackupTune[]
  setlists: Setlist[]
  styles: LabStyle[]
}

export interface ParsedBackup extends Backup {
  invalidTunes: number
}

export interface RestoreSummary {
  tunes: { added: number; skipped: number; invalid: number }
  setlists: { added: number; skipped: number }
  styles: { added: number; skipped: number }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const sameStringArray = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i])

function defaultSetlistId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function makeBackup(
  tunes: readonly Tune[],
  setlists: readonly Setlist[],
  styles: readonly LabStyle[],
  exportedAt = new Date().toISOString(),
): string {
  const backup: Backup = {
    format: 'openstand-backup',
    version: 1,
    exportedAt,
    tunes: tunes
      .filter((t) => t.source !== 'example')
      .map((t) => ({
        id: t.id,
        chart: t.chart,
        source: t.source as BackupSource,
        ...(t.playlist !== undefined ? { playlist: t.playlist } : {}),
        addedAt: t.addedAt,
      })),
    setlists: setlists.map((s) => ({ ...s, tuneIds: [...s.tuneIds] })),
    styles: [...styles],
  }
  return JSON.stringify(backup, null, 2)
}

function parseBackupTune(raw: unknown): BackupTune | null {
  if (!isRecord(raw)) return null
  if (raw.id !== undefined && (typeof raw.id !== 'string' || !raw.id.trim())) return null
  if (raw.source !== 'import' && raw.source !== 'link' && raw.source !== 'own') return null
  if (raw.playlist !== undefined && typeof raw.playlist !== 'string') return null
  if (typeof raw.addedAt !== 'number' || !Number.isFinite(raw.addedAt) || raw.addedAt < 0) return null
  try {
    const chart = validateChart(raw.chart)
    return {
      ...(raw.id !== undefined ? { id: raw.id } : {}),
      chart,
      source: raw.source,
      ...(raw.playlist !== undefined ? { playlist: raw.playlist } : {}),
      addedAt: raw.addedAt,
    }
  } catch {
    return null
  }
}

function validateSetlist(raw: unknown, index: number): Setlist {
  if (!isRecord(raw)) throw new Error(`Invalid setlist ${index + 1}: expected an object.`)
  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    throw new Error(`Invalid setlist ${index + 1}: "id" must be a non-empty string.`)
  }
  if (typeof raw.name !== 'string') {
    throw new Error(`Invalid setlist ${index + 1}: "name" must be a string.`)
  }
  if (!Array.isArray(raw.tuneIds) || !raw.tuneIds.every((id) => typeof id === 'string')) {
    throw new Error(`Invalid setlist ${index + 1}: "tuneIds" must be an array of strings.`)
  }
  if (typeof raw.updatedAt !== 'number' || !Number.isFinite(raw.updatedAt)) {
    throw new Error(`Invalid setlist ${index + 1}: "updatedAt" must be a number.`)
  }
  return { id: raw.id, name: raw.name, tuneIds: [...raw.tuneIds], updatedAt: raw.updatedAt }
}

export function parseBackup(text: string): ParsedBackup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON: could not parse the backup file.')
  }
  if (!isRecord(data)) throw new Error('Invalid backup file: expected a JSON object.')
  if (data.format !== 'openstand-backup') {
    throw new Error('Invalid backup format: expected "openstand-backup".')
  }
  if (data.version !== 1) {
    throw new Error('Unsupported backup version: expected version 1.')
  }
  if (typeof data.exportedAt !== 'string' || Number.isNaN(Date.parse(data.exportedAt))) {
    throw new Error('Invalid backup: "exportedAt" must be a valid ISO date string.')
  }
  if (!Array.isArray(data.tunes)) throw new Error('Invalid backup: "tunes" must be an array.')
  if (!Array.isArray(data.setlists)) throw new Error('Invalid backup: "setlists" must be an array.')
  if (!Array.isArray(data.styles)) throw new Error('Invalid backup: "styles" must be an array.')

  const tunes: BackupTune[] = []
  let invalidTunes = 0
  for (const raw of data.tunes) {
    const parsed = parseBackupTune(raw)
    if (parsed) tunes.push(parsed)
    else invalidTunes++
  }

  const setlists = data.setlists.map((raw, i) => validateSetlist(raw, i))
  const styles = data.styles.map(normalizeLab).filter((s): s is LabStyle => s !== null)

  return {
    format: 'openstand-backup',
    version: 1,
    exportedAt: data.exportedAt,
    tunes,
    setlists,
    styles,
    invalidTunes,
  }
}

export function remapSetlistTuneIds(tuneIds: readonly string[], idMap: ReadonlyMap<string, string>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of tuneIds) {
    const mapped = idMap.get(id) ?? id
    if (!seen.has(mapped)) {
      seen.add(mapped)
      out.push(mapped)
    }
  }
  return out
}

export function mergeSetlists(
  existing: readonly Setlist[],
  incoming: readonly Setlist[],
  idMap: ReadonlyMap<string, string>,
  makeId: () => string = defaultSetlistId,
): { toAdd: Setlist[]; added: number; skipped: number } {
  const byId = new Map(existing.map((s) => [s.id, s]))
  const toAdd: Setlist[] = []
  let skipped = 0

  for (const item of incoming) {
    const tuneIds = remapSetlistTuneIds(item.tuneIds, idMap)
    const current = byId.get(item.id)
    if (!current) {
      const added: Setlist = { ...item, tuneIds }
      byId.set(added.id, added)
      toAdd.push(added)
      continue
    }
    if (current.name === item.name && sameStringArray(current.tuneIds, tuneIds)) {
      skipped++
      continue
    }
    let nextId = makeId()
    while (byId.has(nextId)) nextId = makeId()
    const restored: Setlist = {
      id: nextId,
      name: `${item.name} (restored)`,
      tuneIds,
      updatedAt: item.updatedAt,
    }
    byId.set(restored.id, restored)
    toAdd.push(restored)
  }

  return { toAdd, added: toAdd.length, skipped }
}
