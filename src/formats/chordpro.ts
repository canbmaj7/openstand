// ChordPro exporter: writes a chart as a ChordPro chord grid (.cho) for songbook apps.

import { beatsPerBar, ROW_CELLS, type Chart, type ChartBar, type TimeSignature } from '../music/chart'
import { keyPrefersFlats, noteName, parseChord, spellRoot, transposeChord } from '../music/chords'

function sectionLabel(section: string): string {
  if (section === 'i') return 'Intro'
  if (section === 'v') return 'Verse'
  return section
}

function chordProSuffix(suffix: string): string {
  const s = suffix.replace(/ø/g, 'h').replace(/Δ/g, '^').replace(/°/g, 'o')
  if (/^-\^/.test(s)) return s.replace(/^-\^(\d*)/, (_, n: string) => `mmaj${n || '7'}`)
  if (/^o\^/.test(s)) return s.replace(/^o\^(\d*)/, (_, n: string) => `dimmaj${n || '7'}`)
  if (/^\+\^/.test(s)) return s.replace(/^\+\^(\d*)/, (_, n: string) => `augmaj${n || '7'}`)
  if (/^h/.test(s)) return s.replace(/^h7?/, 'm7b5')
  if (/^o/.test(s)) return s.replace(/^o/, 'dim')
  if (/^\^/.test(s)) return s.replace(/^\^(\d*)/, (_, n: string) => `maj${n || '7'}`)
  if (/^-/.test(s)) return s.replace(/^-/, 'm')
  return s.replace(/^(min|mi)(?!aj)/, 'm')
}

function formatChord(symbol: string | null, keyPc: number, transpose: number): string {
  if (symbol === null || /^(n\.?c\.?|nc)$/i.test(symbol.trim())) return 'N.C.'
  const parsed = parseChord(symbol)
  if (!parsed) return 'N.C.'
  const transposed = transpose ? transposeChord(parsed, transpose) : parsed
  const root = spellRoot(transposed.root, keyPc)
  const suffix = chordProSuffix(transposed.suffix)
  const bass = transposed.bass !== transposed.root ? `/${spellRoot(transposed.bass, keyPc)}` : ''
  return `${root}${suffix}${bass}`
}

function barCells(
  bar: ChartBar,
  time: TimeSignature,
  keyPc: number,
  transpose: number,
  hasPrevChord: boolean,
): string[] {
  const barBeats = beatsPerBar(time)
  const total = Math.max(1, Math.round(barBeats))
  if (bar.chords.length === 0) {
    return [hasPrevChord ? '%' : 'N.C.', ...Array.from({ length: total - 1 }, () => '.')]
  }

  const allWhole = bar.chords.every((c) => Math.abs(c.beats - Math.round(c.beats)) < 1e-4 && c.beats >= 1)
  const wholeSum = bar.chords.reduce((sum, c) => sum + Math.round(c.beats), 0)
  if (allWhole && wholeSum === total) {
    const out: string[] = []
    for (const c of bar.chords) {
      const len = Math.max(1, Math.round(c.beats))
      out.push(formatChord(c.symbol, keyPc, transpose))
      for (let i = 1; i < len; i++) out.push('.')
    }
    return out
  }

  // Non-integer or custom subdivisions: place each chord at its nearest beat slot
  const width = Math.max(total, bar.chords.length)
  const out = Array.from({ length: width }, () => '.')
  let at = 0
  let cursor = 0
  for (const c of bar.chords) {
    let pos = Math.min(width - 1, Math.round((at / barBeats) * width))
    if (pos < cursor) pos = cursor
    out[pos] = formatChord(c.symbol, keyPc, transpose)
    cursor = pos + 1
    at += c.beats
  }
  return out
}

interface GridBar {
  bar: ChartBar
  cells: string[]
  isLast: boolean
}

