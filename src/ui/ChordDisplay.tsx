import type { ChordFont } from '../music/chordText'
import type { ChordNames } from '../music/degrees'
import { Popover } from './Popover'

interface ChordDisplayProps {
  chordFont: ChordFont
  onChordFont: (font: ChordFont) => void
  chordNames: ChordNames
  onChordNames: (names: ChordNames) => void
}

const FONT_OPTIONS: readonly { value: ChordFont; label: string }[] = [
  { value: 'Handwritten', label: 'Handwritten' },
  { value: 'Plain', label: 'Plain' },
]

const NAME_OPTIONS: readonly { value: ChordNames; label: string }[] = [
  { value: 'letters', label: 'Letters' },
  { value: 'roman', label: 'Roman numerals' },
  { value: 'numbers', label: 'Numbers' },
]

export function ChordDisplay({ chordFont, onChordFont, chordNames, onChordNames }: ChordDisplayProps) {
  return (
    <Popover
      id="chord-display"
      className="share chord-display"
      label="Aa"
      ariaLabel="Chord names and font"
      title="Chord names and font"
    >
      {() => (
        <div className="chord-display-panel">
          <div className="chord-display-row">
            <span className="label" id="chord-font-label">
              Chord font
            </span>
            <div className="chord-display-options" role="group" aria-labelledby="chord-font-label">
              {FONT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="chip"
                  aria-pressed={chordFont === opt.value}
                  onClick={() => onChordFont(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="chord-display-row">
            <span className="label" id="chord-names-label">
              Chord names
            </span>
            <div className="chord-display-options" role="group" aria-labelledby="chord-names-label">
              {NAME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="chip"
                  aria-pressed={chordNames === opt.value}
                  onClick={() => onChordNames(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Popover>
  )
}
