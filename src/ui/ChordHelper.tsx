import { useState } from 'react'
import { chordKey, chordSpellLabel, chordToneData, type Chord } from '../music/chords'
import { guitarShapes, ukuleleShapes } from '../music/fretboard'
import { scaleNoteNames, scalesForChord } from '../music/scales'
import { FretDiagram, PianoKeyboard } from './ChordHelperDiagrams'
import { ChordHelperScales } from './ChordHelperScales'
import { ChordHelperTune } from './ChordHelperTune'
import { Popover } from './Popover'
import './chordHelper.css'
import './chordHelperHear.css'
import './chordHelperTune.css'

export type HelperView = 'both' | 'keyboard' | 'guitar' | 'ukulele'
export type HelperScope = 'chord' | 'tune'

const HELPER_VIEW_KEY = 'openstand:helper-view'
const HELPER_SCOPE_KEY = 'openstand:helper-scope'

function isHelperView(value: unknown): value is HelperView {
  return value === 'both' || value === 'keyboard' || value === 'guitar' || value === 'ukulele'
}

function isHelperScope(value: unknown): value is HelperScope {
  return value === 'chord' || value === 'tune'
}

function loadSetting<T extends string>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const saved = localStorage.getItem(key)
    return valid(saved) ? saved : fallback
  } catch {
    return fallback
  }
}

function saveSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage may be disabled in private browsing
  }
}

interface ChordHelperProps {
  chord: Chord
  tuneChords: Chord[]
  keyPc: number
  following: boolean
  onFollowChange: (follow: boolean) => void
  onPickChord: (chord: Chord) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  canAudition: boolean
  onAudition: (chord: Chord, scale?: number[]) => void
}

const VIEW_OPTIONS: { value: HelperView; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'guitar', label: 'Guitar' },
  { value: 'ukulele', label: 'Ukulele' },
]

export function ChordHelper({
  chord,
  tuneChords,
  keyPc,
  following,
  onFollowChange,
  onPickChord,
  open,
  onOpenChange,
  canAudition,
  onAudition,
}: ChordHelperProps) {
  const key = chordKey(chord)
  const [picked, setPicked] = useState<{ chordKey: string; scaleId: string } | null>(null)
  const [view, setView] = useState<HelperView>(() => loadSetting(HELPER_VIEW_KEY, 'both', isHelperView))
  const [scope, setScope] = useState<HelperScope>(() => loadSetting(HELPER_SCOPE_KEY, 'chord', isHelperScope))

  const handleViewChange = (next: HelperView) => {
    setView(next)
    saveSetting(HELPER_VIEW_KEY, next)
  }

  const handleScopeChange = (next: HelperScope) => {
    setScope(next)
    saveSetting(HELPER_SCOPE_KEY, next)
  }

  const handlePickChord = (next: Chord) => {
    onPickChord(next)
    handleScopeChange('chord')
  }

  const scales = scalesForChord(chord)
  const activeScale = (picked?.chordKey === key && scales.find((s) => s.id === picked.scaleId)) || scales[0]

  const label = chordSpellLabel(chord, keyPc)
  const { preferFlats, toneNames, chordKeys } = chordToneData(chord)
  const scaleKeys = new Set(activeScale.intervals.map((i) => chord.root + i))
  const scaleNames = scaleNoteNames(chord.root, activeScale, preferFlats)
  const instrument = view === 'ukulele' ? 'ukulele' : 'guitar'
  const shapes = instrument === 'ukulele' ? ukuleleShapes(chord) : guitarShapes(chord)

  const viewBar = (
    <div className="chords-view" role="group" aria-label="Show">
      {VIEW_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="chords-view-btn"
          aria-pressed={view === opt.value}
          onClick={() => handleViewChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )

  return (
    <Popover
      id="chords"
      className="chords"
      active={!following}
      open={open}
      onOpenChange={onOpenChange}
      label={
        <>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
            <path d="M6 2.5v11M10 2.5v11M4.5 2.5v6.5M8.5 2.5v6.5" />
          </svg>
          Chords
        </>
      }
    >
      {() => (
        <div className="chords-panel" aria-label="Chord helper">
          <div className="chords-view chords-scope" role="group" aria-label="Scope">
            <button
              type="button"
              className="chords-view-btn"
              aria-pressed={scope === 'chord'}
              onClick={() => handleScopeChange('chord')}
            >
              This chord
            </button>
            <button
              type="button"
              className="chords-view-btn"
              aria-pressed={scope === 'tune'}
              onClick={() => handleScopeChange('tune')}
            >
              This tune
            </button>
          </div>

          {scope === 'tune' ? (
            <>
              {viewBar}
              <ChordHelperTune chords={tuneChords} keyPc={keyPc} view={view} onPickChord={handlePickChord} />
            </>
          ) : (
            <>
              <div className="chords-head">
                <div className="chords-title-group">
                  <h2 className="chords-name">{label}</h2>
                  <span className="chords-tones">{toneNames.join(' ')}</span>
                  <button
                    type="button"
                    className="chords-hear"
                    aria-label="Hear chord"
                    disabled={!canAudition}
                    onClick={() => onAudition(chord)}
                  >
                    <span aria-hidden="true">▶</span> Hear
                  </button>
                </div>
                <label className="check chords-follow">
                  <input
                    type="checkbox"
                    checked={following}
                    onChange={(e) => onFollowChange(e.target.checked)}
                  />
                  Follow playing chord
                </label>
              </div>

              {viewBar}

              {(view === 'both' || view === 'keyboard') && (
                <PianoKeyboard label={label} toneNames={toneNames} chordKeys={chordKeys} scaleKeys={scaleKeys} />
              )}

              {(view === 'both' || view === 'guitar' || view === 'ukulele') && (
                <div className="chords-guitars">
                  <FretDiagram instrument={instrument} label={label} shape={shapes[0]} position={1} />
                  <FretDiagram instrument={instrument} label={label} shape={shapes[1]} position={2} />
                </div>
              )}

              <ChordHelperScales
                scales={scales}
                activeScaleId={activeScale.id}
                scaleNames={scaleNames}
                canAudition={canAudition}
                onSelectScale={(scaleId) => setPicked({ chordKey: key, scaleId })}
                onAuditionScale={(intervals) => onAudition(chord, intervals)}
              />
            </>
          )}
        </div>
      )}
    </Popover>
  )
}
