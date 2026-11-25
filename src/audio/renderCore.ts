import {
  BasicMIDI,
  MIDIControllers,
  SoundBankLoader,
  SpessaSynthProcessor,
  SpessaSynthSequencer,
  audioToWav,
} from 'spessasynth_core'
import { applyReverb, DEFAULT_REVERB } from './reverb'
import { applyTuning } from './tuning'

export const RENDER_SAMPLE_RATE = 44100
const BLOCK_SIZE = 128
const TAIL_SECONDS = 2
// Yield once per ~1 second of rendered audio so the main thread stays responsive
const YIELD_EVERY_BLOCKS = Math.floor(RENDER_SAMPLE_RATE / BLOCK_SIZE)
// -1 dBFS ceiling for the soft limiter
const LIMITER_CEILING = 10 ** (-1 / 20)
const MP3_BLOCK_SIZE = 1152
const MP3_KBPS = 192
const ENCODE_YIELD_EVERY_BLOCKS = Math.floor(RENDER_SAMPLE_RATE / MP3_BLOCK_SIZE)

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

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError(signal)
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function floatToInt16(sample: number): number {
  const clamped = Math.max(-1, Math.min(1, sample))
  return clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767)
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  let total = 0
  for (const chunk of chunks) total += chunk.byteLength
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

function copyLameChunk(chunk: ArrayLike<number> & ArrayBufferView): Uint8Array {
  // lamejs returns an Int8Array view at runtime; copy its raw underlying bytes as unsigned
  return new Uint8Array(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength))
}

/**
 * Renders a Standard MIDI File offline at 44.1 kHz stereo using spessasynth_core
 * and returns the soft-limited Float32 PCM channels.
 */
async function renderPcmCore(
  midi: Uint8Array,
  soundBank: ArrayBuffer,
  options: RenderWavOptions,
): Promise<{ left: Float32Array; right: Float32Array }> {
  const { volumes, masterGain, reverb = DEFAULT_REVERB, tuningCents = 0, onProgress, signal } = options
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
    applyReverb(synth, reverb)
    applyTuning(synth, tuningCents)

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

    return { left, right }
  } finally {
    synth.destroy()
  }
}

/**
 * Encodes 44.1 kHz stereo Float32 PCM channels into a 192 kbps CBR MP3 byte array.
 * Loads @breezystack/lamejs lazily so MP3 encoding stays out of the initial app bundle.
 */
async function encodeMp3(
  left: Float32Array,
  right: Float32Array,
  options: Pick<RenderWavOptions, 'onProgress' | 'signal'>,
): Promise<Uint8Array> {
  const { onProgress, signal } = options
  throwIfAborted(signal)

  const { Mp3Encoder } = await import('@breezystack/lamejs')
  throwIfAborted(signal)

  onProgress?.(0.9)

  const encoder = new Mp3Encoder(2, RENDER_SAMPLE_RATE, MP3_KBPS)
  const leftInt16 = new Int16Array(MP3_BLOCK_SIZE)
  const rightInt16 = new Int16Array(MP3_BLOCK_SIZE)
  const chunks: Uint8Array[] = []
  const totalSamples = left.length

  let blocksSinceYield = 0
  for (let offset = 0; offset < totalSamples; offset += MP3_BLOCK_SIZE) {
    const block = Math.min(MP3_BLOCK_SIZE, totalSamples - offset)
    for (let i = 0; i < block; i++) {
      leftInt16[i] = floatToInt16(left[offset + i])
      rightInt16[i] = floatToInt16(right[offset + i])
    }
    const encoded = encoder.encodeBuffer(leftInt16.subarray(0, block), rightInt16.subarray(0, block))
    if (encoded.length > 0) chunks.push(copyLameChunk(encoded))

    blocksSinceYield += 1
    if (blocksSinceYield >= ENCODE_YIELD_EVERY_BLOCKS) {
      blocksSinceYield = 0
      onProgress?.(0.9 + 0.1 * Math.min(0.99, (offset + block) / totalSamples))
      await yieldToEventLoop()
      throwIfAborted(signal)
    }
  }

  const flushed = encoder.flush()
  if (flushed.length > 0) chunks.push(copyLameChunk(flushed))

  const mp3 = concatUint8Arrays(chunks)
  onProgress?.(1)
  return mp3
}

/**
 * Renders a Standard MIDI File offline at 44.1 kHz stereo and encodes it as WAV or MP3.
 */
export async function renderAudioCore(
  midi: Uint8Array,
  soundBank: ArrayBuffer,
  options: RenderAudioOptions,
): Promise<Uint8Array> {
  const format = options.format ?? 'wav'
  if (format === 'mp3') {
    const { left, right } = await renderPcmCore(midi, soundBank, {
      ...options,
      onProgress: options.onProgress ? (ratio) => options.onProgress?.(ratio * 0.9) : undefined,
    })
    return encodeMp3(left, right, { onProgress: options.onProgress, signal: options.signal })
  }

  const { left, right } = await renderPcmCore(midi, soundBank, options)
  const wav = audioToWav([left, right], RENDER_SAMPLE_RATE, { normalizeAudio: false })
  options.onProgress?.(1)
  return new Uint8Array(wav)
}

/**
 * Renders a Standard MIDI File offline at 44.1 kHz stereo as a 16-bit PCM WAV byte array.
 */
export async function renderWavCore(
  midi: Uint8Array,
  soundBank: ArrayBuffer,
  options: RenderWavOptions,
): Promise<Uint8Array> {
  return renderAudioCore(midi, soundBank, { ...options, format: 'wav' })
}
