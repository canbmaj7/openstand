export const SOUNDFONT_URL = '/soundfonts/openstand.sf3'

// About +10 dB: brings the band from around -28 dBFS (RMS) to the level of other music
const MASTER_GAIN = 3.2
export const masterGainFor = (volume: number) => MASTER_GAIN * (volume / 100) ** 2

export type AudioFormat = 'wav' | 'mp3'

export interface RenderWavOptions {
  volumes: Record<number, number>
  masterGain: number
  reverb?: number
  tuningCents?: number
  onProgress?: (ratio: number) => void
  signal?: AbortSignal
}

export interface RenderAudioOptions extends RenderWavOptions {
  format?: AudioFormat
}

export function abortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason
  return new DOMException('Aborted', 'AbortError')
}
