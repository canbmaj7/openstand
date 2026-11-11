import { spellRoot, type Chord } from '../music/chords'
import { plainChordParts } from '../music/chordText'

// SMuFL chord-symbol glyphs (rendered with Petaluma Text), so symbols look hand-copied
const GLYPH = {
  minor: '',
  major7: '',
  halfDiminished: '',
  diminished: '',
  augmented: '',
  flat: '',
  sharp: '',
}

const accidental = (a: string) => (a === 'b' ? GLYPH.flat : GLYPH.sharp)

// Typeset quality markers the way they appear on hand-written charts
function typeset(suffix: string): { quality: string; extensions: string } {
  const s = suffix
    .replace(/^(min|mi|m)(?!aj)/, '-')
    .replace(/^maj7?/, '^7')
    .replace(/^dim/, 'o')
    .replace(/^aug/, '+')
  const match = /^([-^ho+])?(\d+)?(.*)$/.exec(s) ?? ['', '', '', s]
  const markers: Record<string, string> = {
    '-': GLYPH.minor,
    '^': GLYPH.major7,
    h: GLYPH.halfDiminished,
    o: GLYPH.diminished,
    '+': GLYPH.augmented,
  }
  const marker = markers[match[1] ?? ''] ?? ''
  // A bare Δ already means major seventh
  const number = match[1] === '^' && match[2] === '7' ? '' : (match[2] ?? '')
  const extensions = (match[3] ?? '').replace(/[b#]/g, accidental)
  return { quality: marker + number, extensions }
}

export function ChordSymbol({
  chord,
  keyPc,
  plain = false,
  onSelect,
}: {
  chord: Chord
  keyPc: number
  plain?: boolean
  onSelect?: (chord: Chord) => void
}) {
  const name = spellRoot(chord.root, keyPc)

  if (plain) {
    const parts = plainChordParts(chord, keyPc)
    return (
      <span
        className={onSelect ? 'chord chord-interactive' : 'chord'}
        aria-label={`${name}${chord.suffix}`}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        data-opens={onSelect ? 'chords' : undefined}
        onClick={
          onSelect
            ? (e) => {
                e.stopPropagation()
                onSelect(chord)
              }
            : undefined
        }
        onKeyDown={
          onSelect
            ? (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                e.stopPropagation()
                onSelect(chord)
              }
            : undefined
        }
      >
        <span>{parts.root}</span>
        {parts.accidental && <span className="chord-accidental">{parts.accidental}</span>}
        {parts.quality && <span className="chord-quality">{parts.quality}</span>}
        {parts.extensions && <span className="chord-ext">{parts.extensions}</span>}
        {parts.bass && <span className="chord-bass">/{parts.bass}</span>}
      </span>
    )
  }

  const { quality, extensions } = typeset(chord.suffix)
  return (
    <span
      className={onSelect ? 'chord chord-interactive' : 'chord'}
      aria-label={`${name}${chord.suffix}`}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      data-opens={onSelect ? 'chords' : undefined}
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation()
              onSelect(chord)
            }
          : undefined
      }
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              e.stopPropagation()
              onSelect(chord)
            }
          : undefined
      }
    >
      <span>{name[0]}</span>
      {name[1] && <span className="chord-accidental">{accidental(name[1])}</span>}
      {quality && <span className="chord-quality">{quality}</span>}
      {extensions && <span className="chord-ext">{extensions}</span>}
      {chord.bass !== chord.root && (
        <span className="chord-bass">/{spellRoot(chord.bass, keyPc).replace(/[b#]/, accidental)}</span>
      )}
    </span>
  )
}
