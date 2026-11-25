// MusicXML 4.0 partwise exporter: writes a chart as a single-part chord/slash lead sheet (.musicxml).

import { beatsPerBar, type Chart, type ChartBar, type TimeSignature } from '../music/chart'
import { chordToHarmony, escapeXml, renderHarmonyXml } from './musicxmlChords'

// Key signature fifths for pitch classes 0..11 in major (C=0, Db=-5, D=2, ... B=5)
const FIFTHS = [0, -5, 2, -3, 4, -1, -6, 1, -4, 3, -2, 5]

interface NoteChunk {
  duration: number
  type: string
  dot: boolean
  tieStop: boolean
  tieStart: boolean
}

function sectionLabel(section: string): string {
  return section === 'i' ? 'Intro' : section === 'v' ? 'Verse' : section
}

function chooseDivisions(bars: ChartBar[], initialTime: TimeSignature): number {
  const values: number[] = []
  let time = initialTime
  for (const bar of bars) {
    if (bar.time) time = bar.time
    values.push(beatsPerBar(time))
    for (const c of bar.chords) values.push(c.beats)
  }
  for (const mult of [1, 5, 7, 10]) {
    const div = 24 * mult
    if (values.every((v) => Math.abs(v * div - Math.round(v * div)) < 1e-4)) return div
  }
  return 24
}

function noteTypes(divisions: number): { dur: number; type: string; dot: boolean }[] {
  const candidates: { dur: number; type: string; dot: boolean }[] = [
    { dur: 6 * divisions, type: 'whole', dot: true },
    { dur: 4 * divisions, type: 'whole', dot: false },
    { dur: 3 * divisions, type: 'half', dot: true },
    { dur: 2 * divisions, type: 'half', dot: false },
    { dur: 1.5 * divisions, type: 'quarter', dot: true },
    { dur: divisions, type: 'quarter', dot: false },
    { dur: 0.75 * divisions, type: 'eighth', dot: true },
    { dur: 0.5 * divisions, type: 'eighth', dot: false },
  ]
  if (divisions % 8 === 0) {
    candidates.push(
      { dur: 0.375 * divisions, type: '16th', dot: true },
      { dur: 0.25 * divisions, type: '16th', dot: false },
      { dur: 0.125 * divisions, type: '32nd', dot: false },
    )
  } else if (divisions % 4 === 0) {
    candidates.push({ dur: 0.25 * divisions, type: '16th', dot: false })
  }
  return candidates.sort((a, b) => b.dur - a.dur)
}

function splitDuration(total: number, divisions: number): NoteChunk[] {
  const types = noteTypes(divisions)
  const parts: { duration: number; type: string; dot: boolean }[] = []
  let rem = total
  for (const cand of types) {
    while (rem >= cand.dur) {
      parts.push({ duration: cand.dur, type: cand.type, dot: cand.dot })
      rem -= cand.dur
    }
  }
  if (rem > 0) {
    const closest = types.reduce((a, b) => (Math.abs(b.dur - total) < Math.abs(a.dur - total) ? b : a))
    return [{ duration: total, type: closest.type, dot: false, tieStop: false, tieStart: false }]
  }
  return parts.map((p, idx) => ({ ...p, tieStop: idx > 0, tieStart: idx < parts.length - 1 }))
}

function renderSlashNotes(duration: number, divisions: number, indent: string): string[] {
  const lines: string[] = []
  for (const n of splitDuration(duration, divisions)) {
    lines.push(
      `${indent}<note>`,
      `${indent}  <pitch><step>B</step><octave>4</octave></pitch>`,
      `${indent}  <duration>${n.duration}</duration>`,
    )
    if (n.tieStop) lines.push(`${indent}  <tie type="stop"/>`)
    if (n.tieStart) lines.push(`${indent}  <tie type="start"/>`)
    lines.push(`${indent}  <voice>1</voice>`, `${indent}  <type>${n.type}</type>`)
    if (n.dot) lines.push(`${indent}  <dot/>`)
    lines.push(`${indent}  <stem>none</stem>`, `${indent}  <notehead>slash</notehead>`)
    if (n.tieStop || n.tieStart) {
      lines.push(`${indent}  <notations>`)
      if (n.tieStop) lines.push(`${indent}    <tied type="stop"/>`)
      if (n.tieStart) lines.push(`${indent}    <tied type="start"/>`)
      lines.push(`${indent}  </notations>`)
    }
    lines.push(`${indent}</note>`)
  }
  return lines
}

