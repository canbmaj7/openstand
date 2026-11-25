export interface ScrollMetrics {
  top: number
  height: number
  client: number
}

export interface PageTurnContext {
  playing: boolean
  hasNext: boolean
  hasPrev: boolean
}

export type PageTurnAction =
  | { kind: 'scroll'; to: number }
  | { kind: 'tune'; dir: 1 | -1 }
  | { kind: 'none' }

const EDGE_TOLERANCE = 2
const PAGE_STEP_RATIO = 0.85

/** Decide whether a pedal press scrolls the chart, switches tunes in a setlist, or does nothing. */
export function pageTurn(dir: 1 | -1, scroll: ScrollMetrics, ctx: PageTurnContext): PageTurnAction {
  const maxTop = Math.max(0, scroll.height - scroll.client)
  const step = Math.max(0, scroll.client * PAGE_STEP_RATIO)

  if (dir === 1) {
    if (scroll.top + scroll.client >= scroll.height - EDGE_TOLERANCE) {
      return !ctx.playing && ctx.hasNext ? { kind: 'tune', dir: 1 } : { kind: 'none' }
    }
    const to = Math.min(maxTop, Math.max(0, scroll.top + step))
    return to > scroll.top ? { kind: 'scroll', to } : { kind: 'none' }
  }

  if (scroll.top <= EDGE_TOLERANCE) {
    return !ctx.playing && ctx.hasPrev ? { kind: 'tune', dir: -1 } : { kind: 'none' }
  }
  const to = Math.max(0, Math.min(maxTop, scroll.top - step))
  return to < scroll.top ? { kind: 'scroll', to } : { kind: 'none' }
}

/** Pick the active vertical scroll container: `.stage` when scrollable, otherwise `document.scrollingElement`. */
export function getScrollTarget(stage: HTMLElement | null, doc: Document = document): HTMLElement | null {
  const docEl = (doc.scrollingElement ?? doc.documentElement) as HTMLElement | null
  if (stage && stage.scrollHeight > stage.clientHeight + EDGE_TOLERANCE) return stage
  if (docEl && docEl.scrollHeight > docEl.clientHeight + EDGE_TOLERANCE) return docEl
  return stage ?? docEl
}

/** Read scroll metrics for `pageTurn` from an element. */
export function readScrollMetrics(el: HTMLElement | null): ScrollMetrics {
  if (!el) return { top: 0, height: 0, client: 0 }
  return {
    top: el.scrollTop,
    height: el.scrollHeight,
    client: el.clientHeight,
  }
}

/** Scroll a freshly opened tune to the top (dir=1) or bottom (dir=-1). */
export function scrollForNewTune(dir: 1 | -1, stage: HTMLElement | null, doc: Document = document): void {
  const scroller = getScrollTarget(stage, doc)
  if (!scroller) return
  if (stage && stage !== scroller && dir === 1) stage.scrollTop = 0
  const top = dir === 1 ? 0 : Math.max(0, scroller.scrollHeight - scroller.clientHeight)
  scroller.scrollTo({ top, behavior: 'auto' })
}
