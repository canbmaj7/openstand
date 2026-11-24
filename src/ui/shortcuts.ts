export interface PracticeShortcuts {
  toggle: () => void
  tempo: (delta: number) => void
  transpose: (delta: number) => void
  clearLoop: () => void
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
