import { renderAudioCore, type AudioFormat } from './renderCore'

export type WorkerRequest =
  | {
      type: 'render'
      format?: AudioFormat
      midi: ArrayBuffer
      soundBank: ArrayBuffer
      volumes: Record<number, number>
      masterGain: number
      reverb?: number
      tuningCents?: number
    }
  | { type: 'abort' }

export type WorkerResponse =
  | { type: 'progress'; ratio: number }
  | { type: 'done'; data: ArrayBuffer }
  | { type: 'error'; message: string; name?: string }

let activeController: AbortController | null = null

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const data = event.data
  if (data.type === 'abort') {
    activeController?.abort()
    return
  }

  activeController?.abort()
  const controller = new AbortController()
  activeController = controller

  void renderAudioCore(new Uint8Array(data.midi), data.soundBank, {
    format: data.format ?? 'wav',
    volumes: data.volumes,
    masterGain: data.masterGain,
    reverb: data.reverb,
    tuningCents: data.tuningCents,
    signal: controller.signal,
    onProgress: (ratio) => {
      const msg: WorkerResponse = { type: 'progress', ratio }
      self.postMessage(msg)
    },
  }).then(
    (audio) => {
      if (activeController === controller) activeController = null
      const buffer =
        audio.buffer instanceof ArrayBuffer && audio.byteOffset === 0 && audio.byteLength === audio.buffer.byteLength
          ? audio.buffer
          : audio.slice().buffer
      const msg: WorkerResponse = { type: 'done', data: buffer }
      self.postMessage(msg, { transfer: [buffer] })
    },
    (err: unknown) => {
      if (activeController === controller) activeController = null
      const msg: WorkerResponse = {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : undefined,
      }
      self.postMessage(msg)
    },
  )
})
