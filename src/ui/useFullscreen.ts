import { useCallback, useEffect, useState } from 'react'

type FullscreenHost = Pick<HTMLElement, 'requestFullscreen'> | null | undefined
type FullscreenDoc = Pick<Document, 'fullscreenElement' | 'exitFullscreen'> | null | undefined
type OverlayDoc = Pick<Document, 'fullscreenElement' | 'querySelectorAll'>

/** Returns true if any popover panel or modal dialog is currently visible on screen. */
export function hasVisibleOverlay(doc: Pick<Document, 'querySelectorAll'>): boolean {
  const overlays = doc.querySelectorAll('.popover-panel, dialog[open]')
  for (const el of overlays) {
    if (el.getClientRects().length > 0) return true
  }
  return false
}

/** Decide whether a keydown event should close the window-fill full-screen mode. */
export function shouldExitFullscreenOnKey(
  event: Pick<KeyboardEvent, 'key' | 'defaultPrevented' | 'isComposing' | 'altKey' | 'ctrlKey' | 'metaKey'>,
  active: boolean,
  doc: OverlayDoc,
): boolean {
  if (!active || event.key !== 'Escape') return false
  if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return false
  if (doc.fullscreenElement) return false
  return !hasVisibleOverlay(doc)
}

/** Request browser fullscreen if supported, falling back silently to window-fill mode if denied. */
export function requestBrowserFullscreen(el: FullscreenHost): void {
  if (!el || typeof el.requestFullscreen !== 'function') return
  try {
    const result = el.requestFullscreen()
    if (result && typeof result.catch === 'function') {
      result.catch(() => {})
    }
  } catch {
    // Fullscreen API can be unavailable or blocked in embedded/headless browsers
  }
}

/** Exit browser fullscreen if currently active, ignoring unsupported/rejected calls. */
export function exitBrowserFullscreen(doc: FullscreenDoc): void {
  if (!doc?.fullscreenElement || typeof doc.exitFullscreen !== 'function') return
  try {
    const result = doc.exitFullscreen()
    if (result && typeof result.catch === 'function') {
      result.catch(() => {})
    }
  } catch {
    // Ignore errors when leaving native fullscreen
  }
}

/** Manage full-screen chart mode with Fullscreen API sync and window-fill fallback. */
export function useFullscreen(disabled = false) {
  const [rawFullscreen, setRawFullscreen] = useState(false)
  const fullscreen = rawFullscreen && !disabled

  const enter = useCallback(() => {
    if (disabled) return
    setRawFullscreen(true)
    requestBrowserFullscreen(document.documentElement)
  }, [disabled])

  const exit = useCallback(() => {
    setRawFullscreen(false)
    exitBrowserFullscreen(document)
  }, [])

  const toggle = useCallback(() => {
    if (fullscreen) exit()
    else enter()
  }, [fullscreen, enter, exit])

  useEffect(() => {
    if (disabled) exitBrowserFullscreen(document)
  }, [disabled])

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setRawFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!fullscreen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldExitFullscreenOnKey(e, true, document)) {
        e.preventDefault()
        exit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen, exit])

  return { fullscreen, enter, exit, toggle }
}
