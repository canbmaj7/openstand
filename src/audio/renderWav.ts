import { abortError, renderWavCore, type RenderWavOptions } from './renderCore'
import type { WorkerRequest, WorkerResponse } from './renderWorker'

export type { RenderWavOptions }

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

function renderInWorker(
  midi: Uint8Array,
  soundBank: ArrayBuffer,
  options: RenderWavOptions,
): Promise<Uint8Array> {
  const { volumes, masterGain, onProgress, signal } = options
  if (signal?.aborted) return Promise.reject(abortError(signal))

  const worker = new Worker(new URL('./renderWorker.ts', import.meta.url), { type: 'module' })

  return new Promise<Uint8Array>((resolve, reject) => {
    let settled = false

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort)
      worker.terminate()
    }

    const onAbort = () => {
      if (settled) return
      settled = true
      const abortMsg: WorkerRequest = { type: 'abort' }
      worker.postMessage(abortMsg)
      cleanup()
      reject(abortError(signal))
    }

    signal?.addEventListener('abort', onAbort, { once: true })

    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data
      if (msg.type === 'progress') {
        onProgress?.(msg.ratio)
        return
      }
      if (settled) return
      settled = true
      cleanup()
      if (msg.type === 'done') {
        resolve(new Uint8Array(msg.wav))
      } else {
        const err = new Error(msg.message)
        if (msg.name) err.name = msg.name
        reject(err)
      }
    })

    worker.addEventListener('error', (event) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(event.message || 'Audio worker failed'))
    })

    const midiBuffer = midi.slice().buffer
    const request: WorkerRequest = {
      type: 'render',
      midi: midiBuffer,
      soundBank,
      volumes,
      masterGain,
    }
    // Transfer the MIDI copy; keep soundBank cloned so the caller's buffer stays reusable
    worker.postMessage(request, [midiBuffer])
  })
}

/**
 * Renders MIDI bytes into a 44.1 kHz stereo WAV file, running in a Web Worker when available.
 */
export async function renderWav(
  midi: Uint8Array,
  soundBank: ArrayBuffer,
  options: RenderWavOptions,
): Promise<Uint8Array> {
  if (typeof Worker !== 'undefined') {
    try {
      return await renderInWorker(midi, soundBank, options)
    } catch (err) {
      if (isAbortError(err)) throw err
      // Fall back to main-thread rendering if Worker creation/loading fails
    }
  }
  return renderWavCore(midi, soundBank, options)
}
