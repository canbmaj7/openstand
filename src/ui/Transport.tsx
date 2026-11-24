import type { ReactNode } from 'react'
import { keyPrefersFlats, noteName } from '../music/chords'
import { INSTRUMENTS, type InstrumentId } from '../music/instrument'
import { STYLES } from '../styles'

const RING = 2 * Math.PI * 27 // circumference of the loading ring

export type Readiness = { kind: 'loading'; progress: number } | { kind: 'ready' } | { kind: 'error'; message: string }
export type ModeOption = 'original' | 'major' | 'minor'

interface TransportProps {
  readiness: Readiness
  playing: boolean
  onToggle: () => void
  position: string
  notice?: string | null
  styleId: string
  extraStyles?: { id: string; name: string }[] // e.g. the style being made in the style lab
  onStyle: (id: string) => void
  keyPc: number
  onKey: (pc: number) => void
  mode: ModeOption
  originalMinor?: boolean
  onMode: (mode: ModeOption) => void
  instrument: InstrumentId
  onInstrument: (id: InstrumentId) => void
  bpm: number
  bpmRange: [number, number]
  onBpm: (bpm: number) => void
  choruses: number
  maxChoruses: number
  onChoruses: (n: number) => void
  children?: ReactNode
}

export function Transport(props: TransportProps) {
  const { readiness, playing, bpm, bpmRange, choruses } = props
  const loading = readiness.kind === 'loading'
  const clampBpm = (v: number) => Math.max(bpmRange[0], Math.min(bpmRange[1], v))
  const concertKey = noteName(props.keyPc, keyPrefersFlats(props.keyPc))

  return (
    <section className="transport" aria-label="Playback">
      <div className="transport-main">
        <button
          className="play"
          disabled={readiness.kind !== 'ready'}
          onClick={props.onToggle}
          aria-label={loading ? 'Loading sounds' : playing ? 'Stop' : 'Play'}
          title={readiness.kind === 'ready' ? 'Play / stop (Space)' : undefined}
        >
          {loading && (
            <svg className="play-ring" viewBox="0 0 60 60" aria-hidden="true">
              <circle cx="30" cy="30" r="27" />
              <circle cx="30" cy="30" r="27" className="play-ring-fill" strokeDasharray={RING} strokeDashoffset={RING * (1 - readiness.progress)} />
            </svg>
          )}
          <svg className="play-icon" viewBox="0 0 24 24" aria-hidden="true">
            {playing ? <rect x="6" y="6" width="12" height="12" rx="1.5" /> : <path d="M8 5.5v13l10.5-6.5z" />}
          </svg>
        </button>

        <div className="readout">
          {readiness.kind === 'loading' && <>Loading sounds {Math.round(readiness.progress * 100)}%</>}
          {readiness.kind === 'error' ? (
            <span className="readout-error">{readiness.message}</span>
          ) : props.notice ? (
            <span className="readout-error">{props.notice}</span>
          ) : (
            readiness.kind === 'ready' && props.position
          )}
        </div>
      </div>

      <div className="controls">
      <label className="control">
        <span className="label">Style</span>
        <select className="select" value={props.styleId} onChange={(e) => props.onStyle(e.target.value)}>
          {[...STYLES, ...(props.extraStyles ?? [])].map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="control control-key">
        <span className="label">Key</span>
        <select className="select" value={props.keyPc} onChange={(e) => props.onKey(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, pc) => (
            <option key={pc} value={pc}>
              {noteName(pc, keyPrefersFlats(pc))}
            </option>
          ))}
        </select>
        {props.instrument !== 'C' && <span className="control-hint">Band plays in {concertKey}</span>}
      </label>

      <label className="control">
        <span className="label">Mode</span>
        <select
          className="select"
          value={props.mode}
          onChange={(e) => props.onMode(e.target.value as ModeOption)}
        >
          <option value="original">Original</option>
          <option value="major">{props.originalMinor ? 'Major' : 'Major (original)'}</option>
          <option value="minor">{props.originalMinor ? 'Minor (original)' : 'Minor'}</option>
        </select>
      </label>

      <label className="control">
        <span className="label">Reads in</span>
        <select
          className="select"
          value={props.instrument}
          onChange={(e) => props.onInstrument(e.target.value as InstrumentId)}
        >
          {INSTRUMENTS.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </label>

      <div className="control control-tempo">
        <span className="label" id="tempo-label">
          Tempo
        </span>
        <div className="stepper">
          <button aria-label="Slower" onClick={() => props.onBpm(clampBpm(bpm - 5))}>
            −
          </button>
          <input
            type="range"
            aria-labelledby="tempo-label"
            min={bpmRange[0]}
            max={bpmRange[1]}
            value={bpm}
            onChange={(e) => props.onBpm(Number(e.target.value))}
          />
          <button aria-label="Faster" onClick={() => props.onBpm(clampBpm(bpm + 5))}>
            +
          </button>
          <output className="stepper-value">{bpm}</output>
        </div>
      </div>

      <div className="control">
        <span className="label" id="chorus-label">
          Choruses
        </span>
        <div className="stepper" role="group" aria-labelledby="chorus-label">
          <button aria-label="Fewer choruses" disabled={choruses <= 1} onClick={() => props.onChoruses(choruses - 1)}>
            −
          </button>
          <output className="stepper-value">{choruses}</output>
          <button aria-label="More choruses" disabled={choruses >= props.maxChoruses} onClick={() => props.onChoruses(choruses + 1)}>
            +
          </button>
        </div>
      </div>
      </div>

      <div className="transport-band">{props.children}</div>
    </section>
  )
}
