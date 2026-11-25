import type { FretShape } from '../music/fretboard'

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11] as const
const BLACK_PCS = [
  { pc: 1, after: 0 },
  { pc: 3, after: 1 },
  { pc: 6, after: 3 },
  { pc: 8, after: 4 },
  { pc: 10, after: 5 },
] as const

export function PianoKeyboard({
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

export function FretDiagram({
  instrument,
  label,
  shape,
  position,
}: {
  instrument: 'guitar' | 'ukulele'
  label: string
  shape: FretShape
  position: number
}) {
  const strings = shape.frets.length
  const step = 14
  const left = 26 + ((6 - strings) * step) / 2
  const right = left + (strings - 1) * step
  const bassString = instrument === 'guitar' ? shape.frets.findIndex((f) => f !== null) : -1
  const fretsLabel = shape.frets.map((f) => f ?? 'x').join(' ')

  return (
    <svg
      className="chords-guitar"
      viewBox="0 0 116 108"
      role="img"
      aria-label={`${label} on ${instrument}, position ${position}: ${fretsLabel}`}
    >
      {shape.baseFret > 1 && (
        <text x={left - 6} y={33} textAnchor="end" className="guitar-fret-num">
          {shape.baseFret}fr
        </text>
      )}
      {[1, 2, 3, 4].map((row) => (
        <line key={row} x1={left} y1={18 + row * 20} x2={right} y2={18 + row * 20} className="guitar-grid" />
      ))}
      <line x1={left} y1={18} x2={right} y2={18} className={shape.baseFret === 1 ? 'guitar-nut' : 'guitar-top'} />
      {shape.frets.map((fret, s) => {
        const x = left + s * step
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
