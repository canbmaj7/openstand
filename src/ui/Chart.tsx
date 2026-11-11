import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { ROW_CELLS, type Chart as ChartData, type ChartBar, type TimeSignature } from '../music/chart'
import { keyPrefersFlats, noteName, parseChord, transposeChord, type Chord } from '../music/chords'
import type { StyleDefinition } from '../styles/types'
import { ChordSymbol } from './ChordSymbol'

// SMuFL glyphs from Petaluma Text
const GLYPH = { repeatLeft: '', repeatRight: '', segno: '', coda: '', fermata: '' }

interface ChartProps {
  chart: ChartData
  style: StyleDefinition
  transpose: number
  activeMeasure: number | null
  beatInBar: number
  barBeats: number
  range?: [number, number] | null // looped bars
  selectedBar?: number | null // the bar being edited
  plain?: boolean
  onBarClick?: (index: number) => void
  onChordClick?: (chord: Chord) => void
  header?: ReactNode // replaces the title block, e.g. with inputs in the editor
}

interface PlacedBar {
  index: number
  bar: ChartBar
  column: number
  chords: { chord: Chord | null; symbol: string | null; beats: number }[]
  closesRow: boolean
}

const prettyKey = (name: string) => name.replace('b', '♭').replace('#', '♯')

function rows(chart: ChartData, transpose: number): PlacedBar[][] {
  const out: PlacedBar[][] = []
  let row: PlacedBar[] = []
  let column = 0
  // Charts without row information get four bars to a row
  const hasRows = chart.bars.some((b) => b.rowStart)
  chart.bars.forEach((bar, index) => {
    const startsRow = hasRows ? Boolean(bar.rowStart) : index % 4 === 0
    if (row.length && (startsRow || column + bar.cells > ROW_CELLS)) {
      out.push(row)
      row = []
      column = 0
    }
    const chords = bar.chords.map(({ symbol, beats }) => {
      const parsed = symbol ? parseChord(symbol) : null
      return { symbol, beats, chord: parsed ? transposeChord(parsed, transpose) : null }
    })
    row.push({ index, bar, column, chords, closesRow: false })
    column += bar.cells
  })
  if (row.length) out.push(row)
  for (const r of out) r[r.length - 1].closesRow = true
  return out
}

function TimeSig({ time }: { time: TimeSignature }) {
  return (
    <span className="timesig" aria-label={`${time[0]}/${time[1]} time`}>
      <span>{time[0]}</span>
      <span>{time[1]}</span>
    </span>
  )
}

interface BarProps {
  placed: PlacedBar
  prev: PlacedBar | undefined
  keyPc: number
  active: boolean
  progress: number
  showTime: TimeSignature | null
  inRange: boolean
  selected: boolean
  plain?: boolean
  onClick?: (index: number) => void
  onChordClick?: (chord: Chord) => void
}

