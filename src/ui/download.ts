// Browser file download helpers for MIDI, WAV, ChordPro, and .openstand.json exports.

import { masterGainFor, SOUNDFONT_URL } from '../audio/player'
import { renderWav } from '../audio/renderWav'
import { arrange, CHANNELS, type Part } from '../engine/arrange'
import type { PracticeOptions } from '../engine/timeline'
import { chartToFile } from '../formats/chartFile'
import { chartToChordPro } from '../formats/chordpro'
import type { Chart } from '../music/chart'
import { keyPrefersFlats, noteName } from '../music/chords'
import type { StyleDefinition } from '../styles/types'

export interface WavMixerState {
  volumes: Record<Part, number>
  muted: Record<Part, boolean>
  master: number
  masterMuted: boolean
  reverb?: number
}

export interface DownloadWavOptions {
  mixer: WavMixerState
  soundBank?: ArrayBuffer | null
  onProgress?: (ratio: number) => void
  signal?: AbortSignal
}

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

function backingTrackFilename(chart: Chart, transpose: number, bpm: number, ext: string): string {
  const keyPc = (((chart.key + transpose) % 12) + 12) % 12
  const key = noteName(keyPc, keyPrefersFlats(keyPc)) + (chart.minor ? 'm' : '')
  return `${sanitizeFilename(chart.title)} - ${key} - ${bpm}.${ext}`
}

async function fetchSoundBank(signal?: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(SOUNDFONT_URL, { signal })
  if (!res.ok) throw new Error(`Could not download the sound bank (${res.status})`)
  return res.arrayBuffer()
}

export function downloadMidi(
  chart: Chart,
  style: StyleDefinition,
  transpose: number,
  choruses: number,
  practice: PracticeOptions,
  bpm: number,
): void {
  const filename = backingTrackFilename(chart, transpose, bpm, 'mid')
  const { midi } = arrange(chart, style, transpose, choruses, practice, bpm)
  downloadBlob(new Uint8Array(midi), filename, 'audio/midi')
}

export async function downloadWav(
  chart: Chart,
  style: StyleDefinition,
  transpose: number,
  choruses: number,
  practice: PracticeOptions,
  bpm: number,
  options: DownloadWavOptions,
): Promise<void> {
  const { mixer, onProgress, signal } = options
  const channelVolumes: Record<number, number> = {}
  for (const part of Object.keys(CHANNELS) as Part[]) {
    channelVolumes[CHANNELS[part]] = mixer.muted[part] ? 0 : mixer.volumes[part]
  }
  const masterGain = masterGainFor(mixer.masterMuted ? 0 : mixer.master)
  const soundBank = options.soundBank ?? (await fetchSoundBank(signal))
  const { midi } = arrange(chart, style, transpose, choruses, practice, bpm)
  const wav = await renderWav(midi, soundBank, {
    volumes: channelVolumes,
    masterGain,
    reverb: mixer.reverb,
    onProgress,
    signal,
  })
  const filename = backingTrackFilename(chart, transpose, bpm, 'wav')
  downloadBlob(new Uint8Array(wav), filename, 'audio/wav')
}

export function downloadChordPro(chart: Chart, transpose: number): void {
  const filename = `${sanitizeFilename(chart.title)}.cho`
  downloadBlob(chartToChordPro(chart, transpose), filename, 'text/plain;charset=utf-8')
}

export function downloadChartFile(chart: Chart): void {
  const filename = `${sanitizeFilename(chart.title)}.openstand.json`
  downloadBlob(chartToFile(chart), filename, 'application/json;charset=utf-8')
}
