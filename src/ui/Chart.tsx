import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { ROW_CELLS, type Chart as ChartData, type ChartBar, type TimeSignature } from '../music/chart'
import { keyPrefersFlats, noteName, parseChord, transposeChord, type Chord } from '../music/chords'
import { groupsAt } from '../music/edit'
import type { StyleDefinition } from '../styles/types'
import { ChordSymbol } from './ChordSymbol'

// SMuFL glyphs from Petaluma Text
const GLYPH = { repeatLeft: '', repeatRight: '', segno: '', coda: '', fermata: '' }

interface ChartProps {
  chart: ChartData
  style: StyleDefinition
  transpose: number
  activeMeasure: number | null
  activeSub?: boolean
  beatInBar: number
  barBeats: number
  range?: [number, number] | null // looped bars
  selectedBar?: number | null // the bar being edited
  selectedRange?: [number, number] | null // contiguous selected bars in the editor
  plain?: boolean
  startAt?: string | null
  onBarClick?: (index: number, shiftKey?: boolean) => void
  onChordClick?: (chord: Chord, barIndex: number, chordIndex: number) => void
  header?: ReactNode // replaces the title block, e.g. with inputs in the editor
}

interface PlacedBar {
  index: number
  bar: ChartBar
  column: number
  chords: { chord: Chord | null; altChord: Chord | null; symbol: string | null; beats: number }[]
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
    const chords = bar.chords.map(({ symbol, alt, beats }) => {
      const parsed = symbol ? parseChord(symbol) : null
      const parsedAlt = alt ? parseChord(alt) : null
      return {
        symbol,
        beats,
        chord: parsed ? transposeChord(parsed, transpose) : null,
        altChord: parsedAlt ? transposeChord(parsedAlt, transpose) : null,
      }
    })
    row.push({ index, bar, column, chords, closesRow: false })
    column += bar.cells
  })
  if (row.length) out.push(row)
  for (const r of out) r[r.length - 1].closesRow = true
  return out
}

function TimeSig({ time, groups }: { time: TimeSignature; groups?: number[] }) {
  const label = groups ? `${time[0]}/${time[1]} time, ${groups.join('+')}` : `${time[0]}/${time[1]} time`
  return (
    <span className="timesig" aria-label={label}>
      <span>{time[0]}</span>
      <span>{time[1]}</span>
      {groups && <span className="timesig-groups">{groups.join('+')}</span>}
    </span>
  )
}

interface BarProps {
  placed: PlacedBar
  prev: PlacedBar | undefined
  keyPc: number
  active: boolean
  activeSub: boolean
  beatInBar: number
  progress: number
  showTime: TimeSignature | null
  showGroups?: number[]
  inRange: boolean
  selected: boolean
  inSelection: boolean
  plain?: boolean
  startChordIndex?: number | null
  onClick?: (index: number, shiftKey?: boolean) => void
  onChordClick?: (chord: Chord, barIndex: number, chordIndex: number) => void
  barRef?: (el: HTMLDivElement | null) => void
}

