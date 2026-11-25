import { useEffect, useRef, useState, type RefObject } from 'react'

export interface Size {
  w: number
  h: number
}

export const MAX_FIT_SCALE = 2.2

/** Compute the uniform scale multiplier (1..max) that fits natural size inside available space. */
export function fitScale(natural: Size, available: Size, max = MAX_FIT_SCALE): number {
  if (
    !Number.isFinite(natural.w) ||
    !Number.isFinite(natural.h) ||
    !Number.isFinite(available.w) ||
    !Number.isFinite(available.h) ||
    natural.w <= 0 ||
    natural.h <= 0 ||
    available.w <= 0 ||
    available.h <= 0 ||
    !Number.isFinite(max) ||
    max <= 1
  ) {
    return 1
  }
  const ratio = Math.min(available.h / natural.h, available.w / natural.w)
  return Math.max(1, Math.min(max, ratio))
}

function measureStageAvailable(stage: HTMLElement): Size {
  const style = getComputedStyle(stage)
  const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
  const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
  return {
    w: Math.max(0, stage.clientWidth - padX),
    h: Math.max(0, stage.clientHeight - padY),
  }
}

function measureSheetContentHeight(sheet: HTMLElement): number {
  const style = getComputedStyle(sheet)
  const padBottom = parseFloat(style.paddingBottom) || 0
  const borderBottom = parseFloat(style.borderBottomWidth) || 0
  const sheetRect = sheet.getBoundingClientRect()
  const rows = sheet.querySelector<HTMLElement>('.rows')
  if (!rows) return sheet.scrollHeight
  return Math.max(0, rows.getBoundingClientRect().bottom - sheetRect.top + padBottom + borderBottom)
}

function fitsWithin(sheet: HTMLElement, available: Size): boolean {
  return sheet.scrollWidth <= available.w + 1 && measureSheetContentHeight(sheet) <= available.h + 1
}

// Chord symbols are sized to their bar's width, so on narrow screens growing the chart only
// enlarges the title and empty bar height. Allow growth in proportion to the width beyond this.
export const FIT_REFERENCE_WIDTH = 640

/** The largest fit multiplier a stage of this width can use (1 on phones). */
export function maxFitForWidth(width: number, max = MAX_FIT_SCALE): number {
  return Math.min(max, Math.max(1, width / FIT_REFERENCE_WIDTH))
}

function computeFitForElements(stage: HTMLElement, sheet: HTMLElement, maxScale = MAX_FIT_SCALE): number {
  const available = measureStageAvailable(stage)
  if (available.w <= 0 || available.h <= 0) return 1
  const max = maxFitForWidth(available.w, maxScale)
  if (max <= 1) {
    sheet.style.setProperty('--fit-scale', '1')
    return 1
  }

  sheet.style.setProperty('--fit-scale', '1')
  const naturalH = measureSheetContentHeight(sheet)
  const naturalW = sheet.scrollWidth > available.w + 0.5 ? sheet.scrollWidth : available.w / max
  let next = fitScale({ w: naturalW, h: naturalH }, available, max)

  if (next > 1) {
    sheet.style.setProperty('--fit-scale', String(next))
    // If scaling up causes line wrapping or horizontal overflow, back off until it fits cleanly
    if (!fitsWithin(sheet, available)) {
      let lo = 1
      let hi = next
      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2
        sheet.style.setProperty('--fit-scale', String(mid))
        if (fitsWithin(sheet, available)) lo = mid
        else hi = mid
      }
      next = lo
    }
  }

  return Math.round(next * 1000) / 1000
}

export interface UseFitScaleOptions {
  active: boolean
  stageRef: RefObject<HTMLElement | null>
  sheetRef: RefObject<HTMLElement | null>
  deps: readonly unknown[]
  max?: number
}

/**
 * Measure the chart's natural size against the stage's available area in full-screen mode
 * and compute a fit multiplier (>= 1) so short charts fill the screen without overflowing.
 */
export function useFitScale({ active, stageRef, sheetRef, deps, max = MAX_FIT_SCALE }: UseFitScaleOptions): number {
  const [scale, setScale] = useState(1)
  const appliedRef = useRef(1)
  const stateRef = useRef(1)
  const suppressSheetRef = useRef(false)

  useEffect(() => {
    const sheet = sheetRef.current
    const stage = stageRef.current
    if (!active || !sheet || !stage) {
      if (sheet) sheet.style.removeProperty('--fit-scale')
      appliedRef.current = 1
      if (stateRef.current !== 1) {
        stateRef.current = 1
        setScale(1)
      }
      return
    }

    let rafId = 0
    let clearSuppressRafId = 0

    const measure = () => {
      rafId = 0
      const currentStage = stageRef.current
      const currentSheet = sheetRef.current
      if (!currentStage || !currentSheet) return

      const prev = appliedRef.current
      const next = computeFitForElements(currentStage, currentSheet, max)
      currentSheet.style.setProperty('--fit-scale', String(next))
      appliedRef.current = next

      if (Math.abs(next - prev) > 0.001) {
        // Ignore the ResizeObserver callback triggered in this frame by applying --fit-scale
        suppressSheetRef.current = true
        cancelAnimationFrame(clearSuppressRafId)
        clearSuppressRafId = requestAnimationFrame(() => {
          suppressSheetRef.current = false
        })
      }

      if (Math.abs(next - stateRef.current) > 0.001) {
        stateRef.current = next
        setScale(next)
      }
    }

    const schedule = () => {
      if (rafId) return
      rafId = requestAnimationFrame(measure)
    }

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            const stageChanged = entries.some((entry) => entry.target === stage)
            if (stageChanged) {
              suppressSheetRef.current = false
              schedule()
              return
            }
            if (suppressSheetRef.current) {
              suppressSheetRef.current = false
              return
            }
            schedule()
          })
        : null

    observer?.observe(stage)
    observer?.observe(sheet)
    const head = sheet.firstElementChild
    const rows = sheet.querySelector<HTMLElement>('.rows')
    if (head && head !== rows) observer?.observe(head)
    if (rows) observer?.observe(rows)

    schedule()

    return () => {
      cancelAnimationFrame(rafId)
      cancelAnimationFrame(clearSuppressRafId)
      observer?.disconnect()
      suppressSheetRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller passes explicit layout-affecting deps
  }, [active, max, stageRef, sheetRef, ...deps])

  return active ? scale : 1
}
