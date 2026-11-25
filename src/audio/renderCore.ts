import {
  BasicMIDI,
  MIDIControllers,
  SoundBankLoader,
  SpessaSynthProcessor,
  SpessaSynthSequencer,
  audioToWav,
} from 'spessasynth_core'

export const RENDER_SAMPLE_RATE = 44100
const BLOCK_SIZE = 128
const TAIL_SECONDS = 2
// Yield once per ~1 second of rendered audio so the main thread stays responsive
const YIELD_EVERY_BLOCKS = Math.floor(RENDER_SAMPLE_RATE / BLOCK_SIZE)
// -1 dBFS ceiling for the soft limiter
const LIMITER_CEILING = 10 ** (-1 / 20)

export interface RenderWavOptions {
  volumes: Record<number, number>
  masterGain: number
  onProgress?: (ratio: number) => void
  signal?: AbortSignal
}

export function abortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason
  return new DOMException('Aborted', 'AbortError')
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError(signal)
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Renders a Standard MIDI File offline at 44.1 kHz stereo using spessasynth_core
 * and encodes the result as a 16-bit PCM WAV byte array.
 */
export async function renderWavCore(
  midi: Uint8Array,
  soundBank: ArrayBuffer,
  options: RenderWavOptions,
): Promise<Uint8Array> {
  const { volumes, masterGain, onProgress, signal } = options
  throwIfAborted(signal)

  onProgress?.(0)

  const synth = new SpessaSynthProcessor(RENDER_SAMPLE_RATE)
  try {
    await synth.ready
    throwIfAborted(signal)

    const bank = SoundBankLoader.fromArrayBuffer(soundBank)
    synth.soundBankManager.addSoundBank(bank, 'main')

    const parsedMidi = BasicMIDI.fromArrayBuffer(midi.slice().buffer)
    const songSamples = Math.ceil(parsedMidi.duration * RENDER_SAMPLE_RATE)
    const totalSamples = Math.max(1, songSamples + TAIL_SECONDS * RENDER_SAMPLE_RATE)

    const seq = new SpessaSynthSequencer(synth)
    seq.skipToFirstNoteOn = false
    seq.loopCount = 0
    seq.loadNewSongList([parsedMidi])
    seq.play()

    for (const [ch, volume] of Object.entries(volumes)) {
      const channel = Number(ch)
      const midiChannel = synth.midiChannels[channel]
      if (!midiChannel) continue
      midiChannel.lockController(MIDIControllers.mainVolume, false)
      synth.controllerChange(channel, MIDIControllers.mainVolume, Math.max(0, Math.min(127, Math.round(volume))))
      midiChannel.lockController(MIDIControllers.mainVolume, true)
    }

    const left = new Float32Array(totalSamples)
    const right = new Float32Array(totalSamples)

    let filled = 0
    let blocksSinceYield = 0
    while (filled < totalSamples) {
      const block = Math.min(BLOCK_SIZE, totalSamples - filled)
      if (!seq.isFinished) seq.processTick()
      synth.process(left, right, filled, block)
      filled += block
      blocksSinceYield += 1
      if (blocksSinceYield >= YIELD_EVERY_BLOCKS) {
        blocksSinceYield = 0
        onProgress?.(Math.min(0.99, filled / totalSamples))
        await yieldToEventLoop()
        throwIfAborted(signal)
      }
    }

    const gain = Math.max(0, masterGain)
    for (let i = 0; i < totalSamples; i++) {
      left[i] = LIMITER_CEILING * Math.tanh((left[i] * gain) / LIMITER_CEILING)
      right[i] = LIMITER_CEILING * Math.tanh((right[i] * gain) / LIMITER_CEILING)
    }

    const wav = audioToWav([left, right], RENDER_SAMPLE_RATE, { normalizeAudio: false })
    onProgress?.(1)
    return new Uint8Array(wav)
  } finally {
    synth.destroy()
  }
}
