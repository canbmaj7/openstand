import { MIDIControllers } from 'spessasynth_core'
import { Sequencer, WorkletSynthesizer } from 'spessasynth_lib'
import processorUrl from 'spessasynth_lib/dist/spessasynth_processor.min.js?url'

const SOUNDFONT_URL = '/soundfonts/openstand.sf3'
const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'keydown'] as const

async function fetchWithProgress(url: string, onProgress: (ratio: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Could not download the sound bank (${res.status})`)
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    if (total) onProgress(loaded / total)
  }
  const out = new Uint8Array(loaded)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out.buffer
}

// About +10 dB: brings the band from around -28 dBFS (RMS) to the level of other music
const MASTER_GAIN = 3.2

// Thin layer over SpessaSynth: sound bank loading, MIDI playback, mixer
export class Player {
  private ctx: AudioContext
  private synth: WorkletSynthesizer | null = null
  private seq: Sequencer | null = null
  private volumes = new Map<number, number>()
  // Loads go one at a time, so a warm-up load can't replace the song the user asked for
  private loading: Promise<void> = Promise.resolve()
  private playRequested = false
  onEnded: () => void = () => {}

  constructor() {
    this.ctx = new AudioContext({ sampleRate: 44100 })
    // On iPhone, Web Audio is silenced by the ring/silent switch unless the session is "playback"
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'
    // Phones open the audio output on the first touch; doing it then, rather than on play, saves that wait
    const unlock = () => {
      if (this.ctx.state === 'running') {
        for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlock, true)
        return
      }
      void this.ctx.resume()
    }
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock, true)
  }

  // The output stage: the General MIDI sound bank plays well below full scale, so the band is
  // raised by about 10 dB, and a fast limiter catches the peaks so nothing distorts
  private master(): AudioNode {
    const gain = new GainNode(this.ctx, { gain: MASTER_GAIN })
    const limiter = new DynamicsCompressorNode(this.ctx, { threshold: -8, knee: 4, ratio: 12, attack: 0.002, release: 0.15 })
    gain.connect(limiter).connect(this.ctx.destination)
    return gain
  }

  async init(onProgress: (ratio: number) => void): Promise<void> {
    const [soundfont] = await Promise.all([
      fetchWithProgress(SOUNDFONT_URL, onProgress),
      this.ctx.audioWorklet.addModule(processorUrl),
    ])
    const synth = new WorkletSynthesizer(this.ctx)
    synth.connect(this.master())
    await synth.soundBankManager.addSoundBank(soundfont, 'main')
    await synth.isReady

    const seq = new Sequencer(synth, { skipToFirstNoteOn: false })
    seq.loopCount = 0
    seq.eventHandler.addEvent('songEnded', 'player', () => this.onEnded())

    this.synth = synth
    this.seq = seq
  }

  // Loads the MIDI and starts playing from the given time (seconds of MIDI time)
  async play(midi: Uint8Array, fromSeconds = 0): Promise<void> {
    const seq = this.requireSeq()
    this.playRequested = true
    const resumed = this.ctx.resume()
    await this.load(midi, 'arrangement.mid')
    await resumed
    this.applyVolumes()
    if (fromSeconds > 0) seq.currentTime = fromSeconds
    seq.play()
  }

  // Loads silent songs so their samples are decoded before they are needed.
  // Stops as soon as the user presses play; the rest is decoded on the way.
  async warmUp(songs: Uint8Array[]): Promise<void> {
    for (const midi of songs) {
      if (this.playRequested) return
      await this.load(midi, 'warm-up.mid')
    }
  }

  private load(midi: Uint8Array, fileName: string): Promise<void> {
    const seq = this.requireSeq()
    const next = this.loading.then(
      () =>
        new Promise<void>((resolve) => {
          seq.eventHandler.addEvent('songChange', 'player-load', () => {
            seq.eventHandler.removeEvent('songChange', 'player-load')
            resolve()
          })
          seq.loadNewSongList([{ binary: midi.slice().buffer, fileName }])
        }),
    )
    this.loading = next
    return next
  }

  stop(): void {
    if (!this.seq || !this.synth) return
    this.seq.pause()
    this.seq.currentTime = 0
    this.synth.stopAll(true)
  }

  async dispose(): Promise<void> {
    this.stop()
    await this.ctx.close()
  }

  get isPlaying(): boolean {
    return !!this.seq && !this.seq.paused && !this.seq.isFinished
  }

  // Position inside the playing MIDI (seconds at the base tempo)
  get position(): number {
    return this.seq?.currentTime ?? 0
  }

  // Position of what can be heard right now: the output (phone speaker, Bluetooth) plays a little
  // behind the synthesizer, so the chart follows the ears rather than the synthesizer.
  // The audio clock moves in steps; the smoothed clock keeps the chart's highlight gliding.
  get heardPosition(): number {
    const seq = this.seq
    if (!seq) return 0
    const latency = (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0)
    return Math.max(0, seq.currentHighResolutionTime - latency * seq.playbackRate)
  }

  setRate(rate: number): void {
    if (this.seq) this.seq.playbackRate = rate
  }

  setVolume(channel: number, volume: number): void {
    this.volumes.set(channel, volume)
    this.applyVolume(channel, volume)
  }

  private applyVolumes(): void {
    this.volumes.forEach((v, ch) => this.applyVolume(ch, v))
  }

  // Locks the volume so controllers in the MIDI file cannot override the mixer
  private applyVolume(channel: number, volume: number): void {
    const midiChannel = this.synth?.midiChannels[channel]
    if (!this.synth || !midiChannel) return
    midiChannel.lockController(MIDIControllers.mainVolume, false)
    this.synth.controllerChange(channel, MIDIControllers.mainVolume, Math.round(volume))
    midiChannel.lockController(MIDIControllers.mainVolume, true)
  }

  private requireSeq(): Sequencer {
    if (!this.seq) throw new Error('Player is not ready yet')
    return this.seq
  }
}
