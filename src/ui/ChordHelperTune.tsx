import { useMemo } from 'react'
import { chordKey, chordSpellLabel, chordToneData, type Chord } from '../music/chords'
import { guitarShapes, ukuleleShapes } from '../music/fretboard'
import type { HelperView } from './ChordHelper'
import { FretDiagram, PianoKeyboard } from './ChordHelperDiagrams'

const EMPTY_SCALE = new Set<number>()

interface ChordHelperTuneProps {
  chords: Chord[]
  keyPc: number
  view: HelperView
  onPickChord: (chord: Chord) => void
}

/** Grid of every distinct chord in the current tune with compact diagrams. */
export function ChordHelperTune({ chords, keyPc, view, onPickChord }: ChordHelperTuneProps) {
  const showKeyboard = view === 'keyboard'
  const instrument = view === 'ukulele' ? 'ukulele' : 'guitar'

  const items = useMemo(
    () =>
      chords.map((chord) => ({
        chord,
        key: chordKey(chord),
        label: chordSpellLabel(chord, keyPc),
        piano: showKeyboard ? chordToneData(chord) : null,
        shape: showKeyboard ? null : (instrument === 'ukulele' ? ukuleleShapes(chord) : guitarShapes(chord))[0],
      })),
    [chords, keyPc, showKeyboard, instrument],
  )

  if (items.length === 0) {
    return <p className="chords-tune-empty">No chords in this tune.</p>
  }

  return (
    <div
      className={showKeyboard ? 'chords-tune-grid chords-tune-grid-keyboard' : 'chords-tune-grid'}
      aria-label="Chords in this tune"
    >
      {items.map(({ chord, key, label, piano, shape }) => (
        <button
          key={key}
          type="button"
          className="chords-tune-cell"
          aria-label={label}
          onClick={() => onPickChord(chord)}
        >
          <span className="chords-tune-name">{label}</span>
          {piano ? (
            <PianoKeyboard
              label={label}
              toneNames={piano.toneNames}
              chordKeys={piano.chordKeys}
              scaleKeys={EMPTY_SCALE}
            />
          ) : (
            shape && <FretDiagram instrument={instrument} label={label} shape={shape} position={1} />
          )}
        </button>
      ))}
    </div>
  )
}
