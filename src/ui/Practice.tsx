import type { CountInMode, SubMode } from '../engine/timeline'
import type { Chart } from '../music/chart'
import { parseHideChords, type HideChords } from '../music/hideChords'
import { KEY_STEPS, newRandomKeySeed, parseCountIn, RAMP_INTERVALS, sections, type PracticeSettings } from '../music/practice'
import { closestSwingFeel, SWING_FEELS, swingLabel, swingRatioForId } from '../music/swingFeel'
import { Popover } from './Popover'

const barRange = ([a, b]: [number, number]) => (a === b ? `Bar ${a + 1}` : `Bars ${a + 1}–${b + 1}`)

interface PracticeProps {
  chart: Chart
  settings: PracticeSettings
  onChange: (next: PracticeSettings) => void
  onPickLoop: () => void
  hideChords: HideChords
  onHideChords: (mode: HideChords) => void
  swing: number | undefined
  styleSwing: number
  swingDisabled?: boolean
  onSwing: (ratio: number | undefined) => void
}

export function Practice({
  chart,
  settings,
  onChange,
  onPickLoop,
  hideChords,
  onHideChords,
  swing,
  styleSwing,
  swingDisabled,
  onSwing,
}: PracticeProps) {
  const hasSubs = chart.bars.some((b) => b.chords.some((c) => Boolean(c.alt)))
  const active =
    settings.loop !== null ||
    settings.keyStep !== 0 ||
    Boolean(settings.randomKeys) ||
    settings.ramp !== 0 ||
    settings.subs !== 'off' ||
    settings.countIn !== 'auto' ||
    hideChords !== 'off' ||
    (!swingDisabled && swing !== undefined)
  const marks = sections(chart)

  return (
    <Popover
      id="practice"
      className="practice"
      active={active}
      label={
        <>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 6a5 5 0 0 1 9-2M13 10a5 5 0 0 1-9 2" />
            <path d="M12.5 1.5v3h-3M3.5 14.5v-3h3" />
          </svg>
          Practice
        </>
      }
    >
      {(close) => (
        <div className="practice-panel">
          <div className="practice-row">
            <span className="label">Loop</span>
            <div className="practice-loop">
              {settings.loop ? (
                <>
                  <span className="practice-value">{barRange(settings.loop)}</span>
                  <button className="chip" onClick={() => onChange({ ...settings, loop: null })}>
                    Clear
                  </button>
                </>
              ) : (
                <span className="practice-value practice-off">Whole tune</span>
              )}
              <button
                className="chip"
                onClick={() => {
                  close()
                  onPickLoop()
                }}
              >
                Choose bars
              </button>
            </div>
            {marks.length > 1 && (
              <div className="practice-sections">
                {marks.map((s) => {
                  const on = settings.loop?.[0] === s.from && settings.loop?.[1] === s.to
                  return (
                    <button
                      key={s.from}
                      className="chip"
                      aria-pressed={on}
                      title={barRange([s.from, s.to])}
                      onClick={() => onChange({ ...settings, loop: on ? null : [s.from, s.to] })}
                    >
                      {s.name}
                      <span className="chip-meta">{s.from + 1}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <label className="practice-row">
            <span className="label">Keys</span>
            <select
              className="select"
              value={settings.randomKeys ? 'random' : String(settings.keyStep)}
              onChange={(e) => {
                if (e.target.value === 'random') {
                  onChange({ ...settings, keyStep: 0, randomKeys: { seed: newRandomKeySeed() } })
                } else {
                  onChange({ ...settings, keyStep: Number(e.target.value), randomKeys: undefined })
                }
              }}
            >
              {KEY_STEPS.map((k) => (
                <option key={k.step} value={String(k.step)}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>

          <div className="practice-row">
            <span className="label" id="ramp-label">
              Speed up
            </span>
            <div className="stepper" role="group" aria-labelledby="ramp-label">
              <button aria-label="Less" disabled={settings.ramp <= 0} onClick={() => onChange({ ...settings, ramp: settings.ramp - 2 })}>
                −
              </button>
              <output className="stepper-value">+{settings.ramp}</output>
              <button aria-label="More" disabled={settings.ramp >= 20} onClick={() => onChange({ ...settings, ramp: settings.ramp + 2 })}>
                +
              </button>
              <span className="practice-unit">bpm</span>
              <select
                className="select"
                aria-label="Speed up interval"
                disabled={settings.ramp === 0}
                value={settings.rampEvery}
                onChange={(e) => onChange({ ...settings, rampEvery: Number(e.target.value) })}
              >
                {RAMP_INTERVALS.map((r) => (
                  <option key={r.every} value={r.every}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="practice-row">
            <span className="label">Substitutions</span>
            <select
              className="select"
              disabled={!hasSubs}
              value={settings.subs}
              onChange={(e) => onChange({ ...settings, subs: e.target.value as SubMode })}
            >
              <option value="off">Off</option>
              <option value="alternate">Every other chorus</option>
              <option value="random">Random</option>
            </select>
            {!hasSubs && <span className="practice-unit">Add one in the editor: C7(Gb7)</span>}
          </label>

          <label className="practice-row">
            <span className="label">Count-in</span>
            <select
              className="select"
              value={String(settings.countIn)}
              onChange={(e) => onChange({ ...settings, countIn: parseCountIn(e.target.value) as CountInMode })}
            >
              <option value="auto">Auto</option>
              <option value="off">Off</option>
              <option value="1">1 bar</option>
              <option value="2">2 bars</option>
            </select>
          </label>

          <label className="practice-row">
            <span className="label">Swing</span>
            <select
              className="select"
              aria-label="Swing"
              disabled={swingDisabled}
              value={swing !== undefined ? closestSwingFeel(swing).id : ''}
              onChange={(e) => onSwing(swingRatioForId(e.target.value))}
            >
              <option value="">{`Style (${swingLabel(styleSwing)})`}</option>
              {SWING_FEELS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id === 'straight' ? f.label : `${f.label} · ${Math.round(f.ratio * 100)}%`}
                </option>
              ))}
            </select>
          </label>

          <label className="practice-row">
            <span className="label">Hide chords</span>
            <select
              className="select"
              aria-label="Hide chords"
              value={hideChords}
              onChange={(e) => onHideChords(parseHideChords(e.target.value))}
            >
              <option value="off">Off</option>
              <option value="gradual">Gradually</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>
      )}
    </Popover>
  )
}