function Bar({
  placed,
  prev,
  keyPc,
  active,
  activeSub,
  beatInBar,
  progress,
  showTime,
  showGroups,
  inRange,
  selected,
  inSelection,
  plain,
  startChordIndex,
  onClick,
  onChordClick,
  barRef,
}: BarProps) {
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
  if (showTime && showGroups) classes.push('bar-with-groups')
  if (chords.length > 2) classes.push('bar-dense')
  else if (chords.length === 2 && bar.cells <= 4) classes.push('bar-pair')
  if (inRange) classes.push('bar-in-range')
  if (inSelection) classes.push('bar-selected-range')
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

  let activeChordIdx = -1
  if (active && chords.length > 0) {
    let at = 0
    for (let k = 0; k < chords.length; k++) {
      at += chords[k].beats
      if (beatInBar < at || k === chords.length - 1) {
        activeChordIdx = k
        break
      }
    }
  }

  return (
    <div
      ref={barRef}
      data-measure={index}
      className={classes.join(' ')}
      style={style}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Bar ${index + 1}` : undefined}
      aria-pressed={interactive ? selected || inSelection : undefined}
      onClick={interactive ? (e) => onClick(index, e.shiftKey) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              onClick(index, e.shiftKey)
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
      {showTime && <TimeSig time={showTime} groups={showGroups} />}
      {active && <span className="bar-highlight" style={{ transform: `scaleX(${progress})` }} />}
      {chords.map(({ chord, altChord, symbol }, j) =>
        chord ? (
          <ChordSymbol
            key={j}
            chord={chord}
            alt={altChord}
            subActive={Boolean(active && activeSub && activeChordIdx === j && altChord)}
            keyPc={keyPc}
            plain={plain}
            isStart={startChordIndex === j}
            onSelect={onChordClick ? (selected) => onChordClick(selected, index, j) : undefined}
          />
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

function findScrollContainer(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent)
    if (overflowY === 'auto' || overflowY === 'scroll') return parent
    parent = parent.parentElement
  }
  return null
}

export function Chart(props: ChartProps) {
  const { chart, style, transpose, activeMeasure, activeSub = false, beatInBar, barBeats, range, selectedBar, selectedRange, plain, startAt, onBarClick, onChordClick, header } = props
  const keyPc = (chart.key + transpose + 12) % 12
  const layout = useMemo(() => rows(chart, transpose), [chart, transpose])
  const keyName = prettyKey(noteName(keyPc, keyPrefersFlats(keyPc))) + (chart.minor ? '−' : '')
  const [startBar, startChord] = startAt ? startAt.split(':').map(Number) : [-1, -1]

  const activeBarRef = useRef<HTMLDivElement | null>(null)
  const lastUserScrollRef = useRef(0)

  useEffect(() => {
    const onUserScroll = () => {
      lastUserScrollRef.current = Date.now()
    }
    window.addEventListener('wheel', onUserScroll, { passive: true })
    window.addEventListener('touchmove', onUserScroll, { passive: true })
    return () => {
      window.removeEventListener('wheel', onUserScroll)
      window.removeEventListener('touchmove', onUserScroll)
    }
  }, [])

  useEffect(() => {
    if (activeMeasure === null) return
    if (typeof window !== 'undefined' && window.matchMedia('print').matches) return
    if (Date.now() - lastUserScrollRef.current < 4000) return

    const barEl = activeBarRef.current
    if (!barEl) return

    const container = findScrollContainer(barEl)
    const containerRect = container
      ? container.getBoundingClientRect()
      : { top: 0, bottom: window.innerHeight }

    const topBar = document.querySelector('.topbar')
    const transport = document.querySelector('.transport')
    const topBarBottom = topBar ? topBar.getBoundingClientRect().bottom : 0
    const transportTop = transport ? transport.getBoundingClientRect().top : window.innerHeight

    const visibleTop = Math.max(containerRect.top, topBarBottom, 0)
    const visibleBottom = Math.min(containerRect.bottom, transportTop, window.innerHeight)

    const barRect = barEl.getBoundingClientRect()
    const computed = window.getComputedStyle(barEl)
    const marginTop = parseFloat(computed.scrollMarginTop) || 0
    const marginBottom = parseFloat(computed.scrollMarginBottom) || 0

    const fitsWithMargins = visibleBottom - visibleTop >= barRect.height + marginTop + marginBottom
    const isFullyVisible = fitsWithMargins
      ? barRect.top - marginTop >= visibleTop - 1 && barRect.bottom + marginBottom <= visibleBottom + 1
      : barRect.top >= visibleTop - 1 && barRect.bottom <= visibleBottom + 1

    if (isFullyVisible || (!fitsWithMargins && barRect.top >= visibleTop - 1 && barRect.top <= visibleTop + 10)) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior: ScrollBehavior = prefersReduced ? 'auto' : 'smooth'

    barEl.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior,
    })
  }, [activeMeasure])

  return (
    <article className="sheet" aria-label={`${chart.title} chord chart`}>
      {header ?? (
        <header className="sheet-head">
          <span className="sheet-meta">({style.id === chart.style && chart.sourceStyle ? chart.sourceStyle : style.name})</span>
          <h1 className="sheet-title">{chart.title}</h1>
          <span className="sheet-meta sheet-meta-right">{chart.composer ?? `Key of ${keyName}`}</span>
        </header>
      )}

      <div className="rows">
        {layout.map((row, r) => (
          <div className="row" key={r}>
            {row.map((placed, b) => {
              const showTime = placed.index === 0 ? chart.time : (placed.bar.time ?? null)
              return (
                <Bar
                  key={placed.index}
                  placed={placed}
                  prev={row[b - 1]}
                  keyPc={keyPc}
                  active={activeMeasure === placed.index}
                  activeSub={activeMeasure === placed.index && activeSub}
                  beatInBar={activeMeasure === placed.index ? beatInBar : 0}
                  barRef={activeMeasure === placed.index ? (el) => { activeBarRef.current = el } : undefined}
                  progress={Math.min(1, beatInBar / barBeats)}
                  showTime={showTime}
                  showGroups={showTime ? groupsAt(chart, placed.index) : undefined}
                  inRange={!!range && placed.index >= Math.min(...range) && placed.index <= Math.max(...range)}
                  selected={selectedBar === placed.index}
                  inSelection={!!selectedRange && placed.index >= Math.min(...selectedRange) && placed.index <= Math.max(...selectedRange)}
                  plain={plain}
                  startChordIndex={placed.index === startBar ? startChord : null}
                  onClick={onBarClick}
                  onChordClick={onChordClick}
                />
              )
            })}
          </div>
        ))}
      </div>
    </article>
  )
}
