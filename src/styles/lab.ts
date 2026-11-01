// The style lab's model: one groove of a style laid out on a grid of sixteenth notes,
// so it can be edited cell by cell and turned back into a style.
// Everything the grid doesn't show (count-in, fills, ending, patterns for shorter chords)
// comes from the style the lab started from.

import type { DrumName } from './drums'
import { getStyle } from './index'
import type { BassNote, BassTone, CompHit, DrumHit, StyleDefinition } from './types'

export const STEPS_PER_BEAT = 4

export interface DrumCell {
  vel: number
  chance?: number // below 1: the hit plays only sometimes
  dur?: number // ring length in beats, for cymbals
}

export interface LabStyle {
  base: string // id of the style the lab started from
  name: string
  swing: number
  beats: 3 | 4 // beats per bar
  bars: 1 | 2 // length of the drum groove
  fills: boolean // keep the base style's first-bar groove and last-bar fill
  drums: Partial<Record<DrumName, (DrumCell | null)[]>>
  bass: { walking: boolean; steps: (BassTone | null)[] } // one bar
  comp: boolean[] // one bar
}

// Drum rows offered in the grid, top to bottom
export const DRUM_ROWS: DrumName[] = [
  'crash',
  'ride',
  'rideBell',
  'hhOpen',
  'hhClosed',
  'hhPedal',
  'tomHigh',
  'tomMid',
  'tomLow',
  'snare',
  'sidestick',
  'clap',
  'kick',
  'tambourine',
  'shaker',
  'cabasa',
  'cowbell',
  'claves',
  'congaHigh',
  'congaMute',
  'congaLow',
]

// Bass tones, high to low, as rows of the bass grid
export const BASS_ROWS: BassTone[] = ['8', '7', '6', '5', '3', 'R', '5-', 'app']

const empty = <T>(n: number): (T | null)[] => Array.from({ length: n }, () => null)
const stepOf = (at: number) => Math.round(at * STEPS_PER_BEAT)

export const drumSteps = (lab: LabStyle) => lab.bars * lab.beats * STEPS_PER_BEAT
export const barSteps = (lab: LabStyle) => lab.beats * STEPS_PER_BEAT

export function labFromStyle(style: StyleDefinition): LabStyle {
  const groove = style.drums.grooves.middle[0]
  const beats: 3 | 4 = (groove?.beats ?? 4) === 3 ? 3 : 4
  const bars = groove?.bars ?? 1
  const steps = bars * beats * STEPS_PER_BEAT

  const drums: LabStyle['drums'] = {}
  for (const [at, drum, vel, chance, dur] of groove?.hits ?? []) {
    const i = stepOf(at)
    if (i < 0 || i >= steps) continue
    const row = (drums[drum] ??= empty<DrumCell>(steps))
    const cell: DrumCell = { vel }
    if (chance !== undefined && chance < 1) cell.chance = chance
    if (dur !== undefined) cell.dur = dur
    row[i] = cell
  }

  const one = beats * STEPS_PER_BEAT
  const bassSteps = empty<BassTone>(one)
  const walking = style.bass.mode === 'walking'
  const pattern = style.bass.mode === 'pattern' ? style.bass.patterns[String(beats) as '3' | '4']?.[0] : undefined
  if (pattern) {
    for (const n of pattern) if (stepOf(n.at) < one) bassSteps[stepOf(n.at)] = n.tone
  } else {
    // A starting point for a walking-bass style switched to a pattern: root on one, fifth on three
    bassSteps[0] = 'R'
    if (beats === 4) bassSteps[2 * STEPS_PER_BEAT] = '5'
  }

  const comp = Array.from({ length: one }, () => false)
  for (const [at] of style.comp.rhythms[String(beats) as '3' | '4']?.[0] ?? []) {
    if (stepOf(at) >= 0 && stepOf(at) < one) comp[stepOf(at)] = true
  }

  return {
    base: style.id,
    name: `My ${style.name}`,
    swing: style.swing,
    beats,
    bars: bars === 2 ? 2 : 1,
    fills: true,
    drums,
    bass: { walking, steps: bassSteps },
    comp,
  }
}

// Ids are made from the name: "My Bossa" -> "my-bossa"
export function labId(lab: LabStyle): string {
  return (
    lab.name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-') || 'my-style'
  )
}

