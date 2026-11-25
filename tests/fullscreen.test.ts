import { describe, expect, test, vi } from 'vitest'
import {
  exitBrowserFullscreen,
  hasVisibleOverlay,
  requestBrowserFullscreen,
  shouldExitFullscreenOnKey,
} from '../src/ui/useFullscreen'

function overlayDoc(options: { fullscreenElement?: Element | null; rects?: number[] } = {}) {
  const elements = (options.rects ?? []).map((count) => ({
    getClientRects: () => Array.from({ length: count }),
  }))
  return {
    fullscreenElement: options.fullscreenElement ?? null,
    querySelectorAll: () => elements as unknown as NodeListOf<Element>,
  }
}

function escapeEvent(patch: Partial<KeyboardEvent> = {}) {
  return {
    key: 'Escape',
    defaultPrevented: false,
    isComposing: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...patch,
  }
}

describe('fullscreen helpers', () => {
  test('hasVisibleOverlay detects overlays with layout rects and ignores hidden ones', () => {
    expect(hasVisibleOverlay(overlayDoc({ rects: [] }))).toBe(false)
    expect(hasVisibleOverlay(overlayDoc({ rects: [0] }))).toBe(false)
    expect(hasVisibleOverlay(overlayDoc({ rects: [0, 1] }))).toBe(true)
  })

  test('shouldExitFullscreenOnKey exits on Escape only in window-fill mode with no visible overlay', () => {
    expect(shouldExitFullscreenOnKey(escapeEvent(), true, overlayDoc())).toBe(true)
    expect(shouldExitFullscreenOnKey(escapeEvent(), false, overlayDoc())).toBe(false)
    expect(shouldExitFullscreenOnKey(escapeEvent({ key: 'Enter' }), true, overlayDoc())).toBe(false)
    expect(shouldExitFullscreenOnKey(escapeEvent({ defaultPrevented: true }), true, overlayDoc())).toBe(false)
    expect(shouldExitFullscreenOnKey(escapeEvent({ isComposing: true }), true, overlayDoc())).toBe(false)
    expect(shouldExitFullscreenOnKey(escapeEvent({ ctrlKey: true }), true, overlayDoc())).toBe(false)
    expect(
      shouldExitFullscreenOnKey(escapeEvent(), true, overlayDoc({ fullscreenElement: {} as Element })),
    ).toBe(false)
    expect(shouldExitFullscreenOnKey(escapeEvent(), true, overlayDoc({ rects: [1] }))).toBe(false)
    expect(shouldExitFullscreenOnKey(escapeEvent(), true, overlayDoc({ rects: [0] }))).toBe(true)
  })

  test('requestBrowserFullscreen handles missing API, rejections, and throws safely', async () => {
    expect(() => requestBrowserFullscreen(null)).not.toThrow()
    expect(() => requestBrowserFullscreen({} as HTMLElement)).not.toThrow()

    const rejected = vi.fn(() => Promise.reject(new Error('denied')))
    expect(() => requestBrowserFullscreen({ requestFullscreen: rejected })).not.toThrow()
    expect(rejected).toHaveBeenCalledOnce()

    const throwing = vi.fn(() => {
      throw new Error('unsupported')
    })
    expect(() => requestBrowserFullscreen({ requestFullscreen: throwing })).not.toThrow()
    expect(throwing).toHaveBeenCalledOnce()

    await Promise.resolve()
  })

  test('exitBrowserFullscreen exits only when fullscreenElement is active and swallows errors', async () => {
    const exitFullscreen = vi.fn(() => Promise.reject(new Error('failed')))
    exitBrowserFullscreen({ fullscreenElement: null, exitFullscreen })
    expect(exitFullscreen).not.toHaveBeenCalled()

    exitBrowserFullscreen({ fullscreenElement: {} as Element, exitFullscreen })
    expect(exitFullscreen).toHaveBeenCalledOnce()

    const throwingExit = vi.fn(() => {
      throw new Error('failed')
    })
    expect(() => exitBrowserFullscreen({ fullscreenElement: {} as Element, exitFullscreen: throwingExit })).not.toThrow()
    expect(throwingExit).toHaveBeenCalledOnce()

    await Promise.resolve()
  })
})