function groupRows(chart: Chart, keyPc: number, transpose: number): GridBar[][] {
  const rows: GridBar[][] = []
  let row: GridBar[] = []
  let column = 0
  let time = chart.time
  let hasPrevChord = false
  const hasRows = chart.bars.some((b) => b.rowStart)

  const playable = chart.bars.filter((b) => !b.spacer)
  const lastPlayable = playable[playable.length - 1]

  chart.bars.forEach((bar, index) => {
    if (bar.time) time = bar.time
    const startsRow = hasRows ? Boolean(bar.rowStart) : index % 4 === 0
    if (row.length && (startsRow || column + bar.cells > ROW_CELLS)) {
      rows.push(row)
      row = []
      column = 0
    }
    if (!bar.spacer) {
      const cells = barCells(bar, time, keyPc, transpose, hasPrevChord)
      row.push({ bar, cells, isLast: bar === lastPlayable })
      if (bar.chords.length > 0) hasPrevChord = true
    }
    column += bar.cells
  })
  if (row.length) rows.push(row)
  return rows
}

function formatRow(row: GridBar[]): string {
  let line = row[0].bar.repeatStart ? '|:' : '|'
  for (let i = 0; i < row.length; i++) {
    const { bar, isLast, cells } = row[i]
    line += ` ${cells.join(' ')} `
    const next = row[i + 1]
    if (next) {
      if (bar.repeatEnd && next.bar.repeatStart) line += ':| |:'
      else if (bar.repeatEnd) line += ':|'
      else if (next.bar.repeatStart) line += '|:'
      else if (bar.barline === 'double' || bar.barline === 'final') line += '||'
      else line += '|'
    } else {
      if (bar.repeatEnd) line += ':|'
      else if (bar.barline === 'final' || bar.barline === 'double' || isLast) line += '||'
      else line += '|'
    }
  }
  return line
}

function rowNotes(row: GridBar[], includeSection: boolean): string[] {
  const notes: string[] = []
  for (const { bar } of row) {
    if (includeSection && bar.section) notes.push(sectionLabel(bar.section))
    if (bar.ending) notes.push(`${bar.ending}.`)
    if (bar.segno) notes.push('Segno')
    if (bar.coda) notes.push('Coda')
    if (bar.directive) notes.push(bar.directive)
    if (bar.comment) notes.push(bar.comment)
  }
  return notes
}

export function chartToChordPro(chart: Chart, transpose = 0): string {
  const keyPc = (((chart.key + transpose) % 12) + 12) % 12
  const keyName = noteName(keyPc, keyPrefersFlats(keyPc)) + (chart.minor ? 'm' : '')

  const lines: string[] = [`{title: ${chart.title}}`]
  if (chart.composer) lines.push(`{composer: ${chart.composer}}`)
  lines.push(`{key: ${keyName}}`, `{time: ${chart.time[0]}/${chart.time[1]}}`, `{tempo: ${chart.bpm}}`)

  const rows = groupRows(chart, keyPc, transpose)
  if (rows.length === 0) return lines.join('\n') + '\n'

  let gridOpen = false
  for (const row of rows) {
    const firstSection = row[0].bar.section
    if (!gridOpen) {
      lines.push('', firstSection ? `{start_of_grid: ${sectionLabel(firstSection)}}` : '{start_of_grid}')
      gridOpen = true
    } else if (firstSection) {
      lines.push('{end_of_grid}', '', `{start_of_grid: ${sectionLabel(firstSection)}}`)
    }

    const notes = rowNotes(row, false)
    const midSections = row.slice(1).flatMap((g) => (g.bar.section ? [sectionLabel(g.bar.section)] : []))
    const allNotes = [...midSections, ...notes]
    if (allNotes.length > 0) lines.push(`# ${allNotes.join(' · ')}`)
    lines.push(formatRow(row))
  }
  if (gridOpen) lines.push('{end_of_grid}')

  return lines.join('\n') + '\n'
}
