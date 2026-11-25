// Pure data types and operations for user-created setlists.

export interface Setlist {
  id: string
  name: string
  tuneIds: string[]
  updatedAt: number
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createSetlist(name: string, id = newId(), now = Date.now()): Setlist {
  return {
    id,
    name: name.trim() || 'Untitled setlist',
    tuneIds: [],
    updatedAt: now,
  }
}

export function addTune(setlist: Setlist, id: string): Setlist {
  if (setlist.tuneIds.includes(id)) return setlist
  return { ...setlist, tuneIds: [...setlist.tuneIds, id] }
}

export function removeAt(setlist: Setlist, index: number): Setlist {
  if (index < 0 || index >= setlist.tuneIds.length) return setlist
  return { ...setlist, tuneIds: setlist.tuneIds.filter((_, i) => i !== index) }
}

export function move(setlist: Setlist, from: number, to: number): Setlist {
  if (from === to || from < 0 || from >= setlist.tuneIds.length || to < 0 || to >= setlist.tuneIds.length) {
    return setlist
  }
  const tuneIds = [...setlist.tuneIds]
  const [item] = tuneIds.splice(from, 1)
  tuneIds.splice(to, 0, item)
  return { ...setlist, tuneIds }
}

// With repeat, the tune after the last one is the first one again
export function nextTuneId(setlist: Setlist, currentId: string, repeat = false): string | null {
  const index = setlist.tuneIds.indexOf(currentId)
  if (index === -1) return null
  if (index + 1 >= setlist.tuneIds.length) return repeat ? setlist.tuneIds[0] : null
  return setlist.tuneIds[index + 1]
}

export function prevTuneId(setlist: Setlist, currentId: string): string | null {
  const index = setlist.tuneIds.indexOf(currentId)
  if (index <= 0) return null
  return setlist.tuneIds[index - 1]
}

/** Pick the next unplayed tune id (excluding currentId), starting a new round once all have played. */
export function nextShuffledTuneId(
  tuneIds: string[],
  currentId: string,
  played: ReadonlySet<string>,
  random = Math.random,
): { nextId: string | null; played: Set<string> } {
  const uniqueIds = [...new Set(tuneIds)]
  const pool = uniqueIds.filter((id) => id !== currentId)
  if (pool.length === 0) return { nextId: null, played: new Set() }

  const uniqueSet = new Set(uniqueIds)
  const nextPlayed = new Set([...played].filter((id) => uniqueSet.has(id)))
  if (uniqueSet.has(currentId)) nextPlayed.add(currentId)

  const pick = (items: string[]) => {
    const idx = Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))
    return items[idx]
  }

  const unplayed = pool.filter((id) => !nextPlayed.has(id))
  if (unplayed.length > 0) {
    const nextId = pick(unplayed)
    nextPlayed.add(nextId)
    return { nextId, played: nextPlayed }
  }

  const nextId = pick(pool)
  return { nextId, played: new Set([nextId]) }
}
