// Chord-to-MusicXML <harmony> mapping for the MusicXML exporter.

import { parseChord, spellRoot, transposeChord, type Chord } from '../music/chords'

export interface PitchSpec {
  step: string
  alter?: number
}

export interface DegreeSpec {
  value: number
  alter: number
  type: 'add' | 'alter'
}

export interface HarmonySpec {
  root: PitchSpec
  kind: string
  text?: string
  bass?: PitchSpec
  degrees: DegreeSpec[]
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function pitchSpec(pc: number, keyPc: number): PitchSpec {
  const name = spellRoot(pc, keyPc)
  const step = name[0] ?? 'C'
  const alter = name[1] === '#' ? 1 : name[1] === 'b' ? -1 : undefined
  return alter !== undefined ? { step, alter } : { step }
}

function readableSuffix(suffix: string): string {
  const s = suffix.replace(/ø/g, 'h').replace(/Δ/g, '^').replace(/°/g, 'o')
  if (/^-\^/.test(s)) return s.replace(/^-\^(\d*)/, (_, n: string) => `m(maj${n || '7'})`)
  if (/^o\^/.test(s)) return s.replace(/^o\^(\d*)/, (_, n: string) => `dim(maj${n || '7'})`)
  if (/^\+\^/.test(s)) return s.replace(/^\+\^(\d*)/, (_, n: string) => `aug(maj${n || '7'})`)
  if (/^h/.test(s)) return s.replace(/^h7?/, 'm7b5')
  if (/^o/.test(s)) return s.replace(/^o/, 'dim')
  if (/^\+/.test(s)) return s.replace(/^\+/, 'aug')
  if (/^\^/.test(s)) return s.replace(/^\^(\d*)/, (_, n: string) => `maj${n || '7'}`)
  if (/^-/.test(s)) return s.replace(/^-/, 'm')
  const norm = s.replace(/^(min|mi)(?!aj)/, 'm')
  if (norm === 'sus') return 'sus4'
  return norm.replace(/^(\d+)sus$/, '$1sus4')
}

interface KindResult {
  kind: string
  implied: Set<number>
  baseDegrees: DegreeSpec[]
}

function classifyKind(chord: Chord): KindResult {
  const s = chord.suffix.replace(/ø/g, 'h').replace(/Δ/g, '^').replace(/°/g, 'o')
  const implied = new Set<number>()
  const baseDegrees: DegreeSpec[] = []

  switch (chord.quality) {
    case 'maj': {
      const valid = /^(maj|M)?(add#?(2|9|11)|[b#](5|9|11|13))*$/.test(s)
      return { kind: valid ? 'major' : 'other', implied, baseDegrees }
    }
    case 'maj7': {
      implied.add(7)
      if (/^(\^|maj|M)13/.test(s)) {
        implied.add(9).add(11).add(13)
        return { kind: 'major-13th', implied, baseDegrees }
      }
      if (/^(\^|maj|M)11/.test(s)) {
        implied.add(9).add(11)
        return { kind: 'major-11th', implied, baseDegrees }
      }
      if (/^(\^|maj|M)9/.test(s)) {
        implied.add(9)
        return { kind: 'major-ninth', implied, baseDegrees }
      }
      return { kind: 'major-seventh', implied, baseDegrees }
    }
    case 'maj6':
      if (/^6\/?9/.test(s)) baseDegrees.push({ value: 9, alter: 0, type: 'add' })
      return { kind: 'major-sixth', implied, baseDegrees }
    case 'dom7': {
      implied.add(7)
      if (/^13/.test(s)) {
        implied.add(9).add(11).add(13)
        return { kind: 'dominant-13th', implied, baseDegrees }
      }
      if (/^11/.test(s)) {
        implied.add(9).add(11)
        return { kind: 'dominant-11th', implied, baseDegrees }
      }
      if (/^9/.test(s)) {
        implied.add(9)
        return { kind: 'dominant-ninth', implied, baseDegrees }
      }
      return { kind: 'dominant', implied, baseDegrees }
    }
    case 'sus7': {
      if (/^(7|9|11|13)/.test(s)) {
        implied.add(7)
        baseDegrees.push({ value: 7, alter: -1, type: 'add' })
        if (/^9/.test(s)) baseDegrees.push({ value: 9, alter: 0, type: 'add' })
        if (/^11/.test(s)) baseDegrees.push({ value: 11, alter: 0, type: 'add' })
        if (/^13/.test(s)) baseDegrees.push({ value: 13, alter: 0, type: 'add' })
      }
      return { kind: 'suspended-fourth', implied, baseDegrees }
    }
    case 'min':
      return { kind: 'minor', implied, baseDegrees }
    case 'min7': {
      implied.add(7)
      if (/^(min|-|m)13/.test(s)) {
        implied.add(9).add(11).add(13)
        return { kind: 'minor-13th', implied, baseDegrees }
      }
      if (/^(min|-|m)11/.test(s)) {
        implied.add(9).add(11)
        return { kind: 'minor-11th', implied, baseDegrees }
      }
      if (/^(min|-|m)9/.test(s)) {
        implied.add(9)
        return { kind: 'minor-ninth', implied, baseDegrees }
      }
      return { kind: 'minor-seventh', implied, baseDegrees }
    }
    case 'min6':
      if (/6\/?9/.test(s)) baseDegrees.push({ value: 9, alter: 0, type: 'add' })
      return { kind: 'minor-sixth', implied, baseDegrees }
    case 'minMaj7':
      implied.add(7)
      return { kind: 'major-minor', implied, baseDegrees }
    case 'half':
      implied.add(5).add(7)
      return { kind: 'half-diminished', implied, baseDegrees }
    case 'dim7':
      implied.add(5)
      if (/^(o|dim)7/.test(s)) {
        implied.add(7)
        return { kind: 'diminished-seventh', implied, baseDegrees }
      }
      return { kind: 'diminished', implied, baseDegrees }
    case 'aug':
      implied.add(5)
      if (/^(\+|aug)7/.test(s)) {
        implied.add(7)
        return { kind: 'augmented-seventh', implied, baseDegrees }
      }
      return { kind: 'augmented', implied, baseDegrees }
    case 'power':
      return { kind: 'power', implied, baseDegrees }
    case 'sus2':
      return { kind: 'suspended-second', implied, baseDegrees }
    case 'dimMaj7':
      implied.add(5).add(7)
      baseDegrees.push({ value: 7, alter: 0, type: 'add' })
      return { kind: 'diminished', implied, baseDegrees }
    case 'maj7sus':
      implied.add(7)
      baseDegrees.push({ value: 7, alter: 0, type: 'add' })
      return { kind: 'suspended-fourth', implied, baseDegrees }
    case 'augMaj7':
      implied.add(5).add(7)
      baseDegrees.push({ value: 5, alter: 1, type: 'alter' })
      return { kind: 'major-seventh', implied, baseDegrees }
  }
}

function tensionDegrees(tensions: string[], implied: Set<number>): DegreeSpec[] {
  const out: DegreeSpec[] = []
  const pushUnique = (d: DegreeSpec) => {
    if (!out.some((x) => x.value === d.value && x.alter === d.alter && x.type === d.type)) out.push(d)
  }

  for (const t of tensions) {
    if (t === 'b5' && !implied.has(5)) pushUnique({ value: 5, alter: -1, type: 'alter' })
    else if (t === '#5' && !implied.has(5)) pushUnique({ value: 5, alter: 1, type: 'alter' })
    else if (t === 'b9') pushUnique({ value: 9, alter: -1, type: implied.has(9) ? 'alter' : 'add' })
    else if (t === '#9') pushUnique({ value: 9, alter: 1, type: implied.has(9) ? 'alter' : 'add' })
    else if (t === '#11') pushUnique({ value: 11, alter: 1, type: implied.has(11) ? 'alter' : 'add' })
    else if (t === 'b13') pushUnique({ value: 13, alter: -1, type: implied.has(13) ? 'alter' : 'add' })
    else if (t === 'add9') pushUnique({ value: 9, alter: 0, type: 'add' })
    else if (t === 'add2') pushUnique({ value: 2, alter: 0, type: 'add' })
    else if (t === 'add11') pushUnique({ value: 11, alter: 0, type: 'add' })
    else if (t === 'add#11') pushUnique({ value: 11, alter: 1, type: 'add' })
    else if (t === 'alt') {
      pushUnique({ value: 9, alter: -1, type: 'add' })
      if (!implied.has(5)) pushUnique({ value: 5, alter: 1, type: 'alter' })
    }
  }
  return out
}

export function chordToHarmony(symbol: string | null, keyPc: number, transpose: number): HarmonySpec {
  if (symbol === null || /^(n\.?c\.?|nc)$/i.test(symbol.trim())) {
    return { root: { step: 'C' }, kind: 'none', text: 'N.C.', degrees: [] }
  }

  const parsed = parseChord(symbol)
  if (!parsed) {
    return { root: { step: 'C' }, kind: 'other', text: symbol.trim(), degrees: [] }
  }

  const transposed = transpose ? transposeChord(parsed, transpose) : parsed
  const root = pitchSpec(transposed.root, keyPc)
  const bass = transposed.bass !== transposed.root ? pitchSpec(transposed.bass, keyPc) : undefined
  const { kind, implied, baseDegrees } = classifyKind(transposed)
  const text = kind === 'other' ? transposed.suffix : readableSuffix(transposed.suffix)
  const degrees = kind === 'other' ? [] : [...baseDegrees, ...tensionDegrees(transposed.tensions, implied)]

  return {
    root,
    kind,
    text: text || undefined,
    bass,
    degrees,
  }
}

export function renderHarmonyXml(h: HarmonySpec, indent: string): string[] {
  const lines: string[] = [`${indent}<harmony>`]
  lines.push(`${indent}  <root>`)
  lines.push(`${indent}    <root-step>${h.root.step}</root-step>`)
  if (h.root.alter !== undefined) lines.push(`${indent}    <root-alter>${h.root.alter}</root-alter>`)
  lines.push(`${indent}  </root>`)
  const textAttr = h.text !== undefined ? ` text="${escapeXml(h.text)}"` : ''
  lines.push(`${indent}  <kind${textAttr}>${h.kind}</kind>`)
  if (h.bass) {
    lines.push(`${indent}  <bass>`)
    lines.push(`${indent}    <bass-step>${h.bass.step}</bass-step>`)
    if (h.bass.alter !== undefined) lines.push(`${indent}    <bass-alter>${h.bass.alter}</bass-alter>`)
    lines.push(`${indent}  </bass>`)
  }
  for (const d of h.degrees) {
    lines.push(`${indent}  <degree>`)
    lines.push(`${indent}    <degree-value>${d.value}</degree-value>`)
    lines.push(`${indent}    <degree-alter>${d.alter}</degree-alter>`)
    lines.push(`${indent}    <degree-type>${d.type}</degree-type>`)
    lines.push(`${indent}  </degree>`)
  }
  lines.push(`${indent}</harmony>`)
  return lines
}