function Bar({ placed, prev, keyPc, active, progress, showTime, inRange, selected, plain, onClick, onChordClick }: BarProps) {
  const { bar, chords, column, closesRow, index } = placed
  const classes = ['bar']
  if (bar.spacer) classes.push('bar-spacer')
  // The previous bar already drew a special closing barline on this edge
  if (bar.repeatStart) classes.push('bar-repeat-start')
  else if (prev && (prev.bar.barline || prev.bar.repeatEnd)) classes.push('bar-no-left')
  if (bar.repeatEnd) classes.push('bar-repeat-end')
  else if (bar.barline) classes.push(`bar-${bar.barline}`)
  else if (closesRow && !bar.spacer) classes.push('bar-close')
  if (showTime) classes.push('bar-with-time')
  if (chords.length > 2) classes.push('bar-dense')
  else if (chords.length === 2 && bar.cells <= 4) classes.push('bar-pair')
  if (inRange) classes.push('bar-in-range')
  if (selected) classes.push('bar-selected')
  if (onClick && !bar.spacer) classes.push('bar-clickable')
  const interactive = onClick && !bar.spacer

  const style: CSSProperties = {
    gridColumn: `${column + 1} / span ${bar.cells}`,
    gridTemplateColumns: chords.map((c) => `${c.beats}fr`).join(' ') || '1fr',
  }

  const note = [bar.comment, bar.directive, bar.repeatTimes && bar.repeatTimes > 2 ? `${bar.repeatTimes}x` : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className={classes.join(' ')}
      style={style}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Bar ${index + 1}` : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={interactive ? () => onClick(index) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              onClick(index)
            }
          : undefined
      }
    >
      {bar.rowStart && !bar.spacer && <span className="bar-number">{index + 1}</span>}
      {bar.section && (
        <span className="mark-section">{bar.section === 'i' ? 'Intro' : bar.section === 'v' ? 'Verse' : bar.section}</span>
      )}
      {bar.ending && <span className="mark-ending">{bar.ending}.</span>}
      {(bar.segno || bar.coda) && (
        <span className="mark-sign" aria-label={bar.segno ? 'Segno' : 'Coda'}>
          {bar.segno ? GLYPH.segno : GLYPH.coda}
        </span>
      )}
      {bar.repeatStart && (
        <span className="glyph-repeat glyph-repeat-left" aria-hidden="true">
          {GLYPH.repeatLeft}
        </span>
      )}
      {bar.repeatEnd && (
        <span className="glyph-repeat glyph-repeat-right" aria-hidden="true">
          {GLYPH.repeatRight}
        </span>
      )}
      {showTime && <TimeSig time={showTime} />}
      {active && <span className="bar-highlight" style={{ transform: `scaleX(${progress})` }} />}
      {chords.map(({ chord, symbol }, j) =>
        chord ? (
          <ChordSymbol key={j} chord={chord} keyPc={keyPc} plain={plain} onSelect={onChordClick} />
        ) : symbol === null ? (
          <span key={j} className="chord chord-nc">
            N.C.
          </span>
        ) : (
          <span key={j} className="chord chord-unknown" title="Unrecognized chord">
            {symbol}
          </span>
        ),
      )}
      {bar.fermata && (
        <span className="mark-fermata" aria-label="Fermata">
          {GLYPH.fermata}
        </span>
      )}
      {note && <span className="mark-text">{note}</span>}
    </div>
  )
}

export function Chart(props: ChartProps) {
  const { chart, style, transpose, activeMeasure, beatInBar, barBeats, range, selectedBar, plain, onBarClick, onChordClick, header } = props
  const keyPc = (chart.key + transpose + 12) % 12
  const layout = useMemo(() => rows(chart, transpose), [chart, transpose])
  const keyName = prettyKey(noteName(keyPc, keyPrefersFlats(keyPc))) + (chart.minor ? '−' : '')

  return (
    <article className="sheet" aria-label={`${chart.title} chord chart`}>
      {header ?? (
        <header className="sheet-head">
          <span className="sheet-meta">({chart.sourceStyle ?? style.name})</span>
          <h1 className="sheet-title">{chart.title}</h1>
          <span className="sheet-meta sheet-meta-right">{chart.composer ?? `Key of ${keyName}`}</span>
        </header>
      )}

      <div className="rows">
        {layout.map((row, r) => (
          <div className="row" key={r}>
            {row.map((placed, b) => (
              <Bar
                key={placed.index}
                placed={placed}
                prev={row[b - 1]}
                keyPc={keyPc}
                active={activeMeasure === placed.index}
                progress={Math.min(1, beatInBar / barBeats)}
                showTime={placed.index === 0 ? chart.time : (placed.bar.time ?? null)}
                inRange={!!range && placed.index >= Math.min(...range) && placed.index <= Math.max(...range)}
                selected={selectedBar === placed.index}
                plain={plain}
                onClick={onBarClick}
                onChordClick={onChordClick}
              />
            ))}
          </div>
        ))}
      </div>
    </article>
  )
}
