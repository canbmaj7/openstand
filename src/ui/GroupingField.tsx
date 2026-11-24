import type { TimeSignature } from '../music/chart'
import { groupingOptions, groupsFor } from '../music/meter'

interface GroupingFieldProps {
  time: TimeSignature
  groups?: number[]
  ariaLabel?: string
  onChange: (groups: number[] | undefined) => void
}

/** Beat-grouping selector shown when the active time signature supports aksak/odd groupings. */
export function GroupingField({ time, groups, ariaLabel, onChange }: GroupingFieldProps) {
  const options = groupingOptions(time)
  if (options.length === 0) return null

  const active = groupsFor(time, groups)
  const value = active ? active.join('+') : ''
  const hasOption = options.some((opt) => (opt.groups ? opt.groups.join('+') : '') === value)

  return (
    <label className="field">
      <span className="label">Grouping</span>
      <select
        className="select"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => {
          const picked = options.find((opt) => (opt.groups ? opt.groups.join('+') : '') === e.target.value)
          onChange(picked?.groups)
        }}
      >
        {options.map((opt) => {
          const key = opt.groups ? opt.groups.join('+') : ''
          return (
            <option key={key || 'compound'} value={key}>
              {opt.label}
            </option>
          )
        })}
        {!hasOption && active && <option value={value}>{value}</option>}
      </select>
    </label>
  )
}
