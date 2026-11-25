import { useState } from 'react'
import type { Chart, TimeSignature } from '../music/chart'
import { keyPrefersFlats, noteName } from '../music/chords'
import { setGroups, setTime } from '../music/edit'
import { transposeChart } from '../music/transposeChart'
import { STYLES } from '../styles'
import { GroupingField } from './GroupingField'

const sameTime = (a: TimeSignature, b: TimeSignature) => a[0] === b[0] && a[1] === b[1]

interface EditorTuneProps {
  chart: Chart
  times: TimeSignature[]
  canDelete: boolean
  confirmDelete: boolean
  saveLabel: string
  onChange: (next: Chart) => void
  onApplyTimeChange: (next: Chart) => void
  onConfirmDeleteChange: (confirm: boolean) => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}

/** Tune-level properties row and save/cancel/delete actions in the chart editor. */
export function EditorTune({
  chart,
  times,
  canDelete,
  confirmDelete,
  saveLabel,
  onChange,
  onApplyTimeChange,
  onConfirmDeleteChange,
  onSave,
  onCancel,
  onDelete,
}: EditorTuneProps) {
  const [moveChords, setMoveChords] = useState(true)
  const changeKey = (key: number) => onChange(moveChords ? transposeChart(chart, key) : { ...chart, key })
  return (
    <div className="editor-row editor-tune">
      <label className="field">
        <span className="label">Key</span>
        <span className="field-pair">
          <select className="select" aria-label="Key" value={chart.key} onChange={(e) => changeKey(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, pc) => (
              <option key={pc} value={pc}>
                {noteName(pc, keyPrefersFlats(pc))}
              </option>
            ))}
          </select>
          <select
            className="select"
            aria-label="Mode"
            value={chart.minor ? 'minor' : 'major'}
            onChange={(e) => onChange({ ...chart, minor: e.target.value === 'minor' || undefined })}
          >
            <option value="major">major</option>
            <option value="minor">minor</option>
          </select>
        </span>
      </label>
      <label className="check editor-move-chords" title="Changing the key moves every chord to the new key">
        <input type="checkbox" checked={moveChords} onChange={(e) => setMoveChords(e.target.checked)} />
        Move chords
      </label>
      <label className="field">
        <span className="label">Time</span>
        <select
          className="select"
          value={chart.time.join('/')}
          onChange={(e) => {
            const t = times.find((x) => x.join('/') === e.target.value)
            if (t && !sameTime(t, chart.time)) onApplyTimeChange(setTime(chart, t))
          }}
        >
          {times.map((t) => (
            <option key={t.join('/')} value={t.join('/')}>
              {t.join('/')}
            </option>
          ))}
        </select>
      </label>
      <GroupingField time={chart.time} groups={chart.groups} onChange={(g) => onChange(setGroups(chart, g))} />
      <label className="field">
        <span className="label">Style</span>
        <select
          className="select"
          value={chart.style}
          onChange={(e) => onChange({ ...chart, style: e.target.value, sourceStyle: undefined })}
        >
          {STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="label">Tempo</span>
        <input
          className="text-input text-input-number"
          type="number"
          min={40}
          max={300}
          value={chart.bpm}
          onChange={(e) => onChange({ ...chart, bpm: Math.max(40, Math.min(300, Number(e.target.value) || 120)) })}
        />
      </label>

      <span className="editor-spacer" />
      {canDelete && (
        <button
          type="button"
          className={confirmDelete ? 'chip chip-danger' : 'chip'}
          onClick={() => (confirmDelete ? onDelete() : onConfirmDeleteChange(true))}
          onBlur={() => onConfirmDeleteChange(false)}
        >
          {confirmDelete ? 'Delete tune?' : 'Delete tune'}
        </button>
      )}
      <button type="button" className="chip" onClick={onCancel}>
        Cancel
      </button>
      <button type="button" className="chip chip-primary" onClick={onSave}>
        {saveLabel}
      </button>
    </div>
  )
}
