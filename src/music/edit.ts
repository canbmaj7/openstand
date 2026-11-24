// Chart edits used by the editor. Every function returns a new chart.

import { beatsPerBar, evenSplit, isCompound, type Chart, type ChartBar, type TimeSignature } from './chart'
import { groupsFor, isValidGroups, sameGroups } from './meter'

export function emptyChart(): Chart {
  return {
    format: 'openstand-chart',
    version: 1,
    title: 'Untitled',
    style: 'medium-swing',
    key: 0,
    bpm: 120,
    time: [4, 4],
    bars: Array.from({ length: 8 }, (_, i): ChartBar => ({ chords: [], cells: 4, barline: i === 7 ? 'final' : undefined })),
  }
}

// Time signature in force at a bar
export function timeAt(chart: Chart, index: number): TimeSignature {
  let time = chart.time
  for (let i = 0; i <= index && i < chart.bars.length; i++) time = chart.bars[i].time ?? time
  return time
}

function rawGroupsAt(chart: Chart, index: number): number[] | undefined {
  let raw = chart.groups
  for (let i = 0; i <= index && i < chart.bars.length; i++) {
    const bar = chart.bars[i]
    if (bar.time) raw = bar.groups
    else if (bar.groups !== undefined) raw = bar.groups
  }
  return raw
}

// Effective eighth-note beat grouping in force at a bar, or undefined when simple/compound
export function groupsAt(chart: Chart, index: number): number[] | undefined {
  return groupsFor(timeAt(chart, index), rawGroupsAt(chart, index))
}

// Drops keys set to undefined/false so saved charts stay small
function tidy(bar: ChartBar): ChartBar {
  const out = { ...bar } as Record<string, unknown>
  for (const k of Object.keys(out)) if (out[k] === undefined || out[k] === false || out[k] === '') delete out[k]
  return out as unknown as ChartBar
}

export function updateBar(chart: Chart, index: number, patch: Partial<ChartBar>): Chart {
  const bars = chart.bars.map((b, i) => (i === index ? tidy({ ...b, ...patch }) : b))
  return { ...chart, bars }
}

// A new bar after `index`; the closing barline of the tune moves to the new last bar
export function insertBar(chart: Chart, index: number): Chart {
  const bars = chart.bars.slice()
  const at = Math.min(index + 1, bars.length)
  const isLast = at === bars.length
  const bar: ChartBar = { chords: [], cells: bars[index]?.cells ?? 4 }
  if (isLast && bars.length && bars[bars.length - 1].barline === 'final') {
    bars[bars.length - 1] = tidy({ ...bars[bars.length - 1], barline: undefined })
    bar.barline = 'final'
  }
  bars.splice(at, 0, bar)
  return { ...chart, bars }
}

export function deleteBar(chart: Chart, index: number): Chart {
  if (chart.bars.length <= 1) return chart
  const removed = chart.bars[index]
  const bars = chart.bars.filter((_, i) => i !== index)
  // Keep the tune's final barline
  if (removed.barline === 'final' && index === chart.bars.length - 1) {
    bars[bars.length - 1] = { ...bars[bars.length - 1], barline: 'final' }
  }
  return { ...chart, bars }
}

const sameTime = (a: TimeSignature, b: TimeSignature) => a[0] === b[0] && a[1] === b[1]

function respreadBar(bar: ChartBar, time: TimeSignature): ChartBar {
  const beats = beatsPerBar(time)
  const total = bar.chords.reduce((a, c) => a + c.beats, 0)
  if (total === beats || bar.chords.length === 0) return bar
  const split = evenSplit(bar.chords.length, time)
  return { ...bar, chords: bar.chords.map((c, j) => ({ ...c, beats: split[j] })) }
}

function effectiveTimes(chart: Chart): TimeSignature[] {
  let time = chart.time
  return chart.bars.map((bar) => {
    if (bar.time) time = bar.time
    return time
  })
}

function withoutChartGroups(chart: Chart): Chart {
  const { groups: _, ...rest } = chart
  return rest
}

// After a meter change, chord lengths are spread over the new bar length and incompatible groups are cleared
export function setTime(chart: Chart, time: TimeSignature): Chart {
  const bars = chart.bars.map((bar, i) => {
    if (i > 0 && underTimeChange(chart, i)) return bar
    let next = respreadBar(bar, time)
    if (next.groups !== undefined && !isValidGroups(time, next.groups)) {
      next = tidy({ ...next, groups: undefined })
    }
    return next
  })
  const base = chart.groups !== undefined && !isValidGroups(time, chart.groups) ? withoutChartGroups(chart) : chart
  return { ...base, time, bars }
}

/** Set or clear (undefined) the chart-level eighth-note grouping. */
export function setGroups(chart: Chart, groups: number[] | undefined): Chart {
  const bars =
    chart.bars[0] && !chart.bars[0].time && chart.bars[0].groups !== undefined
      ? chart.bars.map((b, i) => (i === 0 ? tidy({ ...b, groups: undefined }) : b))
      : chart.bars
  if (groups === undefined || !isValidGroups(chart.time, groups)) {
    return { ...withoutChartGroups(chart), bars }
  }
  return { ...chart, groups: [...groups], bars }
}

