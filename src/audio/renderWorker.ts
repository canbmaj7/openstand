import { renderWavCore } from './renderCore'

export type WorkerRequest =
  | {
      type: 'render'
      midi: ArrayBuffer
      soundBank: ArrayBuffer
      volumes: Record<number, number>
      masterGain: number
      reverb?: number
    }
  | { type: 'abort' }

export type WorkerResponse =
  | { type: 'progress'; ratio: number }
  | { type: 'done'; wav: ArrayBuffer }
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

  void renderWavCore(new Uint8Array(data.midi), data.soundBank, {
    volumes: data.volumes,
    masterGain: data.masterGain,
    reverb: data.reverb,
    signal: controller.signal,
    onProgress: (ratio) => {
      const msg: WorkerResponse = { type: 'progress', ratio }
      self.postMessage(msg)
    },
  }).then(
    (wav) => {
      if (activeController === controller) activeController = null
      const buffer = new Uint8Array(wav).buffer
      const msg: WorkerResponse = { type: 'done', wav: buffer }
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
