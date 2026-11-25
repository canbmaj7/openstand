import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioFormat } from '../audio/renderWav'
import type { PracticeOptions } from '../engine/timeline'
import type { Chart } from '../music/chart'
import type { StyleDefinition } from '../styles/types'
import { downloadAudio, type WavMixerState } from './download'

export type AudioExportState =
  | { kind: 'idle' }
  | { kind: 'rendering'; format: AudioFormat; progress: number }
  | { kind: 'failed'; format: AudioFormat }

export interface AudioExportRequest {
  chart: Chart
  style: StyleDefinition
  transpose: number
  choruses: number
  practice: PracticeOptions
  bpm: number
  mixer: WavMixerState
  soundBank?: ArrayBuffer | null
}

export const AUDIO_EXPORT_OPTIONS: readonly { format: AudioFormat; label: string; desc: string }[] = [
  { format: 'wav', label: 'Download audio (WAV)', desc: 'The backing track at the current key, tempo and mixer levels.' },
  { format: 'mp3', label: 'Download audio (MP3)', desc: 'Smaller file for phones and sharing.' },
]

export function audioExportLabel(state: AudioExportState, format: AudioFormat, defaultLabel: string): string {
  if (state.kind === 'rendering' && state.format === format) return `Rendering… ${Math.round(state.progress * 100)}%`
  if (state.kind === 'failed' && state.format === format) return 'Export failed'
  return defaultLabel
}

/**
 * Coordinates WAV/MP3 offline rendering state and progress across both Share menu actions.
 */
export function useAudioExport() {
  const [audioState, setAudioState] = useState<AudioExportState>({ kind: 'idle' })
  const renderingRef = useRef(false)
  const resetTimer = useRef(0)

  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  const exportAudio = useCallback(async (format: AudioFormat, request: AudioExportRequest, close: () => void) => {
    if (renderingRef.current) return
    renderingRef.current = true
    window.clearTimeout(resetTimer.current)
    setAudioState({ kind: 'rendering', format, progress: 0 })
    try {
      await downloadAudio(request.chart, request.style, request.transpose, request.choruses, request.practice, request.bpm, {
        format,
        mixer: request.mixer,
        soundBank: request.soundBank,
        onProgress: (ratio) => setAudioState({ kind: 'rendering', format, progress: ratio }),
      })
      setAudioState({ kind: 'idle' })
      close()
    } catch {
      setAudioState({ kind: 'failed', format })
      resetTimer.current = window.setTimeout(() => setAudioState({ kind: 'idle' }), 3000)
    } finally {
      renderingRef.current = false
    }
  }, [])

  return { audioState, exportAudio }
}
