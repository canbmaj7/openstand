import { useEffect, useRef, useState } from 'react'
import { type BarChord, type Chart, type ChartBar, type TimeSignature } from '../music/chart'
import { deleteBar, insertBar, timeAt, updateBar } from '../music/edit'
import { barToInput, parseBarInput } from '../music/notation'
import { STYLES } from '../styles'
import { EditorMarks } from './EditorMarks'
import { EditorTune } from './EditorTune'

const TIMES: TimeSignature[] = [
  [4, 4],
  [3, 4],
  [2, 4],
  [5, 4],
  [6, 4],
  [5, 8],
  [6, 8],
  [7, 8],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
]

function sameChords(a: BarChord[], b: BarChord[]): boolean {
  return (
    a.length === b.length &&
    a.every((c, i) => c.symbol === b[i].symbol && c.alt === b[i].alt && Math.abs(c.beats - b[i].beats) < 1e-9)
  )
}

// Title and composer, written on the sheet itself
export function EditorHeader({ chart, onChange }: { chart: Chart; onChange: (c: Chart) => void }) {
  return (
    <header className="sheet-head sheet-head-edit">
      <span className="sheet-meta">({STYLES.find((s) => s.id === chart.style)?.name})</span>
      <input
        className="sheet-title sheet-input"
        aria-label="Title"
        placeholder="Title"
        value={chart.title}
        onChange={(e) => onChange({ ...chart, title: e.target.value })}
      />
      <input
        className="sheet-meta sheet-meta-right sheet-input"
        aria-label="Composer"
        placeholder="Composer"
        value={chart.composer ?? ''}
        onChange={(e) => onChange({ ...chart, composer: e.target.value || undefined })}
      />
    </header>
  )
}

interface EditorProps {
  chart: Chart
  onChange: (chart: Chart) => void
  selected: number
  selectionRange: [number, number] | null
  focusInputOnSelect: boolean
  focusTick: number
  onSelect: (index: number) => void
  canUndo: boolean
  canRedo: boolean
  canPaste: boolean
  onUndo: () => void
  onRedo: () => void
  onCopyBars: () => void
  onPasteBars: () => void
  onRegisterUncommitted: (fn: () => boolean) => void
  saveLabel: string
  canDelete: boolean
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}

