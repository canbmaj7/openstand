export interface PracticeShortcuts {
  toggle: () => void
  tempo: (delta: number) => void
  transpose: (delta: number) => void
  clearLoop: () => void
}

export interface EditorShortcuts {
  undo: () => void
  redo: () => void
  copy: () => void
  cut: () => void
  clear: () => void
  extendSelection: (delta: -1 | 1) => void
  hasUncommittedInput?: () => boolean
}

export interface ShortcutInfo {
  keys: string
  description: string
  scope: 'practice' | 'editor'
}

export const EDITOR_SHORTCUTS: ShortcutInfo[] = [
  { keys: 'Ctrl/Cmd+Z', description: 'Undo', scope: 'editor' },
  { keys: 'Ctrl/Cmd+Shift+Z / Ctrl+Y', description: 'Redo', scope: 'editor' },
  { keys: 'Ctrl/Cmd+C', description: 'Copy selected bars', scope: 'editor' },
  { keys: 'Ctrl/Cmd+X', description: 'Cut selected bars', scope: 'editor' },
  { keys: 'Ctrl/Cmd+V', description: 'Paste bars', scope: 'editor' },
  { keys: 'Delete / Backspace', description: 'Clear selected bars', scope: 'editor' },
  { keys: 'Shift+Click / Shift+Arrow', description: 'Select bar range', scope: 'editor' },
]

const NON_TEXT_INPUT_TYPES = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'])

export function isTextInputElement(target: EventTarget | null): boolean {
  const el = (target as HTMLElement | null)?.closest?.(
    'input, textarea, [contenteditable]:not([contenteditable="false"])',
  ) as HTMLElement | null
  if (!el) return false
  if (el.tagName === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase()
    return !NON_TEXT_INPUT_TYPES.has(type)
  }
  return true
}

export function isChordInputElement(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el?.closest?.('[data-editor-chord-input="true"]'))
}

function hasSelectedText(target: EventTarget | null): boolean {
  const el = target as HTMLInputElement | null
  if (!el || typeof el.selectionStart !== 'number' || typeof el.selectionEnd !== 'number') return false
  return el.selectionStart !== el.selectionEnd
}

export function handlePracticeShortcut(
  event: KeyboardEvent,
  editing: boolean,
  actions: PracticeShortcuts,
  pointerFocusedButton: HTMLElement | null = null,
) {
  const target = event.target as HTMLElement | null
  const control = target?.closest?.('input, select, textarea, button, [role="button"], [contenteditable]:not([contenteditable="false"])')
  // A pointer-clicked button keeps browser focus, but Space should return to its
  // practice shortcut. Keyboard-focused buttons keep their native Space action.
  const spaceAfterPointerClick =
    event.code === 'Space' && pointerFocusedButton !== null && target?.closest?.('button, [role="button"]') === pointerFocusedButton
  if (
    editing ||
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    (control && !spaceAfterPointerClick)
  ) return

  // Leave all other keys and browser shortcuts to their normal handlers.
  switch (event.code) {
    case 'Space':
      event.preventDefault()
      actions.toggle()
      break
    case 'ArrowUp':
      event.preventDefault()
      actions.tempo(5)
      break
    case 'ArrowDown':
      event.preventDefault()
      actions.tempo(-5)
      break
    case 'ArrowRight':
      event.preventDefault()
      actions.transpose(1)
      break
    case 'ArrowLeft':
      event.preventDefault()
      actions.transpose(-1)
      break
    case 'KeyL':
      event.preventDefault()
      actions.clearLoop()
      break
  }
}

/** Handle undo/redo, bar clipboard, bar clearing, and Shift+Arrow selection in the chart editor. */
export function handleEditorShortcut(event: KeyboardEvent, actions: EditorShortcuts): boolean {
  if (event.defaultPrevented || event.isComposing || event.altKey) return false

  const target = event.target
  const inText = isTextInputElement(target)
  const inChordInput = isChordInputElement(target)
  const mod = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()

  const isRedo = (mod && event.shiftKey && key === 'z') || (event.ctrlKey && !event.metaKey && !event.shiftKey && key === 'y')
  const isUndo = mod && !event.shiftKey && key === 'z'

  if (isRedo || isUndo) {
    if (inText && actions.hasUncommittedInput?.()) return false
    event.preventDefault()
    if (isRedo) actions.redo()
    else actions.undo()
    return true
  }

  if (mod && !event.shiftKey && (key === 'c' || key === 'x')) {
    if (inText && (!inChordInput || hasSelectedText(target))) return false
    event.preventDefault()
    if (key === 'c') actions.copy()
    else actions.cut()
    return true
  }

  if (!mod && !event.shiftKey && (event.key === 'Delete' || event.key === 'Backspace')) {
    if (inText) return false
    event.preventDefault()
    actions.clear()
    return true
  }

  if (!mod && event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    if (inText) return false
    event.preventDefault()
    actions.extendSelection(event.key === 'ArrowLeft' ? -1 : 1)
    return true
  }

  return false
}
