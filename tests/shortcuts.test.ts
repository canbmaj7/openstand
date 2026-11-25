import { describe, expect, test, vi } from 'vitest'
import { handleEditorShortcut, handlePracticeShortcut, PRACTICE_SHORTCUTS, type EditorShortcuts } from '../src/ui/shortcuts'

function keyEvent(code: string, patch: Partial<KeyboardEvent> = {}) {
  return {
    code,
    target: null,
    defaultPrevented: false,
    isComposing: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    ...patch,
  } as unknown as KeyboardEvent
}

function actions() {
  return {
    toggle: vi.fn(),
    tempo: vi.fn(),
    tapTempo: vi.fn(),
    transpose: vi.fn(),
    clearLoop: vi.fn(),
    scale: vi.fn(),
    fullscreen: vi.fn(),
  }
}

function controlTarget(kind: 'button' | 'input') {
  const target = {
    closest: (selector: string) => {
      if (selector === 'button, [role="button"]') return kind === 'button' ? target : null
      return target
    },
  }
  return target as unknown as HTMLElement
}

describe('practice keyboard shortcuts', () => {
  test.each([
    ['Space', 'toggle', undefined],
    ['ArrowUp', 'tempo', 5],
    ['ArrowDown', 'tempo', -5],
    ['ArrowRight', 'transpose', 1],
    ['ArrowLeft', 'transpose', -1],
    ['KeyL', 'clearLoop', undefined],
    ['KeyT', 'tapTempo', undefined],
    ['KeyF', 'fullscreen', undefined],
  ] as const)('%s invokes only its practice action', (code, action, delta) => {
    const handlers = actions()
    const event = keyEvent(code)
    handlePracticeShortcut(event, false, handlers)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    for (const [name, handler] of Object.entries(handlers)) {
      expect(handler).toHaveBeenCalledTimes(name === action ? 1 : 0)
    }
    if (delta !== undefined) expect(handlers[action]).toHaveBeenCalledWith(delta)
  })

  test.each([
    ['Minus', '-', -1],
    ['Equal', '=', 1],
    ['Equal', '+', 1],
  ] as const)('key %s invokes scale(%d) outside text inputs and editor', (code, key, delta) => {
    const handlers = actions()
    const event = keyEvent(code, { key })
    handlePracticeShortcut(event, false, handlers)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(handlers.scale).toHaveBeenCalledWith(delta)

    const blocked = actions()
    const inInput = keyEvent(code, { key, target: controlTarget('input') })
    handlePracticeShortcut(inInput, false, blocked)
    expect(inInput.preventDefault).not.toHaveBeenCalled()
    expect(blocked.scale).not.toHaveBeenCalled()

    const whileEditing = keyEvent(code, { key })
    handlePracticeShortcut(whileEditing, true, blocked)
    expect(whileEditing.preventDefault).not.toHaveBeenCalled()
    expect(blocked.scale).not.toHaveBeenCalled()

    const withCtrl = keyEvent(code, { key, ctrlKey: true })
    handlePracticeShortcut(withCtrl, false, blocked)
    expect(withCtrl.preventDefault).not.toHaveBeenCalled()
    expect(blocked.scale).not.toHaveBeenCalled()
  })

  test('unrelated keys keep their default behavior', () => {
    const handlers = actions()
    const event = keyEvent('KeyA')
    handlePracticeShortcut(event, false, handlers)
    expect(event.preventDefault).not.toHaveBeenCalled()
    for (const handler of Object.values(handlers)) expect(handler).not.toHaveBeenCalled()
  })

  test.each(['Space', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'KeyL', 'KeyT', 'KeyF'])(
    '%s is ignored while editing or focusing a control', (code) => {
      for (const editing of [false, true]) {
        const handlers = actions()
        const event = keyEvent(code, {
          target: editing ? null : { closest: () => ({}) } as unknown as HTMLElement,
        })
        handlePracticeShortcut(event, editing, handlers)
        expect(event.preventDefault).not.toHaveBeenCalled()
        for (const handler of Object.values(handlers)) expect(handler).not.toHaveBeenCalled()
      }
    },
  )

  test('Space toggles playback after a button receives pointer focus', () => {
    const handlers = actions()
    const button = controlTarget('button')
    const event = keyEvent('Space', { target: button })
    handlePracticeShortcut(event, false, handlers, button)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(handlers.toggle).toHaveBeenCalledOnce()
  })

  test('Space keeps its native action on a keyboard-focused button', () => {
    const handlers = actions()
    const event = keyEvent('Space', { target: controlTarget('button') })
    handlePracticeShortcut(event, false, handlers)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(handlers.toggle).not.toHaveBeenCalled()
  })

  test('Space keeps its native action in an input even after a pointer click', () => {
    const handlers = actions()
    const input = controlTarget('input')
    const event = keyEvent('Space', { target: input })
    handlePracticeShortcut(event, false, handlers, input)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(handlers.toggle).not.toHaveBeenCalled()
  })

  test('KeyT handles Shift+T and ignores OS key repeat', () => {
    const handlers = actions()
    const shiftTap = keyEvent('KeyT', { key: 'T', shiftKey: true })
    handlePracticeShortcut(shiftTap, false, handlers)
    expect(shiftTap.preventDefault).toHaveBeenCalledOnce()
    expect(handlers.tapTempo).toHaveBeenCalledOnce()

    const repeated = keyEvent('KeyT', { key: 't', repeat: true })
    handlePracticeShortcut(repeated, false, handlers)
    expect(repeated.preventDefault).toHaveBeenCalledOnce()
    expect(handlers.tapTempo).toHaveBeenCalledOnce()
  })

  test('PRACTICE_SHORTCUTS lists T for tap tempo and F for full screen', () => {
    expect(PRACTICE_SHORTCUTS).toContainEqual({ keys: 'T', description: 'Tap tempo', scope: 'practice' })
    expect(PRACTICE_SHORTCUTS).toContainEqual({ keys: 'F', description: 'Full screen', scope: 'practice' })
  })

  test('KeyF handles Shift+F and ignores OS key repeat', () => {
    const handlers = actions()
    const shiftF = keyEvent('KeyF', { key: 'F', shiftKey: true })
    handlePracticeShortcut(shiftF, false, handlers)
    expect(shiftF.preventDefault).toHaveBeenCalledOnce()
    expect(handlers.fullscreen).toHaveBeenCalledOnce()

    const repeated = keyEvent('KeyF', { key: 'f', repeat: true })
    handlePracticeShortcut(repeated, false, handlers)
    expect(repeated.preventDefault).toHaveBeenCalledOnce()
    expect(handlers.fullscreen).toHaveBeenCalledOnce()
  })

  test.each(['altKey', 'ctrlKey', 'metaKey', 'isComposing', 'defaultPrevented'] as const)(
    '%s leaves handled or composing keys alone', (flag) => {
      for (const code of ['Space', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'KeyL', 'KeyT', 'KeyF']) {
        const handlers = actions()
        const event = keyEvent(code, { [flag]: true })
        handlePracticeShortcut(event, false, handlers)
        expect(event.preventDefault).not.toHaveBeenCalled()
        for (const handler of Object.values(handlers)) expect(handler).not.toHaveBeenCalled()
      }
    },
  )
})

