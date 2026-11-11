import { useState } from 'react'
import { closeVoicingTones, keyPrefersFlats, noteName, spellRoot, type Chord } from '../music/chords'
import { guitarShapes, type FretShape } from '../music/fretboard'
import { scaleNoteNames, scalesForChord } from '../music/scales'
import { Popover } from './Popover'
import './chordHelper.css'

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11] as const
const BLACK_PCS = [
  { pc: 1, after: 0 },
  { pc: 3, after: 1 },
  { pc: 6, after: 3 },
  { pc: 8, after: 4 },
  { pc: 10, after: 5 },
] as const

interface ChordHelperProps {
  chord: Chord
  keyPc: number
  following: boolean
  onFollowChange: (follow: boolean) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

function PianoKeyboard({
  label,
  toneNames,
  chordKeys,
  scaleKeys,
}: {
  label: string
  toneNames: string[]
  chordKeys: Set<number>
  scaleKeys: Set<number>
}) {
  const whites: { semi: number; x: number }[] = []
  const blacks: { semi: number; x: number }[] = []
  for (let oct = 0; oct < 2; oct++) {
    WHITE_PCS.forEach((pc, i) => whites.push({ semi: oct * 12 + pc, x: (oct * 7 + i) * 20 }))
    BLACK_PCS.forEach(({ pc, after }) => blacks.push({ semi: oct * 12 + pc, x: (oct * 7 + after + 1) * 20 - 6 }))
  }

  return (
    <svg className="chords-piano" viewBox="0 0 280 74" role="img" aria-label={`${label} on piano: ${toneNames.join(' ')}`}>
      {whites.map(({ semi, x }) => {
        const isChord = chordKeys.has(semi)
        const isScale = scaleKeys.has(semi)
        return (
          <g key={semi}>
            <rect x={x} y={0} width={20} height={74} className={isChord ? 'piano-white piano-chord' : 'piano-white'} />
            {isChord && <circle cx={x + 10} cy={58} r={5} className="piano-tone-mark" />}
            {isScale && <circle cx={x + 10} cy={58} r={2.2} className="piano-scale-dot" />}
          </g>
        )
      })}
      {blacks.map(({ semi, x }) => {
        const isChord = chordKeys.has(semi)
        const isScale = scaleKeys.has(semi)
        return (
          <g key={semi}>
            <rect x={x} y={0} width={12} height={45} rx={1.5} className="piano-black" />
            {isChord && <circle cx={x + 6} cy={33} r={4.4} className="piano-tone-mark-black" />}
            {isScale && (
              <circle
                cx={x + 6}
                cy={33}
                r={2}
                className={isChord ? 'piano-scale-dot-on-mark' : 'piano-scale-dot-black'}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

function GuitarDiagram({ label, shape, position }: { label: string; shape: FretShape; position: number }) {
  const bassString = shape.frets.findIndex((f) => f !== null)
  const fretsLabel = shape.frets.map((f) => f ?? 'x').join(' ')

  return (
    <svg
      className="chords-guitar"
      viewBox="0 0 116 108"
      role="img"
      aria-label={`${label} on guitar, position ${position}: ${fretsLabel}`}
    >
      {shape.baseFret > 1 && (
        <text x={20} y={33} textAnchor="end" className="guitar-fret-num">
          {shape.baseFret}fr
        </text>
      )}
      {[1, 2, 3, 4].map((row) => (
        <line key={row} x1={26} y1={18 + row * 20} x2={96} y2={18 + row * 20} className="guitar-grid" />
      ))}
      <line x1={26} y1={18} x2={96} y2={18} className={shape.baseFret === 1 ? 'guitar-nut' : 'guitar-top'} />
      {shape.frets.map((fret, s) => {
        const x = 26 + s * 14
        const row = fret !== null && fret > 0 ? fret - shape.baseFret : -1
        return (
          <g key={s}>
            <line x1={x} y1={18} x2={x} y2={98} className="guitar-string" />
            {fret === null && <path d={`M${x - 3} 6.5l6 6M${x + 3} 6.5l-6 6`} className="guitar-mute" />}
            {fret === 0 && <circle cx={x} cy={9.5} r={3.4} className="guitar-open" />}
            {row >= 0 && row < 4 && (
              <circle
                cx={x}
                cy={28 + row * 20}
                r={5.2}
                className={s === bassString ? 'guitar-dot guitar-dot-bass' : 'guitar-dot'}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function ChordHelper({ chord, keyPc, following, onFollowChange, open, onOpenChange }: ChordHelperProps) {
  const chordKey = `${chord.root}:${chord.bass}:${chord.quality}:${chord.tensions.join(',')}`
  const [picked, setPicked] = useState<{ chordKey: string; scaleId: string } | null>(null)

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
  const shapes = guitarShapes(chord)

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

          <PianoKeyboard label={label} toneNames={toneNames} chordKeys={chordKeys} scaleKeys={scaleKeys} />

          <div className="chords-guitars">
            <GuitarDiagram label={label} shape={shapes[0]} position={1} />
            <GuitarDiagram label={label} shape={shapes[1]} position={2} />
          </div>

          <div className="chords-scales">
            <div className="chords-scale-bar">
              <span className="label">Scales</span>
              <output className="chords-scale-notes" aria-label="Scale notes">
                {scaleNames.join(' ')}
              </output>
            </div>
            <div className="chords-scale-list">
              {scales.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="scale-item"
                  aria-pressed={s.id === activeScale.id}
                  onClick={() => setPicked({ chordKey, scaleId: s.id })}
                >
                  <span className="scale-head">
                    <span className="scale-name">{s.name}</span>
                    {s.firstChoice && <span className="scale-badge">First choice</span>}
                  </span>
                  <span className="scale-note">{s.note}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Popover>
  )
}
