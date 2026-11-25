import type { Scale } from '../music/scales'

interface ChordHelperScalesProps {
  scales: Scale[]
  activeScaleId: string
  scaleNames: string[]
  canAudition: boolean
  onSelectScale: (scaleId: string) => void
  onAuditionScale: (intervals: number[]) => void
}

export function ChordHelperScales({
  scales,
  activeScaleId,
  scaleNames,
  canAudition,
  onSelectScale,
  onAuditionScale,
}: ChordHelperScalesProps) {
  return (
    <div className="chords-scales">
      <div className="chords-scale-bar">
        <span className="label">Scales</span>
        <output className="chords-scale-notes" aria-label="Scale notes">
          {scaleNames.join(' ')}
        </output>
      </div>
      <div className="chords-scale-list">
        {scales.map((s) => (
          <div key={s.id} className="scale-row">
            <button
              type="button"
              className="scale-item"
              aria-pressed={s.id === activeScaleId}
              onClick={() => onSelectScale(s.id)}
            >
              <span className="scale-head">
                <span className="scale-name">{s.name}</span>
                {s.firstChoice && <span className="scale-badge">First choice</span>}
              </span>
              <span className="scale-note">{s.note}</span>
            </button>
            <button
              type="button"
              className="scale-hear"
              aria-label={`Hear ${s.name}`}
              title={`Hear ${s.name}`}
              disabled={!canAudition}
              onClick={() => onAuditionScale(s.intervals)}
            >
              <span aria-hidden="true">▶</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
