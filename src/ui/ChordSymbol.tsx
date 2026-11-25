import type { Chord } from '../music/chords'
import { plainChordParts } from '../music/chordText'
import { formatChordRoot, type ChordNames, type RootParts } from '../music/degrees'

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
  // Co^7 and C+^7 carry their major seventh after the marker
  const extensions = (match[3] ?? '').replace(/\^7?/g, GLYPH.major7).replace(/[b#]/g, accidental)
  return { quality: marker + number, extensions }
}

function formatBassHandwritten(parts: RootParts): string {
  const acc = parts.accidental ? accidental(parts.accidental) : ''
  return parts.accidentalBefore ? `${acc}${parts.root}` : `${parts.root}${acc}`
}

function chordAriaLabel(
  chord: Chord,
  keyPc: number,
  minor: boolean,
  chordNames: ChordNames,
  includeBass: boolean,
): string {
  const rootParts = formatChordRoot(chord.root, keyPc, minor, chordNames)
  const rootText = rootParts.accidentalBefore
    ? `${rootParts.accidental}${rootParts.root}`
    : `${rootParts.root}${rootParts.accidental}`
  const bassParts = includeBass && chord.bass !== chord.root ? formatChordRoot(chord.bass, keyPc, minor, chordNames) : null
  const bassText = bassParts
    ? `/${bassParts.accidentalBefore ? `${bassParts.accidental}${bassParts.root}` : `${bassParts.root}${bassParts.accidental}`}`
    : ''
  return `${rootText}${chord.suffix}${bassText}`
}

function ChordBody({
  chord,
  keyPc,
  minor,
  plain,
  chordNames,
}: {
  chord: Chord
  keyPc: number
  minor: boolean
  plain: boolean
  chordNames: ChordNames
}) {
  const accidentalBefore = chordNames !== 'letters'
  if (plain) {
    const parts = plainChordParts(chord, keyPc, chordNames, minor)
    return (
      <>
        {accidentalBefore && parts.accidental && <span className="chord-accidental">{parts.accidental}</span>}
        <span>{parts.root}</span>
        {!accidentalBefore && parts.accidental && <span className="chord-accidental">{parts.accidental}</span>}
        {parts.quality && <span className="chord-quality">{parts.quality}</span>}
        {parts.extensions && <span className="chord-ext">{parts.extensions}</span>}
        {parts.bass && <span className="chord-bass">/{parts.bass}</span>}
      </>
    )
  }
  const rootParts = formatChordRoot(chord.root, keyPc, minor, chordNames)
  const { quality, extensions } = typeset(chord.suffix)
  const bassParts = chord.bass !== chord.root ? formatChordRoot(chord.bass, keyPc, minor, chordNames) : null
  return (
    <>
      {accidentalBefore && rootParts.accidental && (
        <span className="chord-accidental">{accidental(rootParts.accidental)}</span>
      )}
      <span>{rootParts.root}</span>
      {!accidentalBefore && rootParts.accidental && (
        <span className="chord-accidental">{accidental(rootParts.accidental)}</span>
      )}
      {quality && <span className="chord-quality">{quality}</span>}
      {extensions && <span className="chord-ext">{extensions}</span>}
      {bassParts && <span className="chord-bass">/{formatBassHandwritten(bassParts)}</span>}
    </>
  )
}

export function ChordSymbol({
  chord,
  alt,
  subActive = false,
  keyPc,
  minor = false,
  plain = false,
  chordNames = 'letters',
  isStart = false,
  onSelect,
}: {
  chord: Chord
  alt?: Chord | null
  subActive?: boolean
  keyPc: number
  minor?: boolean
  plain?: boolean
  chordNames?: ChordNames
  isStart?: boolean
  onSelect?: (chord: Chord) => void
}) {
  const baseLabel = chordAriaLabel(chord, keyPc, minor, chordNames, chordNames !== 'letters')
  const altLabel = alt ? chordAriaLabel(alt, keyPc, minor, chordNames, true) : ''
  const label = [baseLabel, altLabel && `or ${altLabel}`, isStart && 'start point'].filter(Boolean).join(', ')

  return (
    <span
      className={[onSelect ? 'chord chord-interactive' : 'chord', isStart && 'chord-start', subActive && 'chord-sub-active']
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
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
      {alt && (
        <span className="chord-alt" aria-hidden="true">
          <ChordBody chord={alt} keyPc={keyPc} minor={minor} plain={plain} chordNames={chordNames} />
        </span>
      )}
      <span className="chord-main">
        <ChordBody chord={chord} keyPc={keyPc} minor={minor} plain={plain} chordNames={chordNames} />
      </span>
    </span>
  )
}
