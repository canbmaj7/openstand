// Writer for iReal Pro links (irealb://), so charts made in OpenStand open in iReal Pro too.
// The reverse of ireal.ts: bars become 16-cell rows of chords, blanks and barlines.

import { beatsPerBar, type BarChord, type Chart, type ChartBar, type TimeSignature } from '../music/chart'
import { keyPrefersFlats, noteName } from '../music/chords'
import { getStyle } from '../styles'
import { durations, MUSIC_PREFIX, swapBlocks } from './ireal'

interface WriteCell {
  symbol: string | null
  alt?: string
}

const sameBeats = (a: BarChord[], b: BarChord[]) =>
  a.length === b.length &&
  a.every((c, i) => c.symbol === b[i].symbol && c.alt === b[i].alt && Math.abs(c.beats - b[i].beats) < 1e-6)

// Chords placed in cells so the reader gets the same lengths back
function cellsFor(chords: BarChord[], width: number, time: TimeSignature): (WriteCell | undefined)[] {
  const barBeats = beatsPerBar(time)
  for (const n of [width, chords.length, barBeats, barBeats * 2, barBeats * 4]) {
    if (n < chords.length) continue
    const cells: (WriteCell | undefined)[] = Array.from({ length: n }, () => undefined)
    let at = 0
    let ok = true
    for (const c of chords) {
      const pos = Math.round((at / barBeats) * n)
      if (pos >= n || cells[pos] !== undefined) ok = false
      else cells[pos] = c.alt !== undefined ? { symbol: c.symbol, alt: c.alt } : { symbol: c.symbol }
      at += c.beats
    }
    const back = durations(
      cells.map((cell) => (cell ? { chord: cell.symbol, alt: cell.alt } : {})),
      time,
    )
    if (ok && sameBeats(back, chords)) return cells
  }
  // Fall back to an even spread; lengths may round
  return chords.map((c) => (c.alt !== undefined ? { symbol: c.symbol, alt: c.alt } : { symbol: c.symbol }))
}

const toIrealChord = (symbol: string) => symbol

const cellText = (cell: WriteCell | undefined) => {
  if (cell === undefined) return ' '
  if (cell.symbol === null) return 'n'
  const main = toIrealChord(cell.symbol)
  return cell.alt ? `${main}(${toIrealChord(cell.alt)})` : main
}

// Chords in a row are separated by commas, which take no cell
function writeCells(cells: (WriteCell | undefined)[]): string {
  let out = ''
  cells.forEach((c, i) => {
    out += cellText(c)
    if (c && c.symbol !== null && i + 1 < cells.length && cells[i + 1] !== undefined) out += ','
  })
  return out
}

const timeToken = ([a, b]: TimeSignature) => (a === 12 && b === 8 ? 'T12' : `T${a}${b}`)

function closer(bar: ChartBar): string {
  if (bar.repeatEnd) return '}'
  if (bar.barline === 'final') return 'Z'
  if (bar.barline === 'double') return ']'
  return ''
}

export function chartToMusic(chart: Chart): string {
  const { bars } = chart
  let out = ''
  let time = chart.time
  let prevChords: BarChord[] = []
  let held: string | null = null
  let prevClose = 'start'

  bars.forEach((bar, i) => {
    if (bar.time) time = bar.time
    let open = ''
    if (bar.repeatStart) open = '{'
    else if (prevClose === 'start' || (bar.section && !['}', ']', 'Z'].includes(prevClose))) open = '['
    // A bar that opens with its own sign closes the previous one
    if (!open && prevClose === '') open = '|'
    out += open

    if (bar.section) out += `*${bar.section}`
    if (i === 0 || bar.time) out += timeToken(i === 0 ? chart.time : time)
    if (bar.ending) out += `N${bar.ending}`
    if (bar.segno) out += 'S'
    if (bar.coda) out += 'Q'
    if (bar.fermata) out += 'f'

    let body: string
    if (bar.chords.length === 0) {
      // A blank bar holds the chord: the repeat sign does this when the previous bar had one chord.
      // Where the band may arrive from elsewhere (a jump, a repeat), the bar stays blank.
      const width = Math.max(1, bar.cells)
      const prev = bars[i - 1]
      const arrivedFrom =
        !prev || prev.repeatEnd || prev.barline || prev.directive || prev.end || bar.coda || bar.segno || bar.ending || bar.repeatStart
      if (bar.spacer || held === null || arrivedFrom) body = ' '.repeat(width)
      else if (prevChords.length === 1) body = 'x' + ' '.repeat(width - 1)
      else body = writeCells([{ symbol: held }, ...Array.from({ length: width - 1 }, () => undefined)])
    } else {
      const cells = cellsFor(bar.chords, Math.max(1, bar.cells), time)
      body = writeCells(cells)
    }

    // Text goes after the first cell so it belongs to this bar
    const texts = [bar.comment, bar.directive, bar.repeatTimes && bar.repeatTimes !== 2 ? `${bar.repeatTimes}x` : '']
      .filter((t): t is string => Boolean(t))
      .map((t) => `<${t.replace(/[<>]/g, '')}>`)
      .join('')
    const firstCell = /^(x|n|[A-G][^ ,]*,?| )/.exec(body)?.[0] ?? ''
    out += firstCell + texts + body.slice(firstCell.length)
    if (bar.end) out += 'U'

    const close = closer(bar)
    out += close
    prevClose = close

    if (bar.chords.length) {
      prevChords = bar.chords
      held = bar.chords.at(-1)?.symbol ?? null
    }
  })
  if (prevClose === '') out += 'Z'
  return out
}

function styleName(chart: Chart): string {
  return chart.sourceStyle ?? getStyle(chart.style).name
}

// iReal Pro stores composers "Last First"
function composerField(name?: string): string {
  if (!name) return 'Composer Unknown'
  const words = name.trim().split(' ')
  return words.length === 2 ? `${words[1]} ${words[0]}` : name.trim()
}

const clean = (s: string) => s.replace(/=/g, '-')

export function chartToIrealSong(chart: Chart): string {
  const key = noteName(chart.key, keyPrefersFlats(chart.key)) + (chart.minor ? '-' : '')
  const music = MUSIC_PREFIX + swapBlocks(chartToMusic(chart))
  return [clean(chart.title), clean(composerField(chart.composer)), '', clean(styleName(chart)), key, '', music, '', String(chart.bpm), '0'].join('=')
}

// One chart, or several with a playlist name
export function irealLink(charts: Chart[], playlist?: string): string {
  const songs = charts.map(chartToIrealSong)
  const body = charts.length > 1 || playlist ? [...songs, playlist ?? 'OpenStand'].join('===') : songs[0]
  return 'irealb://' + encodeURIComponent(body).replace(/%3D/g, '=').replace(/'/g, '%27')
}
