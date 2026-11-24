import type { Chart, TimeSignature } from '../music/chart'
import { groupsAt, setBarGroups, setBarTime, timeAt } from '../music/edit'
import { GroupingField } from './GroupingField'

const sameTime = (a: TimeSignature, b: TimeSignature) => a[0] === b[0] && a[1] === b[1]

interface BarTimeFieldProps {
  chart: Chart
  index: number
  times: TimeSignature[]
  onlyThisBar: boolean
  onOnlyThisBarChange: (checked: boolean) => void
  onApply: (next: Chart) => void
}

/** Time signature selector and single-bar toggle for the currently selected bar in the editor. */
export function BarTimeField({ chart, index, times, onlyThisBar, onOnlyThisBarChange, onApply }: BarTimeFieldProps) {
  const bar = chart.bars[index]
  const current = timeAt(chart, index)
  const currentGroups = groupsAt(chart, index)
  const currentKey = current.join('/')
  const value = index === 0 ? currentKey : bar.time ? bar.time.join('/') : ''
  const options =
    (index === 0 || bar.time) && !times.some((t) => sameTime(t, current)) ? [...times, current] : times

  return (
    <>
      <label className="field">
        <span className="label">Time ({currentKey})</span>
        <select
          className="select"
          aria-label="Bar time signature"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (v === '') {
              if (index === 0) return
              onApply(setBarTime(chart, index, null, onlyThisBar))
              return
            }
            const found = options.find((t) => t.join('/') === v)
            if (found) onApply(setBarTime(chart, index, found, onlyThisBar))
          }}
        >
          <option value="" disabled={index === 0}>
            —
          </option>
          {options.map((t) => (
            <option key={t.join('/')} value={t.join('/')}>
              {t.join('/')}
            </option>
          ))}
        </select>
      </label>
      <GroupingField
        time={current}
        groups={currentGroups}
        ariaLabel="Bar grouping"
        onChange={(next) => onApply(setBarGroups(chart, index, next, onlyThisBar))}
      />
      <label className="check">
        <input type="checkbox" checked={onlyThisBar} onChange={(e) => onOnlyThisBarChange(e.target.checked)} />
        Only this bar
      </label>
    </>
  )
}
