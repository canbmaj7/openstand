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

export function nextTuneId(setlist: Setlist, currentId: string): string | null {
  const index = setlist.tuneIds.indexOf(currentId)
  if (index === -1 || index + 1 >= setlist.tuneIds.length) return null
  return setlist.tuneIds[index + 1]
}
