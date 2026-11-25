import { useState } from 'react'
import { closeVoicingTones, keyPrefersFlats, noteName, spellRoot, type Chord } from '../music/chords'
import { guitarShapes, ukuleleShapes } from '../music/fretboard'
import { scaleNoteNames, scalesForChord } from '../music/scales'
import { FretDiagram, PianoKeyboard } from './ChordHelperDiagrams'
import { ChordHelperScales } from './ChordHelperScales'
import { Popover } from './Popover'
import './chordHelper.css'
import './chordHelperHear.css'

export type HelperView = 'both' | 'keyboard' | 'guitar' | 'ukulele'

const HELPER_VIEW_KEY = 'openstand:helper-view'

function isHelperView(value: unknown): value is HelperView {
  return value === 'both' || value === 'keyboard' || value === 'guitar' || value === 'ukulele'
}

function loadHelperView(): HelperView {
  try {
    if (typeof localStorage === 'undefined') return 'both'
    const saved = localStorage.getItem(HELPER_VIEW_KEY)
    return isHelperView(saved) ? saved : 'both'
  } catch {
    return 'both'
  }
}

function saveHelperView(view: HelperView): void {
  try {
    localStorage.setItem(HELPER_VIEW_KEY, view)
  } catch {
    // Storage may be disabled in private browsing
  }
}

interface ChordHelperProps {
  chord: Chord
  keyPc: number
  following: boolean
  onFollowChange: (follow: boolean) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  canAudition: boolean
  onAudition: (chord: Chord, scale?: number[]) => void
}

export function ChordHelper({
  chord,
  keyPc,
  following,
  onFollowChange,
  open,
  onOpenChange,
  canAudition,
  onAudition,
}: ChordHelperProps) {
  const chordKey = `${chord.root}:${chord.bass}:${chord.quality}:${chord.tensions.join(',')}`
  const [picked, setPicked] = useState<{ chordKey: string; scaleId: string } | null>(null)
  const [view, setView] = useState<HelperView>(loadHelperView)

  const handleViewChange = (next: HelperView) => {
    setView(next)
    saveHelperView(next)
  }

  const scales = scalesForChord(chord)
  const activeScale = (picked?.chordKey === chordKey && scales.find((s) => s.id === picked.scaleId)) || scales[0]

  const rootName = spellRoot(chord.root, keyPc)
  const bassPart = chord.bass !== chord.root ? `/${spellRoot(chord.bass, keyPc)}` : ''
  const label = `${rootName}${chord.suffix}${bassPart}`

  const preferFlats = keyPrefersFlats(chord.root)
  const tones = closeVoicingTones(chord)
  const toneNames = tones.map((t) => noteName((chord.root + t) % 12, preferFlats))
  const chordKeys = new Set(tones.map((t) => chord.root + t))
  const scaleKeys = new Set(activeScale.intervals.map((i) => chord.root + i))
  const scaleNames = scaleNoteNames(chord.root, activeScale, preferFlats)
  const instrument = view === 'ukulele' ? 'ukulele' : 'guitar'
  const shapes = instrument === 'ukulele' ? ukuleleShapes(chord) : guitarShapes(chord)

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

          <div className="chords-view" role="group" aria-label="Show">
            <button
              type="button"
              className="chords-view-btn"
              aria-pressed={view === 'both'}
              onClick={() => handleViewChange('both')}
            >
              Both
            </button>
            <button
              type="button"
              className="chords-view-btn"
              aria-pressed={view === 'keyboard'}
              onClick={() => handleViewChange('keyboard')}
            >
              Keyboard
            </button>
            <button
              type="button"
              className="chords-view-btn"
              aria-pressed={view === 'guitar'}
              onClick={() => handleViewChange('guitar')}
            >
              Guitar
            </button>
            <button
              type="button"
              className="chords-view-btn"
              aria-pressed={view === 'ukulele'}
              onClick={() => handleViewChange('ukulele')}
            >
              Ukulele
            </button>
          </div>

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
            onSelectScale={(scaleId) => setPicked({ chordKey, scaleId })}
            onAuditionScale={(intervals) => onAudition(chord, intervals)}
          />
        </div>
      )}
    </Popover>
  )
}
