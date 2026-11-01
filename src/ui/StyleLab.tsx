import { useState } from 'react'
import type { DrumName } from '../styles/drums'
import { STYLES } from '../styles'
import {
  BASS_ROWS,
  DRUM_ROWS,
  barSteps,
  copyLayer,
  drumSteps,
  setBars,
  STEPS_PER_BEAT,
  type DrumCell,
  type DrumLayer,
  type LabStyle,
} from '../styles/lab'
import type { BassTone } from '../styles/types'

const DRUM_LABELS: Record<DrumName, string> = {
  kick: 'Kick',
  sidestick: 'Cross-stick',
  snare: 'Snare',
  clap: 'Clap',
  snare2: 'Snare 2',
  tomLow: 'Low tom',
  hhClosed: 'Hi-hat',
  hhPedal: 'Hi-hat foot',
  hhOpen: 'Open hi-hat',
  tomMid: 'Mid tom',
  tomHigh: 'High tom',
  crash: 'Crash',
  ride: 'Ride',
  rideBell: 'Ride bell',
  tambourine: 'Tambourine',
  cowbell: 'Cowbell',
  congaMute: 'Conga slap',
  congaHigh: 'Conga high',
  congaLow: 'Conga low',
  cabasa: 'Cabasa',
  shaker: 'Shaker',
  claves: 'Claves',
}

const BASS_LABELS: Record<BassTone, string> = {
  '8': 'Octave',
  '7': '7th',
  '6': '6th',
  '5': '5th',
  '3': '3rd',
  R: 'Root',
  '5-': '5th below',
  app: 'Lead-in',
}

// A click goes from nothing to a normal hit, an accent, a soft (ghost) hit and back to nothing
const VELOCITIES = [90, 118, 52]
function nextCell(cell: DrumCell | null): DrumCell | null {
  if (!cell) return { vel: VELOCITIES[0] }
  const next = VELOCITIES[VELOCITIES.indexOf(nearest(cell.vel)) + 1]
  return next ? { ...cell, vel: next } : null
}
// A hit that plays only sometimes, or back to always
function toggleMaybe(cell: DrumCell | null): DrumCell {
  const hit: DrumCell = { ...(cell ?? { vel: VELOCITIES[0] }) }
  if (hit.chance !== undefined && hit.chance < 1) delete hit.chance
  else hit.chance = 0.4
  return hit
}
const nearest = (vel: number) => VELOCITIES.reduce((a, b) => (Math.abs(b - vel) < Math.abs(a - vel) ? b : a))
const level = (vel: number) => (vel < 66 ? 'soft' : vel < 104 ? 'normal' : 'accent')

type Tab = 'drums' | 'bass' | 'chords'
// Which drum part the grid shows: groove A, variation B or the last-bar fill
type Layer = 'A' | 'B' | 'fill'
const LAYER_KEY = { A: 'drums', B: 'drumsB', fill: 'fill' } as const

interface StyleLabProps {
  lab: LabStyle
  onChange: (lab: LabStyle) => void
  onStartFrom: (styleId: string) => void
  canUndo: boolean
  onUndo: () => void
  step: number | null // sixteenth being heard within the drum groove, while playing
  onCopy: () => void
  copyState: CopyState
  onSend: () => void
  onClose: () => void
  myStyles: { id: string; name: string }[] // saved in this browser
  isSaved: boolean // a style with this name is in My styles
  onSave: () => void
  saveState: 'idle' | 'saved'
  onShare: () => void
  shareState: CopyState
  onDelete: () => void
}

type CopyState = 'idle' | 'copied' | 'failed'

