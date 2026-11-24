// Browser file download helpers for MIDI, ChordPro, and .openstand.json exports.

import { arrange } from '../engine/arrange'
import type { PracticeOptions } from '../engine/timeline'
import { chartToFile } from '../formats/chartFile'
import { chartToChordPro } from '../formats/chordpro'
import type { Chart } from '../music/chart'
import { keyPrefersFlats, noteName } from '../music/chords'
import type { StyleDefinition } from '../styles/types'

export function sanitizeFilename(name: string): string {
  const noControls = Array.from(name, (c) => (c.charCodeAt(0) < 32 ? ' ' : c)).join('')
  return noControls.replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim() || 'chart'
}

export function downloadBlob(content: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadMidi(
  chart: Chart,
  style: StyleDefinition,
  transpose: number,
  choruses: number,
  practice: PracticeOptions,
  bpm: number,
): void {
  const keyPc = (((chart.key + transpose) % 12) + 12) % 12
  const key = noteName(keyPc, keyPrefersFlats(keyPc)) + (chart.minor ? 'm' : '')
  const filename = `${sanitizeFilename(chart.title)} - ${key} - ${bpm}.mid`
  const { midi } = arrange(chart, style, transpose, choruses, practice, bpm)
  downloadBlob(new Uint8Array(midi), filename, 'audio/midi')
}

export function downloadChordPro(chart: Chart, transpose: number): void {
  const filename = `${sanitizeFilename(chart.title)}.cho`
  downloadBlob(chartToChordPro(chart, transpose), filename, 'text/plain;charset=utf-8')
}

export function downloadChartFile(chart: Chart): void {
  const filename = `${sanitizeFilename(chart.title)}.openstand.json`
  downloadBlob(chartToFile(chart), filename, 'application/json;charset=utf-8')
}