function directionXml(inner: string, indent: string, sound?: string): string[] {
  const lines = [`${indent}<direction placement="above">`, `${indent}  <direction-type>${inner}</direction-type>`]
  if (sound) lines.push(`${indent}  ${sound}`)
  lines.push(`${indent}</direction>`)
  return lines
}

function directiveSound(directive: string): string | undefined {
  const lower = directive.toLowerCase()
  if (/^d\.s\./.test(lower)) return '<sound dalsegno="segno"/>'
  if (/^d\.c\./.test(lower)) return '<sound dacapo="yes"/>'
  if (lower === 'fine') return '<sound fine="yes"/>'
  if (lower.includes('coda')) return '<sound tocoda="coda"/>'
  return undefined
}

function shouldCloseEnding(bars: ChartBar[], index: number): boolean {
  const bar = bars[index]
  if (bar.repeatEnd || bar.barline) return true
  const next = bars[index + 1]
  if (!next || next.ending !== undefined || next.repeatStart || next.section !== undefined) return true
  for (let j = index + 1; j < bars.length; j++) {
    if (bars[j].repeatEnd) return false
    if (bars[j].ending !== undefined || bars[j].section !== undefined || bars[j].repeatStart) return true
  }
  return true
}

function keySignature(chart: Chart, transpose: number): { fifths: number; mode: 'major' | 'minor'; keyPc: number } {
  const keyPc = (((chart.key + transpose) % 12) + 12) % 12
  const sigPc = chart.minor ? (keyPc + 3) % 12 : keyPc
  return { fifths: FIFTHS[sigPc] ?? 0, mode: chart.minor ? 'minor' : 'major', keyPc }
}

