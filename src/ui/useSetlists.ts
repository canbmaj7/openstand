import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadSetlists, removeSetlist, saveSetlist } from '../library/db'
import { addTune, createSetlist, move, nextShuffledTuneId, nextTuneId, prevTuneId, removeAt, type Setlist } from '../music/setlist'
import type { Tune } from '../music/songs'

const PLAY_THROUGH_KEY = 'openstand:play-through'
const SHUFFLE_KEY = 'openstand:setlist-shuffle'
const PLAY_THROUGH_DELAY_MS = 1000

function loadFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

function saveFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Storage may be disabled in private browsing
  }
}

interface UseSetlistsOptions {
  tunes: Tune[]
  songId: string
  showTune: (tune: Tune) => void
  startNext: () => void
  onError: (message: string) => void
}

export interface SetlistPosition {
  setlistId: string
  name: string
  index: number
  total: number
}

export function useSetlists({ tunes, songId, showTune, startNext, onError }: UseSetlistsOptions) {
  const [setlists, setSetlistsState] = useState<Setlist[]>([])
  const setlistsRef = useRef<Setlist[]>([])
  const commitSetlists = useCallback((next: Setlist[]) => {
    setlistsRef.current = next
    setSetlistsState(next)
  }, [])
  const [openSetlistId, setOpenSetlistId] = useState<string | null>(null)
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null)
  const [playThrough, setPlayThrough] = useState<boolean>(() => loadFlag(PLAY_THROUGH_KEY))
  const [shuffle, setShuffle] = useState<boolean>(() => loadFlag(SHUFFLE_KEY))
  const playedRef = useRef<Set<string>>(new Set())

  const timerRef = useRef(0)
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = 0
    }
  }, [])

  useEffect(() => () => clearTimer(), [clearTimer])

  const reload = useCallback(async () => {
    const loaded = await loadSetlists(onError)
    commitSetlists(loaded)
  }, [commitSetlists, onError])

  useEffect(() => {
    let cancelled = false
    void loadSetlists(onError).then((loaded) => {
      if (!cancelled) commitSetlists(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [commitSetlists, onError])

  const updateSetlist = useCallback(
    (id: string, transform: (current: Setlist) => Setlist) => {
      const current = setlistsRef.current.find((s) => s.id === id)
      if (!current) return
      const transformed = transform(current)
      if (transformed === current) return
      const updated = { ...transformed, updatedAt: Date.now() }
      commitSetlists(setlistsRef.current.map((s) => (s.id === id ? updated : s)))
      void saveSetlist(updated, onError)
    },
    [commitSetlists, onError],
  )

  const create = useCallback(
    (name: string, initialTuneId?: string): Setlist => {
      const base = createSetlist(name)
      const created = initialTuneId ? addTune(base, initialTuneId) : base
      commitSetlists([created, ...setlistsRef.current])
      void saveSetlist(created, onError)
      return created
    },
    [commitSetlists, onError],
  )

  const rename = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      updateSetlist(id, (s) => (s.name === trimmed ? s : { ...s, name: trimmed }))
    },
    [updateSetlist],
  )

  const remove = useCallback(
    (id: string) => {
      if (activeSetlistId === id) {
        clearTimer()
        playedRef.current = new Set()
        setActiveSetlistId(null)
      }
      if (openSetlistId === id) setOpenSetlistId(null)
      commitSetlists(setlistsRef.current.filter((s) => s.id !== id))
      void removeSetlist(id, onError)
    },
    [activeSetlistId, clearTimer, commitSetlists, onError, openSetlistId],
  )

  const add = useCallback(
    (setlistId: string, tuneId: string) => {
      updateSetlist(setlistId, (s) => addTune(s, tuneId))
    },
    [updateSetlist],
  )

  const removeTuneAt = useCallback(
    (setlistId: string, index: number) => {
      updateSetlist(setlistId, (s) => removeAt(s, index))
    },
    [updateSetlist],
  )

  const moveTune = useCallback(
    (setlistId: string, from: number, to: number) => {
      updateSetlist(setlistId, (s) => move(s, from, to))
    },
    [updateSetlist],
  )

  const selectTune = useCallback(
    (setlistId: string, tune: Tune) => {
      clearTimer()
      playedRef.current = new Set([tune.id])
      setActiveSetlistId(setlistId)
      showTune(tune)
    },
    [clearTimer, showTune],
  )

  const clearActive = useCallback(() => {
    clearTimer()
    playedRef.current = new Set()
    setActiveSetlistId(null)
  }, [clearTimer])

  const togglePlayThrough = useCallback(() => {
    setPlayThrough((prev) => {
      const next = !prev
      if (!next) clearTimer()
      saveFlag(PLAY_THROUGH_KEY, next)
      return next
    })
  }, [clearTimer])

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      const next = !prev
      saveFlag(SHUFFLE_KEY, next)
      return next
    })
  }, [])

  const tuneMap = useMemo(() => new Map(tunes.map((t) => [t.id, t])), [tunes])

  const activePosition = useMemo<SetlistPosition | null>(() => {
    if (!activeSetlistId) return null
    const active = setlists.find((s) => s.id === activeSetlistId)
    if (!active) return null
    const validIds = active.tuneIds.filter((id) => tuneMap.has(id))
    const index = validIds.indexOf(songId)
    if (index === -1) return null
    return { setlistId: active.id, name: active.name, index, total: validIds.length }
  }, [activeSetlistId, setlists, songId, tuneMap])

  const latestRef = useRef({ playThrough, shuffle, activeSetlistId, setlists, tuneMap, songId, showTune, startNext })
  useEffect(() => {
    latestRef.current = { playThrough, shuffle, activeSetlistId, setlists, tuneMap, songId, showTune, startNext }
  })

  const onTrackEnded = useCallback((): boolean => {
    const {
      playThrough: pt,
      shuffle: sh,
      activeSetlistId: activeId,
      setlists: lists,
      tuneMap: map,
      songId: currentId,
      showTune: open,
      startNext: playNext,
    } = latestRef.current
    if (!pt || !activeId) return false
    const active = lists.find((s) => s.id === activeId)
    if (!active) return false
    const validIds = active.tuneIds.filter((id) => map.has(id))
    let nextId: string | null
    if (sh) {
      const result = nextShuffledTuneId(validIds, currentId, playedRef.current)
      playedRef.current = result.played
      nextId = result.nextId
    } else {
      nextId = nextTuneId({ ...active, tuneIds: validIds }, currentId)
    }
    if (!nextId) return false
    const nextTune = map.get(nextId)
    if (!nextTune) return false
    clearTimer()
    open(nextTune)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = 0
      playNext()
    }, PLAY_THROUGH_DELAY_MS)
    return true
  }, [clearTimer])

  const openAdjacent = useCallback(
    (dir: 1 | -1): boolean => {
      const { activeSetlistId: activeId, setlists: lists, tuneMap: map, songId: currentId, showTune: open } = latestRef.current
      if (!activeId) return false
      const active = lists.find((s) => s.id === activeId)
      if (!active) return false
      const validIds = active.tuneIds.filter((id) => map.has(id))
      const subset = { ...active, tuneIds: validIds }
      const targetId = dir === 1 ? nextTuneId(subset, currentId) : prevTuneId(subset, currentId)
      if (!targetId) return false
      const targetTune = map.get(targetId)
      if (!targetTune) return false
      clearTimer()
      playedRef.current.add(targetTune.id)
      open(targetTune)
      return true
    },
    [clearTimer],
  )

  const hasAdjacent = useCallback(
    (dir: 1 | -1): boolean => {
      if (!activePosition) return false
      return dir === 1 ? activePosition.index + 1 < activePosition.total : activePosition.index > 0
    },
    [activePosition],
  )

  return {
    setlists,
    openSetlistId,
    setOpenSetlistId,
    activeSetlistId,
    activePosition,
    playThrough,
    togglePlayThrough,
    shuffle,
    toggleShuffle,
    create,
    rename,
    remove,
    add,
    removeTuneAt,
    moveTune,
    selectTune,
    clearActive,
    reload,
    onTrackEnded,
    cancelAutoPlay: clearTimer,
    openAdjacent,
    hasAdjacent,
  }
}
