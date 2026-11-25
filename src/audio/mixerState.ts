import { CHANNELS, type Part } from '../engine/arrange'

export const VOLUMES_KEY = 'openstand:volumes'
export const MUTED_KEY = 'openstand:muted'

export const DEFAULT_VOLUMES: Record<Part, number> = {
  bass: 110,
  comp: 85,
  drums: 95,
  click: 95,
}

export const DEFAULT_MUTED: Record<Part, boolean> = {
  bass: false,
  comp: false,
  drums: false,
  click: true,
}

const PARTS = Object.keys(CHANNELS) as Part[]

function parseObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function parseVolumes(raw: string | null): Record<Part, number> {
  const out = { ...DEFAULT_VOLUMES }
  const obj = parseObject(raw)
  if (!obj) return out
  for (const part of PARTS) {
    const v = obj[part]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 127) {
      out[part] = Math.round(v)
    }
  }
  return out
}

export function parseMuted(raw: string | null): Record<Part, boolean> {
  const out = { ...DEFAULT_MUTED }
  const obj = parseObject(raw)
  if (!obj) return out
  for (const part of PARTS) {
    const v = obj[part]
    if (typeof v === 'boolean') out[part] = v
  }
  return out
}

export function loadVolumes(): Record<Part, number> {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_VOLUMES }
    return parseVolumes(localStorage.getItem(VOLUMES_KEY))
  } catch {
    return { ...DEFAULT_VOLUMES }
  }
}

export function saveVolumes(volumes: Record<Part, number>): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(VOLUMES_KEY, JSON.stringify(volumes))
  } catch {
    // Storage may be disabled in private browsing
  }
}

export function loadMuted(): Record<Part, boolean> {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_MUTED }
    return parseMuted(localStorage.getItem(MUTED_KEY))
  } catch {
    return { ...DEFAULT_MUTED }
  }
}

export function saveMuted(muted: Record<Part, boolean>): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(MUTED_KEY, JSON.stringify(muted))
  } catch {
    // Storage may be disabled in private browsing
  }
}