// Notes last until the next one (a little less, so they don't run together)
function lengths(onsets: number[], end: number, max: number): number[] {
  return onsets.map((step, i) => {
    const next = onsets[i + 1] ?? end
    return Math.min(max, ((next - step) / STEPS_PER_BEAT) * 0.9)
  })
}

const round = (n: number) => Math.round(n * 1000) / 1000

export function styleFromLab(lab: LabStyle): StyleDefinition {
  const base = getStyle(lab.base)
  const one = barSteps(lab)
  const key = String(lab.beats) as '3' | '4'

  const hits: DrumHit[] = []
  for (const drum of DRUM_ROWS) {
    lab.drums[drum]?.forEach((cell, i) => {
      if (!cell) return
      const hit: DrumHit = [round(i / STEPS_PER_BEAT), drum, cell.vel]
      if (cell.chance !== undefined || cell.dur !== undefined) hit.push(cell.chance ?? 1)
      if (cell.dur !== undefined) hit.push(cell.dur)
      hits.push(hit)
    })
  }

  const bassOnsets = lab.bass.steps.flatMap((t, i) => (t ? [i] : []))
  const bassLengths = lengths(bassOnsets, one, 2)
  const bassPattern: BassNote[] = bassOnsets.map((i, j) => ({
    at: round(i / STEPS_PER_BEAT),
    dur: round(bassLengths[j]),
    tone: lab.bass.steps[i]!,
  }))

  const compOnsets = lab.comp.flatMap((on, i) => (on ? [i] : []))
  const compLengths = lengths(compOnsets, one, 2.5)
  const compRhythm: CompHit[] = compOnsets.map((i, j) => [round(i / STEPS_PER_BEAT), round(compLengths[j])])

  const bass: StyleDefinition['bass'] =
    lab.bass.walking || bassPattern.length === 0
      ? { mode: 'walking', program: base.bass.program, range: base.bass.range }
      : {
          mode: 'pattern',
          program: base.bass.program,
          range: base.bass.range,
          patterns: { ...(base.bass.mode === 'pattern' ? base.bass.patterns : {}), [key]: [bassPattern] },
        }

  return {
    ...base,
    id: labId(lab),
    name: lab.name.trim() || 'My style',
    swing: lab.swing,
    bass,
    comp: {
      ...base.comp,
      rhythms: compRhythm.length ? { ...base.comp.rhythms, [key]: [compRhythm] } : base.comp.rhythms,
    },
    drums: {
      ...base.drums,
      grooves: {
        middle: [{ bars: lab.bars, ...(lab.beats === 3 ? { beats: 3 } : {}), hits }],
        ...(lab.fills && base.drums.grooves.first ? { first: base.drums.grooves.first } : {}),
        ...(lab.fills && base.drums.grooves.last ? { last: base.drums.grooves.last } : {}),
      },
    },
  }
}

// Changes the drum groove's length, keeping what fits
export function setBars(lab: LabStyle, bars: 1 | 2): LabStyle {
  const steps = bars * lab.beats * STEPS_PER_BEAT
  const drums: LabStyle['drums'] = {}
  for (const [drum, row] of Object.entries(lab.drums) as [DrumName, (DrumCell | null)[]][]) {
    // Going to two bars repeats the first bar
    drums[drum] = Array.from({ length: steps }, (_, i) => row[i] ?? (bars === 2 ? (row[i % row.length] ?? null) : null))
  }
  return { ...lab, bars, drums }
}

// The style as a TypeScript file for src/styles/library/
export function styleSource(style: StyleDefinition, baseName: string): string {
  const name = style.id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()).replace(/^\d/, '_$&')
  const body = JSON.stringify(style, null, 2)
    .replace(/"([A-Za-z_]\w*)":/g, '$1:')
    .replace(/"((?:[^"\\]|\\.)*)"/g, (_, s: string) => `'${s.replace(/\\"/g, '"').replace(/'/g, "\\'")}'`)
    // Short arrays of numbers and names fit on one line: [0, 'kick', 90]
    .replace(/\[\s+([^[\]{}]*?)\s+\]/g, (_, inner: string) => `[${inner.split(/,\s+/).join(', ')}]`)
  return `import type { StyleDefinition } from '../types'

// Made in the OpenStand style lab, starting from ${baseName}

export const ${name}: StyleDefinition = ${body}
`
}