export function chartToMusicXml(chart: Chart, transpose = 0): string {
  const playable = chart.bars.filter((b) => !b.spacer)
  const divisions = chooseDivisions(playable, chart.time)
  const { fifths, mode, keyPc } = keySignature(chart, transpose)
  const codaBars = playable.flatMap((b, i) => (b.coda ? [i] : []))

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="4.0">',
    `  <work><work-title>${escapeXml(chart.title)}</work-title></work>`,
    '  <identification>',
  ]
  if (chart.composer) lines.push(`    <creator type="composer">${escapeXml(chart.composer)}</creator>`)
  lines.push(
    '    <encoding><software>OpenStand</software></encoding>',
    '  </identification>',
    '  <part-list><score-part id="P1"><part-name>Chords</part-name></score-part></part-list>',
    '  <part id="P1">',
  )

  let activeTime = chart.time
  let activeEnding: number | null = null

  playable.forEach((bar, i) => {
    const indent = '      '
    const timeChanged = Boolean(bar.time && (bar.time[0] !== activeTime[0] || bar.time[1] !== activeTime[1]))
    if (bar.time) activeTime = bar.time
    const barDuration = Math.round(beatsPerBar(activeTime) * divisions)

    lines.push(`    <measure number="${i + 1}">`)
    if (i > 0 && bar.rowStart) lines.push(`${indent}<print new-system="yes"/>`)

    if (bar.repeatStart || bar.ending !== undefined) {
      lines.push(`${indent}<barline location="left">`)
      if (bar.repeatStart) lines.push(`${indent}  <bar-style>heavy-light</bar-style>`)
      if (bar.ending !== undefined) {
        activeEnding = bar.ending
        lines.push(`${indent}  <ending number="${bar.ending}" type="start"/>`)
      }
      if (bar.repeatStart) lines.push(`${indent}  <repeat direction="forward"/>`)
      lines.push(`${indent}</barline>`)
    }

    if (i === 0) {
      lines.push(
        `${indent}<attributes>`,
        `${indent}  <divisions>${divisions}</divisions>`,
        `${indent}  <key><fifths>${fifths}</fifths><mode>${mode}</mode></key>`,
        `${indent}  <time><beats>${activeTime[0]}</beats><beat-type>${activeTime[1]}</beat-type></time>`,
        `${indent}  <clef><sign>G</sign><line>2</line></clef>`,
        `${indent}</attributes>`,
        ...directionXml(
          `<metronome><beat-unit>quarter</beat-unit><per-minute>${chart.bpm}</per-minute></metronome>`,
          indent,
          `<sound tempo="${chart.bpm}"/>`,
        ),
      )
    } else if (timeChanged) {
      lines.push(
        `${indent}<attributes>`,
        `${indent}  <time><beats>${activeTime[0]}</beats><beat-type>${activeTime[1]}</beat-type></time>`,
        `${indent}</attributes>`,
      )
    }

    if (bar.section) lines.push(...directionXml(`<rehearsal>${escapeXml(sectionLabel(bar.section))}</rehearsal>`, indent))
    if (bar.segno) lines.push(...directionXml('<segno/>', indent, '<sound segno="segno"/>'))
    const isToCoda = Boolean(bar.coda && codaBars.length > 1 && i === codaBars[0])
    if (bar.coda && !isToCoda) lines.push(...directionXml('<coda/>', indent, '<sound coda="coda"/>'))
    if (bar.comment) lines.push(...directionXml(`<words>${escapeXml(bar.comment)}</words>`, indent))

    if (bar.chords.length === 0) {
      lines.push(...renderSlashNotes(barDuration, divisions, indent))
    } else {
      let beatCursor = 0
      let divCursor = 0
      bar.chords.forEach((chord, cIdx) => {
        beatCursor += chord.beats
        const nextDiv = cIdx === bar.chords.length - 1 ? barDuration : Math.round(beatCursor * divisions)
        const dur = Math.max(1, nextDiv - divCursor)
        divCursor = nextDiv
        lines.push(...renderHarmonyXml(chordToHarmony(chord.symbol, keyPc, transpose), indent))
        lines.push(...renderSlashNotes(dur, divisions, indent))
      })
    }

    if (isToCoda) lines.push(...directionXml('<coda/>', indent, '<sound tocoda="coda"/>'))
    if (bar.directive) lines.push(...directionXml(`<words>${escapeXml(bar.directive)}</words>`, indent, directiveSound(bar.directive)))

    const closingEnding = activeEnding !== null && shouldCloseEnding(playable, i) ? activeEnding : null
    if (closingEnding !== null) activeEnding = null

    if (bar.repeatEnd || bar.barline || bar.fermata || closingEnding !== null) {
      lines.push(`${indent}<barline location="right">`)
      if (bar.repeatEnd || bar.barline === 'final') lines.push(`${indent}  <bar-style>light-heavy</bar-style>`)
      else if (bar.barline === 'double') lines.push(`${indent}  <bar-style>light-light</bar-style>`)
      if (bar.fermata) lines.push(`${indent}  <fermata type="upright"/>`)
      if (closingEnding !== null) {
        const type = bar.repeatEnd || playable[i + 1]?.ending !== undefined ? 'stop' : 'discontinue'
        lines.push(`${indent}  <ending number="${closingEnding}" type="${type}"/>`)
      }
      if (bar.repeatEnd) {
        const times = bar.repeatTimes && bar.repeatTimes !== 2 ? ` times="${bar.repeatTimes}"` : ''
        lines.push(`${indent}  <repeat direction="backward"${times}/>`)
      }
      lines.push(`${indent}</barline>`)
    }

    lines.push('    </measure>')
  })

  lines.push('  </part>', '</score-partwise>', '')
  return lines.join('\n')
}
