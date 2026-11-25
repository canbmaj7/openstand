import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  clearStyleFromTuneSettings,
  clearTuneSettings,
  loadTuneSettings,
  saveTuneSettings,
  updateTuneSettings,
  type TuneDefaults,
  type TuneSettings,
} from '../library/tuneSettings'

export function useTuneSettings() {
  const [tuneSettings, setTuneSettingsState] = useState<Record<string, TuneSettings>>(loadTuneSettings)
  const tuneSettingsRef = useRef(tuneSettings)
  const timerRef = useRef(0)
  const dirtyRef = useRef(false)

  const flush = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = 0
    }
    if (dirtyRef.current) {
      dirtyRef.current = false
      saveTuneSettings(tuneSettingsRef.current)
    }
  }, [])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flush()
    }
  }, [flush])

  const commit = useCallback((next: Record<string, TuneSettings>, debounceMs = 0) => {
    tuneSettingsRef.current = next
    setTuneSettingsState(next)
    if (debounceMs > 0) {
      dirtyRef.current = true
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = 0
        dirtyRef.current = false
        saveTuneSettings(tuneSettingsRef.current)
      }, debounceMs)
      return
    }
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = 0
    }
    dirtyRef.current = false
    saveTuneSettings(next)
  }, [])

  const update = useCallback(
    (tuneId: string, patch: Partial<TuneSettings>, defaults: TuneDefaults, options?: { debounceMs?: number }) => {
      const next = updateTuneSettings(tuneSettingsRef.current, tuneId, patch, defaults)
      commit(next, options?.debounceMs ?? 0)
    },
    [commit],
  )

  const reset = useCallback(
    (tuneId: string) => {
      commit(clearTuneSettings(tuneSettingsRef.current, tuneId), 0)
    },
    [commit],
  )

  const clearStyle = useCallback(
    (styleId: string) => {
      const next = clearStyleFromTuneSettings(tuneSettingsRef.current, styleId)
      if (next !== tuneSettingsRef.current) commit(next, 0)
    },
    [commit],
  )

  const styleOverrides = useMemo(
    () => Object.fromEntries(Object.entries(tuneSettings).flatMap(([id, s]) => (s.style ? [[id, s.style]] : []))),
    [tuneSettings],
  )

  return {
    tuneSettings,
    tuneSettingsRef,
    styleOverrides,
    update,
    reset,
    clearStyle,
    flush,
  }
}