function editorActions(uncommitted = false): EditorShortcuts {
  return {
    undo: vi.fn(),
    redo: vi.fn(),
    copy: vi.fn(),
    cut: vi.fn(),
    clear: vi.fn(),
    extendSelection: vi.fn(),
    hasUncommittedInput: () => uncommitted,
  }
}

function editorKey(key: string, patch: Partial<KeyboardEvent> = {}) {
  return {
    key,
    code: key,
    target: null,
    defaultPrevented: false,
    isComposing: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: vi.fn(),
    ...patch,
  } as unknown as KeyboardEvent
}

function inputTarget(options: { chord?: boolean; selected?: boolean; type?: string } = {}) {
  const el = {
    tagName: 'INPUT',
    type: options.type ?? 'text',
    selectionStart: 0,
    selectionEnd: options.selected ? 2 : 0,
    closest: (selector: string) => {
      if (selector.includes('data-editor-chord-input')) return options.chord ? el : null
      return el
    },
  }
  return el as unknown as HTMLElement
}

describe('editor keyboard shortcuts', () => {
  test('Ctrl+Z / Cmd+Z undo and Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y redo', () => {
    const h = editorActions()
    handleEditorShortcut(editorKey('z', { ctrlKey: true }), h)
    handleEditorShortcut(editorKey('z', { metaKey: true }), h)
    expect(h.undo).toHaveBeenCalledTimes(2)

    handleEditorShortcut(editorKey('z', { ctrlKey: true, shiftKey: true }), h)
    handleEditorShortcut(editorKey('z', { metaKey: true, shiftKey: true }), h)
    handleEditorShortcut(editorKey('y', { ctrlKey: true }), h)
    expect(h.redo).toHaveBeenCalledTimes(3)
  })

  test('Undo leaves native input undo alone when chord input has uncommitted text', () => {
    const chordInput = inputTarget({ chord: true })
    const dirty = editorActions(true)
    const e1 = editorKey('z', { ctrlKey: true, target: chordInput })
    expect(handleEditorShortcut(e1, dirty)).toBe(false)
    expect(e1.preventDefault).not.toHaveBeenCalled()
    expect(dirty.undo).not.toHaveBeenCalled()

    const committed = editorActions(false)
    const e2 = editorKey('z', { ctrlKey: true, target: chordInput })
    expect(handleEditorShortcut(e2, committed)).toBe(true)
    expect(e2.preventDefault).toHaveBeenCalledOnce()
    expect(committed.undo).toHaveBeenCalledOnce()
  })

  test('Delete/Backspace and Shift+Arrows only act outside text inputs', () => {
    const h = editorActions()
    const input = inputTarget({ chord: true })
    expect(handleEditorShortcut(editorKey('Backspace', { target: input }), h)).toBe(false)
    expect(handleEditorShortcut(editorKey('ArrowRight', { shiftKey: true, target: input }), h)).toBe(false)
    expect(h.clear).not.toHaveBeenCalled()
    expect(h.extendSelection).not.toHaveBeenCalled()

    expect(handleEditorShortcut(editorKey('Delete'), h)).toBe(true)
    expect(handleEditorShortcut(editorKey('Backspace'), h)).toBe(true)
    expect(h.clear).toHaveBeenCalledTimes(2)

    handleEditorShortcut(editorKey('ArrowLeft', { shiftKey: true }), h)
    handleEditorShortcut(editorKey('ArrowRight', { shiftKey: true }), h)
    expect(h.extendSelection).toHaveBeenNthCalledWith(1, -1)
    expect(h.extendSelection).toHaveBeenNthCalledWith(2, 1)
  })

  test('Copy and Cut respect selected text in inputs and copy/cut bars otherwise', () => {
    const h = editorActions()
    const selectedTextInput = inputTarget({ chord: true, selected: true })
    expect(handleEditorShortcut(editorKey('c', { ctrlKey: true, target: selectedTextInput }), h)).toBe(false)
    expect(handleEditorShortcut(editorKey('x', { ctrlKey: true, target: selectedTextInput }), h)).toBe(false)

    const emptySelChordInput = inputTarget({ chord: true, selected: false })
    expect(handleEditorShortcut(editorKey('c', { ctrlKey: true, target: emptySelChordInput }), h)).toBe(true)
    expect(handleEditorShortcut(editorKey('x', { ctrlKey: true, target: emptySelChordInput }), h)).toBe(true)
    expect(h.copy).toHaveBeenCalledOnce()
    expect(h.cut).toHaveBeenCalledOnce()
  })
})