export function Editor({
  chart,
  onChange,
  selected,
  selectionRange,
  focusInputOnSelect,
  focusTick,
  onSelect,
  canUndo,
  canRedo,
  canPaste,
  onUndo,
  onRedo,
  onCopyBars,
  onPasteBars,
  onRegisterUncommitted,
  saveLabel,
  canDelete,
  onSave,
  onCancel,
  onDelete,
}: EditorProps) {
  const index = Math.min(selected, chart.bars.length - 1)
  const bar = chart.bars[index]
  const time = timeAt(chart, index)
  const [text, setText] = useState(() => barToInput(bar.chords, time))
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [onlyThisBar, setOnlyThisBar] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef(error)

  useEffect(() => {
    errorRef.current = error
  }, [error])

  useEffect(() => {
    onRegisterUncommitted(() => errorRef.current !== '')
  }, [onRegisterUncommitted])

  // A newly selected bar or external edit (undo/redo/paste/clear) updates the chord box
  const shownBar = useRef(-1)
  const selfChartRef = useRef<Chart | null>(null)
  const lastFocusTick = useRef(0)
  useEffect(() => {
    const barChanged = shownBar.current !== index
    const externalChartChange = selfChartRef.current !== chart
    const focusTriggered = lastFocusTick.current !== focusTick
    selfChartRef.current = chart
    lastFocusTick.current = focusTick
    if (barChanged) {
      shownBar.current = index
      setText(barToInput(chart.bars[index].chords, timeAt(chart, index)))
      setError('')
      if (focusInputOnSelect) inputRef.current?.focus({ preventScroll: true })
      document.querySelector('.bar-selected')?.scrollIntoView({ block: 'nearest' })
    } else {
      if (externalChartChange) {
        setText(barToInput(chart.bars[index].chords, timeAt(chart, index)))
        setError('')
      }
      if (focusTriggered && focusInputOnSelect) inputRef.current?.focus({ preventScroll: true })
    }
  }, [index, chart, focusInputOnSelect, focusTick])

  const patch = (p: Partial<ChartBar>) => onChange(updateBar(chart, index, p))

  const applyTimeChange = (next: Chart) => {
    onChange(next)
    setText(barToInput(next.bars[index].chords, timeAt(next, index)))
    setError('')
  }

  const typeChords = (value: string) => {
    setText(value)
    const result = parseBarInput(value, time)
    if (result.ok) {
      setError('')
      if (!sameChords(bar.chords, result.chords)) {
        const next = updateBar(chart, index, { chords: result.chords })
        selfChartRef.current = next
        onChange(next)
      }
    } else setError(result.error)
  }

  const go = (to: number) => {
    if (to >= chart.bars.length) {
      onChange(insertBar(chart, chart.bars.length - 1))
      onSelect(chart.bars.length)
    } else onSelect(Math.max(0, to))
  }

  const rangeLabel =
    selectionRange && selectionRange[0] !== selectionRange[1]
      ? `Bars ${selectionRange[0] + 1}–${selectionRange[1] + 1}`
      : `Bar ${index + 1}`

  return (
    <section className="editor" aria-label="Chart editor">
      <div className="editor-row">
        <div className="editor-nav">
          <button type="button" className="icon-button" aria-label="Previous bar" disabled={index === 0} onClick={() => go(index - 1)}>
            ‹
          </button>
          <span className="editor-barno">
            {rangeLabel}
            <span className="editor-of">/{chart.bars.length}</span>
          </span>
          <button type="button" className="icon-button" aria-label="Next bar" onClick={() => go(index + 1)}>
            ›
          </button>
        </div>
        <div className="editor-chords">
          <input
            ref={inputRef}
            data-editor-chord-input="true"
            className={error ? 'editor-input editor-input-error' : 'editor-input'}
            aria-label={`Chords in bar ${index + 1}`}
            aria-invalid={!!error}
            aria-describedby="editor-hint"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="Dm7 G7"
            value={text}
            onChange={(e) => typeChords(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              go(e.shiftKey ? index - 1 : index + 1)
            }}
          />
          <span id="editor-hint" className={error ? 'editor-hint editor-hint-error' : 'editor-hint'}>
            {error || 'Enter: next bar · empty: hold the chord · NC: no chord · C:3 G7:1 sets beats'}
          </span>
        </div>
        <div className="editor-buttons">
          <button
            type="button"
            className="chip"
            onClick={() => {
              onChange(insertBar(chart, index))
              onSelect(index + 1)
            }}
          >
            Insert bar
          </button>
          <button
            type="button"
            className="chip"
            disabled={chart.bars.length <= 1}
            onClick={() => {
              onChange(deleteBar(chart, index))
              onSelect(Math.max(0, Math.min(index, chart.bars.length - 2)))
              shownBar.current = -1
            }}
          >
            Delete bar
          </button>
          <button type="button" className="chip" aria-label="Copy bars" onClick={onCopyBars}>
            Copy bars
          </button>
          <button type="button" className="chip" aria-label="Paste bars" disabled={!canPaste} onClick={onPasteBars}>
            Paste bars
          </button>
          <button type="button" className="chip" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
            Undo
          </button>
          <button type="button" className="chip" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
            Redo
          </button>
        </div>
      </div>

      <EditorMarks
        chart={chart}
        index={index}
        bar={bar}
        times={TIMES}
        onlyThisBar={onlyThisBar}
        onOnlyThisBarChange={setOnlyThisBar}
        onPatch={patch}
        onApplyTimeChange={applyTimeChange}
      />

      <EditorTune
        chart={chart}
        times={TIMES}
        canDelete={canDelete}
        confirmDelete={confirmDelete}
        saveLabel={saveLabel}
        onChange={onChange}
        onApplyTimeChange={applyTimeChange}
        onConfirmDeleteChange={setConfirmDelete}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </section>
  )
}
