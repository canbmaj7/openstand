import type { Chart, ChartBar, TimeSignature } from '../music/chart'
import { BarTimeField } from './BarTimeField'

const SECTIONS = ['A', 'B', 'C', 'D', 'i', 'v']
const DIRECTIVES = ['Fine', 'D.C. al Fine', 'D.C. al Coda', 'D.S. al Fine', 'D.S. al Coda']

interface EditorMarksProps {
  chart: Chart
  index: number
  bar: ChartBar
  times: TimeSignature[]
  onlyThisBar: boolean
  onOnlyThisBarChange: (checked: boolean) => void
  onPatch: (patch: Partial<ChartBar>) => void
  onApplyTimeChange: (next: Chart) => void
}

/** Per-bar markings row in the chart editor (section, repeats, endings, time, text, fermata, new line). */
export function EditorMarks({
  chart,
  index,
  bar,
  times,
  onlyThisBar,
  onOnlyThisBarChange,
  onPatch,
  onApplyTimeChange,
}: EditorMarksProps) {
  const sign = bar.segno ? 'segno' : bar.coda ? 'coda' : ''
  const barline = bar.repeatEnd ? 'repeat' : (bar.barline ?? '')

  return (
    <div className="editor-row editor-marks">
      <label className="field">
        <span className="label">Section</span>
        <select className="select" value={bar.section ?? ''} onChange={(e) => onPatch({ section: e.target.value || undefined })}>
          <option value="">–</option>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'i' ? 'Intro' : s === 'v' ? 'Verse' : s}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="label">Start</span>
        <select
          className="select"
          value={bar.repeatStart ? 'repeat' : ''}
          onChange={(e) => onPatch({ repeatStart: e.target.value === 'repeat' || undefined })}
        >
          <option value="">Barline</option>
          <option value="repeat">Repeat from here</option>
        </select>
      </label>
      <label className="field">
        <span className="label">End</span>
        <select
          className="select"
          value={barline}
          onChange={(e) => {
            const v = e.target.value
            onPatch({
              repeatEnd: v === 'repeat' || undefined,
              barline: v === 'double' || v === 'final' ? v : undefined,
              repeatTimes: v === 'repeat' ? bar.repeatTimes : undefined,
            })
          }}
        >
          <option value="">Barline</option>
          <option value="double">Double barline</option>
          <option value="final">Final barline</option>
          <option value="repeat">Repeat back</option>
        </select>
      </label>
      {bar.repeatEnd && (
        <label className="field">
          <span className="label">Times</span>
          <select
            className="select"
            value={bar.repeatTimes ?? 2}
            onChange={(e) => onPatch({ repeatTimes: Number(e.target.value) === 2 ? undefined : Number(e.target.value) })}
          >
            {[2, 3, 4, 5, 6, 8].map((n) => (
              <option key={n} value={n}>
                {n}×
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span className="label">Ending</span>
        <select className="select" value={bar.ending ?? ''} onChange={(e) => onPatch({ ending: Number(e.target.value) || undefined })}>
          <option value="">–</option>
          {[1, 2, 3].map((n) => (
            <option key={n} value={n}>
              {n}.
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="label">Sign</span>
        <select
          className="select"
          value={sign}
          onChange={(e) => onPatch({ segno: e.target.value === 'segno' || undefined, coda: e.target.value === 'coda' || undefined })}
        >
          <option value="">–</option>
          <option value="segno">Segno</option>
          <option value="coda">Coda</option>
        </select>
      </label>
      <label className="field">
        <span className="label">Jump</span>
        <select className="select" value={bar.directive ?? ''} onChange={(e) => onPatch({ directive: e.target.value || undefined })}>
          <option value="">–</option>
          {DIRECTIVES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
          {bar.directive && !DIRECTIVES.includes(bar.directive) && <option value={bar.directive}>{bar.directive}</option>}
        </select>
      </label>
      <BarTimeField
        chart={chart}
        index={index}
        times={times}
        onlyThisBar={onlyThisBar}
        onOnlyThisBarChange={onOnlyThisBarChange}
        onApply={onApplyTimeChange}
      />
      <label className="field field-text">
        <span className="label">Text</span>
        <input className="text-input" value={bar.comment ?? ''} onChange={(e) => onPatch({ comment: e.target.value || undefined })} />
      </label>
      <label className="check">
        <input type="checkbox" checked={!!bar.fermata} onChange={(e) => onPatch({ fermata: e.target.checked || undefined })} />
        Fermata
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={index === 0 || !!bar.rowStart}
          disabled={index === 0}
          onChange={(e) => onPatch({ rowStart: e.target.checked || undefined })}
        />
        New line
      </label>
    </div>
  )
}
