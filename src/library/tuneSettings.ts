// Per-tune playback overrides (style, tempo, key, choruses), persisted in localStorage.

export interface TuneSettings {
  style?: string
  bpm?: number
  transpose?: number
  choruses?: number
}

export interface TuneDefaults {
  style: string
  bpm: number
}

export const TUNE_SETTINGS_KEY = 'openstand:tune-settings'
export const LEGACY_TUNE_STYLES_KEY = 'openstand:tune-styles'

export const BPM_RANGE: [number, number] = [40, 300]
export const MAX_CHORUSES = 24
export const DEFAULT_CHORUSES = 3

export const clampBpm = (v: number): number => Math.max(BPM_RANGE[0], Math.min(BPM_RANGE[1], v))

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function sanitizeEntry(raw: unknown): TuneSettings {
  if (!isRecord(raw)) return {}
  const clean: TuneSettings = {}
  if (typeof raw.style === 'string' && raw.style.length > 0) clean.style = raw.style
  if (typeof raw.bpm === 'number' && Number.isFinite(raw.bpm) && raw.bpm >= BPM_RANGE[0] && raw.bpm <= BPM_RANGE[1]) {
    clean.bpm = raw.bpm
  }
  if (typeof raw.transpose === 'number' && Number.isInteger(raw.transpose) && raw.transpose >= -11 && raw.transpose <= 11) {
    clean.transpose = raw.transpose
  }
  if (typeof raw.choruses === 'number' && Number.isInteger(raw.choruses) && raw.choruses >= 1 && raw.choruses <= MAX_CHORUSES) {
    clean.choruses = raw.choruses
  }
  return clean
}

export function parseTuneSettings(raw: unknown): Record<string, TuneSettings> {
  if (!isRecord(raw)) return {}
  const result: Record<string, TuneSettings> = {}
  for (const [tuneId, value] of Object.entries(raw)) {
    if (!tuneId) continue
    const clean = sanitizeEntry(value)
    if (Object.keys(clean).length > 0) result[tuneId] = clean
  }
  return result
}

export function saveTuneSettings(all: Record<string, TuneSettings>): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(TUNE_SETTINGS_KEY, JSON.stringify(all))
  } catch {
    // Storage may be disabled in private browsing
  }
}

export function loadTuneSettings(): Record<string, TuneSettings> {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(TUNE_SETTINGS_KEY)
    if (raw !== null) {
      return parseTuneSettings(JSON.parse(raw) as unknown)
    }
    const legacyRaw = localStorage.getItem(LEGACY_TUNE_STYLES_KEY)
    if (legacyRaw === null) return {}
    const legacy = JSON.parse(legacyRaw) as unknown
    if (!isRecord(legacy)) return {}
    const migrated: Record<string, TuneSettings> = {}
    for (const [tuneId, style] of Object.entries(legacy)) {
      if (tuneId && typeof style === 'string' && style.length > 0) {
        migrated[tuneId] = { style }
      }
    }
    // Keep the legacy key untouched; persist the migrated record so migration only runs once.
    saveTuneSettings(migrated)
    return migrated
  } catch {
    return {}
  }
}

export function updateTuneSettings(
  all: Record<string, TuneSettings>,
  tuneId: string,
  patch: Partial<TuneSettings>,
  tuneDefaults: TuneDefaults,
): Record<string, TuneSettings> {
  const merged = sanitizeEntry({ ...(all[tuneId] ?? {}), ...patch })
  if (merged.style === tuneDefaults.style) delete merged.style
  if (merged.bpm === tuneDefaults.bpm) delete merged.bpm
  if (merged.transpose === 0) delete merged.transpose
  if (merged.choruses === DEFAULT_CHORUSES) delete merged.choruses

  const next = { ...all }
  if (Object.keys(merged).length === 0) {
    delete next[tuneId]
  } else {
    next[tuneId] = merged
  }
  return next
}

export function clearTuneSettings(all: Record<string, TuneSettings>, tuneId: string): Record<string, TuneSettings> {
  if (!(tuneId in all)) return all
  const next = { ...all }
  delete next[tuneId]
  return next
}

export function clearStyleFromTuneSettings(all: Record<string, TuneSettings>, styleId: string): Record<string, TuneSettings> {
  let changed = false
  const next: Record<string, TuneSettings> = {}
  for (const [tuneId, entry] of Object.entries(all)) {
    if (entry.style !== styleId) {
      next[tuneId] = entry
      continue
    }
    changed = true
    const rest = { ...entry }
    delete rest.style
    if (Object.keys(rest).length > 0) next[tuneId] = rest
  }
  return changed ? next : all
}
