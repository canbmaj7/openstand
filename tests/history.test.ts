import { describe, expect, test } from 'vitest'
import { chartFromMeasures } from '../src/music/chart'
import { clearBars, copyBars, pasteBars, updateBar } from '../src/music/edit'
import { MAX_HISTORY, canRedo, canUndo, createHistory, push, redo, undo } from '../src/music/history'

describe('history', () => {
  test('starts empty with no undo or redo available', () => {
    const h = createHistory(1)
    expect(h.present).toBe(1)
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
    expect(undo(h)).toBe(h)
    expect(redo(h)).toBe(h)
  })

  test('push, undo, and redo step through states and clear redo on new branch', () => {
    let h = createHistory('a')
    h = push(h, 'b')
    h = push(h, 'c')
    expect(canUndo(h)).toBe(true)
    expect(canRedo(h)).toBe(false)

    h = undo(h)
    expect(h.present).toBe('b')
    expect(canUndo(h)).toBe(true)
    expect(canRedo(h)).toBe(true)

    h = undo(h)
    expect(h.present).toBe('a')
    expect(canUndo(h)).toBe(false)

    h = redo(h)
    expect(h.present).toBe('b')

    h = push(h, 'd')
    expect(h.present).toBe('d')
    expect(canRedo(h)).toBe(false)
    expect(undo(h).present).toBe('b')
  })

  test('push ignores identical reference', () => {
    const obj = { value: 1 }
    const h = createHistory(obj)
    expect(push(h, obj)).toBe(h)
  })

  test('bounds undo history to MAX_HISTORY (100) steps', () => {
    expect(MAX_HISTORY).toBe(100)
    let h = createHistory(0)
    for (let i = 1; i <= 150; i++) h = push(h, i)

    expect(h.present).toBe(150)
    expect(h.past).toHaveLength(100)

    let steps = 0
    while (canUndo(h)) {
      h = undo(h)
      steps++
    }
    expect(steps).toBe(100)
    expect(h.present).toBe(50)
  })

  test('works with chart edits including paste and clear', () => {
    const base = chartFromMeasures({ title: 'Test', style: 'medium-swing', key: 0, bpm: 120 }, [
      ['F7'],
      ['Bb7'],
      ['C7'],
      ['F7'],
    ])
    let h = createHistory(base)
    const edited = updateBar(h.present, 0, { chords: [{ symbol: 'G-7', beats: 4 }] })
    h = push(h, edited)
    const pasted = pasteBars(h.present, 2, copyBars(h.present, 0, 1))
    h = push(h, pasted)
    h = push(h, clearBars(h.present, 1, 2))

    expect(h.present.bars[1].chords).toEqual([])
    expect(h.present.bars[2].chords).toEqual([])

    h = undo(h)
    expect(h.present.bars[2].chords[0].symbol).toBe('G-7')
    expect(h.present.bars[3].chords[0].symbol).toBe('Bb7')

    h = undo(h)
    expect(h.present.bars[2].chords[0].symbol).toBe('C7')

    h = undo(h)
    expect(h.present.bars[0].chords[0].symbol).toBe('F7')
    expect(canUndo(h)).toBe(false)

    h = redo(redo(redo(h)))
    expect(h.present.bars[1].chords).toEqual([])
  })
})