/** Change the time signature at `index` (for just that bar or from there on), respreading affected chords. */
export function setBarTime(chart: Chart, index: number, time: TimeSignature | null, onlyThisBar: boolean): Chart {
  if (index < 0 || index >= chart.bars.length) return chart

  const oldTimes = effectiveTimes(chart)
  const prevMeter = index === 0 ? chart.time : oldTimes[index - 1]
  const prevRawGroups = index === 0 ? chart.groups : rawGroupsAt(chart, index - 1)
  let nextChartTime = chart.time
  let nextChartGroups = chart.groups
  const bars = chart.bars.map((b) => ({ ...b }))

  if (time === null) {
    bars[index] = tidy({ ...bars[index], time: undefined, groups: undefined })
  } else {
    if (index === 0) {
      nextChartTime = time
      if (nextChartGroups !== undefined && !isValidGroups(time, nextChartGroups)) nextChartGroups = undefined
      bars[0] = tidy({ ...bars[0], time: undefined, groups: undefined })
    } else {
      const keepGroups = bars[index].groups !== undefined && isValidGroups(time, bars[index].groups)
      bars[index] = tidy({ ...bars[index], time, groups: keepGroups ? bars[index].groups : undefined })
    }
    if (onlyThisBar && index + 1 < bars.length && !bars[index + 1].time) {
      const restoreGroups =
        prevRawGroups !== undefined && isValidGroups(prevMeter, prevRawGroups) ? [...prevRawGroups] : undefined
      bars[index + 1] = tidy({ ...bars[index + 1], time: prevMeter, groups: restoreGroups })
    }
  }

  let running = nextChartTime
  let runningRawGroups = nextChartGroups
  const cleanedBars = bars.map((bar, i) => {
    let nextBar = bar
    if (nextBar.time) {
      const keepsCompoundReset =
        sameTime(nextBar.time, running) && isCompound(running) && runningRawGroups !== undefined && nextBar.groups === undefined
      if (sameTime(nextBar.time, running) && !keepsCompoundReset) {
        nextBar = tidy({ ...nextBar, time: undefined })
        if (nextBar.groups !== undefined) runningRawGroups = nextBar.groups
      } else {
        running = nextBar.time
        runningRawGroups = nextBar.groups
      }
    } else if (nextBar.groups !== undefined) {
      runningRawGroups = nextBar.groups
    }
    if (nextBar.groups !== undefined && !isValidGroups(running, nextBar.groups)) {
      nextBar = tidy({ ...nextBar, groups: undefined })
    }
    if (!sameTime(oldTimes[i], running)) nextBar = respreadBar(nextBar, running)
    return nextBar
  })

  const base = nextChartGroups !== undefined ? { ...chart, groups: nextChartGroups } : withoutChartGroups(chart)
  return { ...base, time: nextChartTime, bars: cleanedBars }
}

/** Change the eighth-note grouping at `index` (for just that bar or from there on). */
export function setBarGroups(chart: Chart, index: number, groups: number[] | undefined, onlyThisBar: boolean): Chart {
  if (index < 0 || index >= chart.bars.length) return chart
  const current = timeAt(chart, index)
  if (groups !== undefined && !isValidGroups(current, groups)) return chart

  if (index === 0) {
    const prevRaw = rawGroupsAt(chart, 0)
    const next = setGroups(chart, groups)
    if (onlyThisBar && next.bars.length > 1 && !next.bars[1].time && next.bars[1].groups === undefined) {
      const bars = next.bars.slice()
      if (prevRaw !== undefined && !sameGroups(prevRaw, groups)) {
        bars[1] = { ...bars[1], groups: [...prevRaw] }
      } else if (prevRaw === undefined && groups !== undefined) {
        if (isCompound(next.time)) bars[1] = { ...bars[1], time: next.time }
        else {
          const def = groupsFor(next.time)
          if (def && !sameGroups(def, groups)) bars[1] = { ...bars[1], groups: def }
        }
      }
      return { ...next, bars }
    }
    return next
  }

  const prevRaw = rawGroupsAt(chart, index - 1)
  const bars = chart.bars.map((b) => ({ ...b }))
  if (groups === undefined) {
    bars[index] = tidy({ ...bars[index], groups: undefined })
    if (prevRaw !== undefined && isCompound(current) && !bars[index].time) {
      bars[index] = { ...bars[index], time: current }
    }
  } else {
    bars[index] = tidy({ ...bars[index], groups: [...groups] })
  }

  if (onlyThisBar && index + 1 < bars.length && !bars[index + 1].time && bars[index + 1].groups === undefined) {
    if (prevRaw !== undefined) {
      bars[index + 1] = { ...bars[index + 1], groups: [...prevRaw] }
    } else if (isCompound(current)) {
      bars[index + 1] = { ...bars[index + 1], time: current }
    } else {
      const def = groupsFor(current)
      if (def && !sameGroups(def, groups)) bars[index + 1] = { ...bars[index + 1], groups: def }
    }
  }

  return { ...chart, bars }
}

// Whether a bar falls under a later time signature change rather than the chart's own
function underTimeChange(chart: Chart, index: number): boolean {
  for (let i = 1; i <= index; i++) if (chart.bars[i].time) return true
  return false
}
