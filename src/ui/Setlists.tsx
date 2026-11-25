import { useMemo, useState } from 'react'
import type { Setlist } from '../music/setlist'
import type { Tune } from '../music/songs'
import { SetlistDetail } from './SetlistDetail'
import './setlists.css'

export interface SetlistsProps {
  setlists: Setlist[]
  tunes: Tune[]
  selectedId: string
  openSetlistId: string | null
  activeSetlistId: string | null
  playThrough: boolean
  styleOverrides: Record<string, string>
  styleNames: Record<string, string>
  onOpenSetlist: (id: string | null) => void
  onCreate: (name: string) => Setlist
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onSelectTune: (setlistId: string, tune: Tune) => void
  onMoveTune: (setlistId: string, from: number, to: number) => void
  onRemoveTune: (setlistId: string, index: number) => void
  onTogglePlayThrough: () => void
  onAddTune: (setlistId: string, tuneId: string) => void
}

export function Setlists(props: SetlistsProps) {
  const { setlists, tunes, openSetlistId, activeSetlistId } = props
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const tuneMap = useMemo(() => new Map(tunes.map((t) => [t.id, t])), [tunes])
  const openSetlist = setlists.find((s) => s.id === openSetlistId) ?? null

  if (openSetlist) {
    const items = openSetlist.tuneIds
      .map((id, rawIndex) => ({ tune: tuneMap.get(id), rawIndex }))
      .filter((entry): entry is { tune: Tune; rawIndex: number } => Boolean(entry.tune))

    return (
      <SetlistDetail
        setlist={openSetlist}
        items={items}
        selectedId={props.selectedId}
        activeSetlistId={activeSetlistId}
        playThrough={props.playThrough}
        styleOverrides={props.styleOverrides}
        styleNames={props.styleNames}
        onBack={() => props.onOpenSetlist(null)}
        onRename={props.onRename}
        onDelete={props.onDelete}
        onSelectTune={props.onSelectTune}
        onMoveTune={props.onMoveTune}
        onRemoveTune={props.onRemoveTune}
        onTogglePlayThrough={props.onTogglePlayThrough}
        onAddTune={props.onAddTune}
      />
    )
  }

  return (
    <>
      <div className="library-head">
        <h2 className="label">
          Setlists <span className="library-count">{setlists.length}</span>
        </h2>
        <span className="library-actions">
          <button type="button" className="library-import" onClick={() => setCreating(true)}>
            New setlist
          </button>
        </span>
      </div>

      {creating && (
        <form
          className="setlist-inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newName.trim()) return
            props.onCreate(newName)
            setNewName('')
            setCreating(false)
          }}
        >
          <input
            type="text"
            className="library-search"
            aria-label="Setlist name"
            placeholder="Setlist name"
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setCreating(false)
                setNewName('')
              }
            }}
          />
          <div className="setlist-inline-actions">
            <button type="submit" className="chip chip-primary" disabled={!newName.trim()}>
              Create
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                setCreating(false)
                setNewName('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="library-list">
        {setlists.map((setlist) => {
          const count = setlist.tuneIds.filter((id) => tuneMap.has(id)).length
          return (
            <li key={setlist.id}>
              <button
                type="button"
                className="tune"
                aria-current={setlist.id === activeSetlistId ? 'true' : undefined}
                onClick={() => props.onOpenSetlist(setlist.id)}
              >
                <span className="tune-title">{setlist.name}</span>
                <span className="tune-meta">
                  {count} {count === 1 ? 'tune' : 'tunes'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {setlists.length === 0 && !creating && <p className="library-more">No setlists yet.</p>}
    </>
  )
}
