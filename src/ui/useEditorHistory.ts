import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Chart, ChartBar } from '../music/chart'
import { clearBars, copyBars, pasteBars, timeAt } from '../music/edit'
import { canRedo, canUndo, createHistory, push, redo as redoHistory, undo as undoHistory, type History } from '../music/history'
import { barToInput } from '../music/notation'
import type { Tune } from '../music/songs'
import { handleEditorShortcut } from './shortcuts'

export interface EditorDraft {
  history: History<Chart>
  from: Tune | null
}

interface BarSelection {
  anchor: number
  focus: number
  focusInput: boolean
  focusTick: number
}

const clampBar = (index: number, length: number) => Math.max(0, Math.min(index, Math.max(0, length - 1)))

/** Manages editor draft chart, 100-step undo/redo history, bar range selection, and bar clipboard. */
export function useEditorHistory() {
  const [draft, setDraft] = useState<EditorDraft | null>(null)
  const [selection, setSelection] = useState<BarSelection>({ anchor: 0, focus: 0, focusInput: true, focusTick: 0 })
  const [clipboard, setClipboard] = useState<ChartBar[]>([])
  // The plain text written to the system clipboard on copy, to tell our bars from text copied elsewhere
  const copiedTextRef = useRef('')
  const hasUncommittedRef = useRef<() => boolean>(() => false)

  const chart = draft?.history.present ?? null
  const barCount = chart?.bars.length ?? 0
  const editBar = chart ? clampBar(selection.focus, barCount) : 0
  const anchorBar = chart ? clampBar(selection.anchor, barCount) : 0
  const selectionRange: [number, number] | null = useMemo(
    () => (chart ? [Math.min(anchorBar, editBar), Math.max(anchorBar, editBar)] : null),
    [chart, anchorBar, editBar],
  )

  const open = useCallback((initial: Chart, from: Tune | null) => {
    setDraft({ history: createHistory(initial), from })
    setSelection({ anchor: 0, focus: 0, focusInput: true, focusTick: 0 })
  }, [])

  const close = useCallback(() => {
    setDraft(null)
  }, [])

  const commit = useCallback((next: Chart) => {
    setDraft((prev) => (prev ? { ...prev, history: push(prev.history, next) } : prev))
  }, [])

  const undo = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev
      const history = undoHistory(prev.history)
      return history === prev.history ? prev : { ...prev, history }
    })
  }, [])

  const redo = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev
      const history = redoHistory(prev.history)
      return history === prev.history ? prev : { ...prev, history }
    })
  }, [])

  const selectBar = useCallback(
    (index: number, shiftKey = false) => {
      setSelection((prev) => {
        const nextFocus = clampBar(index, barCount)
        if (shiftKey) {
          return {
            anchor: clampBar(prev.anchor, barCount),
            focus: nextFocus,
            focusInput: false,
            focusTick: prev.focusTick,
          }
        }
        return {
          anchor: nextFocus,
          focus: nextFocus,
          focusInput: true,
          focusTick: prev.focusTick + 1,
        }
      })
    },
    [barCount],
  )

  const extendSelection = useCallback(
    (delta: -1 | 1) => {
      setSelection((prev) => {
        const anchor = clampBar(prev.anchor, barCount)
        const focus = clampBar(clampBar(prev.focus, barCount) + delta, barCount)
        return { anchor, focus, focusInput: false, focusTick: prev.focusTick }
      })
    },
    [barCount],
  )

  const copySelected = useCallback(() => {
    if (!chart || !selectionRange) return
    const [from, to] = selectionRange
    const copied = copyBars(chart, from, to)
    if (!copied.length) return
    setClipboard(copied)
    const plain = copied.map((b, offset) => barToInput(b.chords, b.time ?? timeAt(chart, from + offset))).join(' | ')
    copiedTextRef.current = plain
    try {
      void navigator.clipboard?.writeText(plain).catch(() => {})
    } catch {
      // Clipboard API may be unavailable outside secure contexts
    }
  }, [chart, selectionRange])

  const clearSelected = useCallback(() => {
    if (!chart || !selectionRange) return
    commit(clearBars(chart, selectionRange[0], selectionRange[1]))
  }, [chart, selectionRange, commit])

  const cutSelected = useCallback(() => {
    if (!chart || !selectionRange) return
    copySelected()
    commit(clearBars(chart, selectionRange[0], selectionRange[1]))
  }, [chart, selectionRange, copySelected, commit])

  const pasteAtSelection = useCallback(() => {
    if (!chart || !selectionRange || !clipboard.length) return
    commit(pasteBars(chart, selectionRange[0], clipboard))
  }, [chart, selectionRange, clipboard, commit])

  const registerUncommittedCheck = useCallback((fn: () => boolean) => {
    hasUncommittedRef.current = fn
  }, [])

  const actionsRef = useRef({
    undo,
    redo,
    copy: copySelected,
    cut: cutSelected,
    clear: clearSelected,
    extendSelection,
    hasUncommittedInput: () => hasUncommittedRef.current(),
  })
  useEffect(() => {
    actionsRef.current = {
      undo,
      redo,
      copy: copySelected,
      cut: cutSelected,
      clear: clearSelected,
      extendSelection,
      hasUncommittedInput: () => hasUncommittedRef.current(),
    }
  })

  const editing = draft !== null
  useEffect(() => {
    if (!editing) return
    const onKeyDown = (e: KeyboardEvent) => {
      handleEditorShortcut(e, actionsRef.current)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editing])

  return {
    draft,
    chart,
    editBar,
    selectionRange,
    focusInputOnSelect: selection.focusInput,
    focusTick: selection.focusTick,
    canUndo: draft ? canUndo(draft.history) : false,
    canRedo: draft ? canRedo(draft.history) : false,
    canPaste: clipboard.length > 0,
    isCopiedText: (text: string) => text === '' || text === copiedTextRef.current,
    open,
    close,
    commit,
    undo,
    redo,
    selectBar,
    copySelected,
    cutSelected,
    pasteAtSelection,
    clearSelected,
    registerUncommittedCheck,
  }
}
