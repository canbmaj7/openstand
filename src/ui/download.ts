// Browser file download helpers for MIDI, WAV, MP3, ChordPro, MusicXML, and .openstand.json exports.

import { masterGainFor, SOUNDFONT_URL } from '../audio/constants'
import { renderAudio, type AudioFormat } from '../audio/renderWav'
import { centsForA4, DEFAULT_A4 } from '../audio/tuning'
import { arrange, CHANNELS, type Part, type RampOptions } from '../engine/arrange'
import type { PracticeOptions } from '../engine/timeline'
import { makeBackup } from '../formats/backup'
import { chartToFile } from '../formats/chartFile'
import { chartToChordPro } from '../formats/chordpro'
import { chartToMusicXml } from '../formats/musicxml'
import type { Chart } from '../music/chart'
import { keyPrefersFlats, noteName } from '../music/chords'
import type { Setlist } from '../music/setlist'
import type { Tune } from '../music/songs'
import type { LabStyle } from '../styles/lab'
import type { StyleDefinition } from '../styles/types'

export interface WavMixerState {
  volumes: Record<Part, number>
  muted: Record<Part, boolean>
  master: number
  masterMuted: boolean
  reverb?: number
  tuning?: number
}

export interface DownloadWavOptions {
  mixer: WavMixerState
  soundBank?: ArrayBuffer | null
  ramp?: RampOptions
  onProgress?: (ratio: number) => void
  signal?: AbortSignal
}

export interface DownloadAudioOptions extends DownloadWavOptions {
  format?: AudioFormat
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

export interface DownloadMidiOptions {
  click?: boolean
  ramp?: RampOptions
}

export function downloadMidi(
  chart: Chart,
  style: StyleDefinition,
  transpose: number,
  choruses: number,
  practice: PracticeOptions,
  bpm: number,
  options: DownloadMidiOptions = {},
): void {
  const filename = backingTrackFilename(chart, transpose, bpm, 'mid')
  const { midi } = arrange(chart, style, transpose, choruses, practice, bpm, {
    click: Boolean(options.click),
    ramp: options.ramp,
  })
  downloadBlob(new Uint8Array(midi), filename, 'audio/midi')
}

export async function downloadAudio(
  chart: Chart,
  style: StyleDefinition,
  transpose: number,
  choruses: number,
  practice: PracticeOptions,
  bpm: number,
  options: DownloadAudioOptions,
): Promise<void> {
  const { format = 'wav', mixer, onProgress, signal } = options
  const channelVolumes: Record<number, number> = {}
  for (const part of Object.keys(CHANNELS) as Part[]) {
    channelVolumes[CHANNELS[part]] = mixer.muted[part] ? 0 : mixer.volumes[part]
  }
  const masterGain = masterGainFor(mixer.masterMuted ? 0 : mixer.master)
  const soundBank = options.soundBank ?? (await fetchSoundBank(signal))
  const { midi } = arrange(chart, style, transpose, choruses, practice, bpm, {
    click: !mixer.muted.click,
    ramp: options.ramp,
  })
  const audio = await renderAudio(midi, soundBank, {
    format,
    volumes: channelVolumes,
    masterGain,
    reverb: mixer.reverb,
    tuningCents: centsForA4(mixer.tuning ?? DEFAULT_A4),
    onProgress,
    signal,
  })
  const filename = backingTrackFilename(chart, transpose, bpm, format)
  const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav'
  downloadBlob(new Uint8Array(audio), filename, mimeType)
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
  return downloadAudio(chart, style, transpose, choruses, practice, bpm, { ...options, format: 'wav' })
}

export function downloadChordPro(chart: Chart, transpose: number): void {
  const filename = `${sanitizeFilename(chart.title)}.cho`
  downloadBlob(chartToChordPro(chart, transpose), filename, 'text/plain;charset=utf-8')
}

export function downloadMusicXml(chart: Chart, transpose: number): void {
  const filename = `${sanitizeFilename(chart.title)}.musicxml`
  downloadBlob(chartToMusicXml(chart, transpose), filename, 'application/vnd.recordare.musicxml+xml')
}

export function downloadChartFile(chart: Chart): void {
  const filename = `${sanitizeFilename(chart.title)}.openstand.json`
  downloadBlob(chartToFile(chart), filename, 'application/json;charset=utf-8')
}

export function downloadBackup(tunes: readonly Tune[], setlists: readonly Setlist[], styles: readonly LabStyle[]): void {
  const date = new Date().toISOString().slice(0, 10)
  downloadBlob(makeBackup(tunes, setlists, styles), `openstand-backup-${date}.json`, 'application/json;charset=utf-8')
}
