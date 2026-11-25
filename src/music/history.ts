// Pure undo/redo history stack with a bounded number of steps.

export const MAX_HISTORY = 100

export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

export function createHistory<T>(initial: T): History<T> {
  return { past: [], present: initial, future: [] }
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0
}

export function push<T>(history: History<T>, next: T, maxSteps = MAX_HISTORY): History<T> {
  if (Object.is(next, history.present)) return history
  const limit = Math.max(0, maxSteps)
  const nextPast = limit === 0 ? [] : [...history.past, history.present].slice(-limit)
  return { past: nextPast, present: next, future: [] }
}

export function undo<T>(history: History<T>): History<T> {
  if (!canUndo(history)) return history
  const previous = history.past[history.past.length - 1]
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redo<T>(history: History<T>): History<T> {
  if (!canRedo(history)) return history
  const next = history.future[0]
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}