export function StyleLab(props: StyleLabProps) {
  const { lab, onChange, onStartFrom, canUndo, onUndo, step, onCopy, copyState, onSend, onClose } = props
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tab, setTab] = useState<Tab>('drums')
  const [maybeMode, setMaybeMode] = useState(false) // clicks mark hits that play only sometimes
  const [chosenLayer, setLayer] = useState<Layer>('A')
  const one = barSteps(lab)
  // A layer that was removed (or never there, after Start from) falls back to groove A
  const layer: Layer = chosenLayer === 'B' && !lab.drumsB ? 'A' : chosenLayer === 'fill' && !lab.fill ? 'A' : chosenLayer
  const drums: DrumLayer = lab[LAYER_KEY[layer]] ?? {}
  const setDrums = (next: DrumLayer) => onChange({ ...lab, [LAYER_KEY[layer]]: next })
  const steps = layer === 'fill' ? one : drumSteps(lab)
  const shownDrums = DRUM_ROWS.filter((d) => drums[d])
  const otherDrums = DRUM_ROWS.filter((d) => !drums[d])

  const setDrum = (drum: DrumName, i: number, cell: DrumCell | null) => {
    const row = (drums[drum] ?? Array.from({ length: steps }, () => null)).slice()
    row[i] = cell
    setDrums({ ...drums, [drum]: row })
  }
  // A new variation or fill starts as a copy of groove A, ready to change
  const addLayer = (which: 'B' | 'fill') => {
    onChange({ ...lab, [LAYER_KEY[which]]: copyLayer(lab.drums, which === 'fill' ? one : drumSteps(lab)) })
    setLayer(which)
  }
  const removeLayer = () => {
    onChange({ ...lab, [LAYER_KEY[layer]]: null })
    setLayer('A')
  }
  const playhead = layer === 'fill' ? null : step

  const columns = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      [
        'lab-cell',
        i % STEPS_PER_BEAT === 0 && 'lab-beat',
        i % one === 0 && i > 0 && 'lab-bar',
        playhead !== null && playhead % count === i && 'lab-now',
      ]
        .filter(Boolean)
        .join(' '),
    )

  return (
    <section className="lab" aria-label="Style lab">
      <div className="lab-head">
        <h2 className="lab-title">Style lab</h2>
        <label className="field">
          <span className="label">Start from</span>
          <select className="select" value={lab.base} onChange={(e) => onStartFrom(e.target.value)}>
            <optgroup label="Styles">
              {STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
            {props.myStyles.length > 0 && (
              <optgroup label="My styles">
                {props.myStyles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        {canUndo && (
          <button className="chip" onClick={onUndo}>
            Undo
          </button>
        )}
        <label className="field field-text">
          <span className="label">Name</span>
          <input className="text-input" value={lab.name} onChange={(e) => onChange({ ...lab, name: e.target.value })} />
        </label>
        <label className="field">
          <span className="label">Feel</span>
          <span className="lab-swing">
            <input
              type="range"
              min={50}
              max={75}
              value={Math.round(lab.swing * 100)}
              aria-valuetext={lab.swing > 0.5 ? `swing ${Math.round(lab.swing * 100)}%` : 'straight'}
              onChange={(e) => onChange({ ...lab, swing: Number(e.target.value) / 100 })}
            />
            <output>{lab.swing > 0.5 ? `Swing ${Math.round(lab.swing * 100)}%` : 'Straight'}</output>
          </span>
        </label>
        <span className="editor-spacer" />
        {props.isSaved && (
          <button
            className={confirmDelete ? 'chip chip-danger' : 'chip'}
            onClick={() => (confirmDelete ? props.onDelete() : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
          >
            {confirmDelete ? 'Delete style?' : 'Delete'}
          </button>
        )}
        <button
          className="chip"
          onClick={props.onSave}
          title="Keep this style in My styles, in this browser, and choose it from the style menu"
        >
          {props.saveState === 'saved' ? 'Saved' : props.isSaved ? 'Save changes' : 'Save'}
        </button>
        <button className="chip" onClick={props.onShare} title="Copy a link that opens this style in OpenStand, with the tune on screen to hear it on">
          {props.shareState === 'copied' ? 'Link copied' : props.shareState === 'failed' ? 'Copy failed' : 'Share link'}
        </button>
        <button className="chip" onClick={onCopy}>
          {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy code'}
        </button>
        <button
          className="chip chip-primary"
          onClick={onSend}
          title="Copies the code and opens GitHub, where you can propose it as a new style"
        >
          Send to OpenStand
        </button>
        <button className="icon-button lab-close" aria-label="Close the style lab" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="lab-tabs" role="tablist">
        {(['drums', 'bass', 'chords'] as Tab[]).map((t) => (
          <button key={t} role="tab" className="chip" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === 'drums' ? 'Drums' : t === 'bass' ? 'Bass' : 'Chords'}
          </button>
        ))}
        <span className="lab-hint">
          {tab === 'drums'
            ? maybeMode
              ? 'Click a hit to make it play only sometimes (hatched), or always again.'
              : layer === 'B'
                ? 'The band switches between grooves A and B as it plays. Click: hit, accent, soft, off.'
                : layer === 'fill'
                  ? 'Plays in the last bar of each time through the form. Click: hit, accent, soft, off.'
                  : 'Click: hit, accent, soft, off. Right-click or Sometimes: plays only sometimes.'
            : tab === 'bass'
              ? 'One bar of a four-beat chord. Notes are chord tones, so the line follows the changes.'
              : 'When the piano or guitar plays on a chord that lasts a bar. Each hit lasts until the next.'}
        </span>
      </div>

      {tab === 'drums' && (
        <>
          <div className="lab-options" role="group" aria-label="Drum part">
            <button className="chip" aria-pressed={layer === 'A'} onClick={() => setLayer('A')}>
              {lab.drumsB ? 'Groove A' : 'Groove'}
            </button>
            {lab.drumsB ? (
              <button className="chip" aria-pressed={layer === 'B'} onClick={() => setLayer('B')}>
                Groove B
              </button>
            ) : (
              <button className="chip" onClick={() => addLayer('B')} title="A second groove; the band switches between the two">
                + Variation B
              </button>
            )}
            {lab.fill ? (
              <button className="chip" aria-pressed={layer === 'fill'} onClick={() => setLayer('fill')}>
                Fill
              </button>
            ) : (
              <button className="chip" onClick={() => addLayer('fill')} title="A bar the drummer plays at the end of each time through the form">
                + Fill
              </button>
            )}
            {layer !== 'A' && (
              <button className="chip" onClick={removeLayer}>
                Remove {layer === 'B' ? 'groove B' : 'fill'}
              </button>
            )}
          </div>
          <div className="lab-options">
            {layer !== 'fill' && (
              <>
                <span className="label">Length</span>
                {([1, 2] as const).map((n) => (
                  <button key={n} className="chip" aria-pressed={lab.bars === n} onClick={() => onChange(setBars(lab, n))}>
                    {n} bar{n === 2 ? 's' : ''}
                  </button>
                ))}
              </>
            )}
            <button className="chip" aria-pressed={maybeMode} onClick={() => setMaybeMode(!maybeMode)}>
              Sometimes
            </button>
            <label className="check">
              <input type="checkbox" checked={lab.fills} onChange={(e) => onChange({ ...lab, fills: e.target.checked })} />
              Crash on each chorus
            </label>
            {otherDrums.length > 0 && (
              <select
                className="select"
                aria-label="Add a drum"
                value=""
                onChange={(e) => {
                  const drum = e.target.value as DrumName
                  if (drum) setDrums({ ...drums, [drum]: Array.from({ length: steps }, () => null) })
                }}
              >
                <option value="">Add a drum…</option>
                {otherDrums.map((d) => (
                  <option key={d} value={d}>
                    {DRUM_LABELS[d]}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="lab-grid-wrap">
            <table className="lab-grid">
              <tbody>
                {shownDrums.map((drum) => (
                  <tr key={drum}>
                    <th scope="row">
                      <button
                        className="lab-row-remove"
                        aria-label={`Remove ${DRUM_LABELS[drum]}`}
                        title="Remove this drum"
                        onClick={() => {
                          const next = { ...drums }
                          delete next[drum]
                          setDrums(next)
                        }}
                      >
                        ×
                      </button>
                      {DRUM_LABELS[drum]}
                    </th>
                    {columns(steps).map((cls, i) => {
                      const cell = drums[drum]?.[i] ?? null
                      return (
                        <td key={i} className={cls}>
                          <button
                            className="lab-hit"
                            data-level={cell ? level(cell.vel) : undefined}
                            data-maybe={cell?.chance !== undefined && cell.chance < 1 ? '' : undefined}
                            aria-label={`${DRUM_LABELS[drum]}, beat ${Math.floor(i / STEPS_PER_BEAT) + 1}, step ${(i % STEPS_PER_BEAT) + 1}: ${cell ? level(cell.vel) : 'off'}`}
                            onClick={() => setDrum(drum, i, maybeMode ? toggleMaybe(cell) : nextCell(cell))}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              setDrum(drum, i, toggleMaybe(cell))
                            }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'bass' && (
        <>
          <div className="lab-options">
            <button
              className="chip"
              aria-pressed={lab.bass.walking}
              onClick={() => onChange({ ...lab, bass: { ...lab.bass, walking: true } })}
            >
              Walking (automatic)
            </button>
            <button
              className="chip"
              aria-pressed={!lab.bass.walking}
              onClick={() => onChange({ ...lab, bass: { ...lab.bass, walking: false } })}
            >
              Pattern
            </button>
          </div>
          {lab.bass.walking ? (
            <p className="lab-note">
              The bass walks in quarter notes and picks its own line through the changes. Choose Pattern to write a bass part.
            </p>
          ) : (
            <div className="lab-grid-wrap">
              <table className="lab-grid">
                <tbody>
                  {BASS_ROWS.map((tone) => (
                    <tr key={tone}>
                      <th scope="row">{BASS_LABELS[tone]}</th>
                      {columns(one).map((cls, i) => {
                        const on = lab.bass.steps[i] === tone
                        return (
                          <td key={i} className={cls}>
                            <button
                              className="lab-hit"
                              data-level={on ? 'normal' : undefined}
                              aria-label={`${BASS_LABELS[tone]}, beat ${Math.floor(i / STEPS_PER_BEAT) + 1}, step ${(i % STEPS_PER_BEAT) + 1}: ${on ? 'on' : 'off'}`}
                              onClick={() => {
                                const next = lab.bass.steps.slice()
                                next[i] = on ? null : tone
                                onChange({ ...lab, bass: { ...lab.bass, steps: next } })
                              }}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'chords' && (
        <div className="lab-grid-wrap">
          <table className="lab-grid">
            <tbody>
              <tr>
                <th scope="row">Chord</th>
                {columns(one).map((cls, i) => (
                  <td key={i} className={cls}>
                    <button
                      className="lab-hit"
                      data-level={lab.comp[i] ? 'normal' : undefined}
                      aria-label={`Chord, beat ${Math.floor(i / STEPS_PER_BEAT) + 1}, step ${(i % STEPS_PER_BEAT) + 1}: ${lab.comp[i] ? 'on' : 'off'}`}
                      onClick={() => {
                        const next = lab.comp.slice()
                        next[i] = !next[i]
                        onChange({ ...lab, comp: next })
                      }}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
