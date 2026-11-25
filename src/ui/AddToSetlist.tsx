import { useMemo, useState } from 'react'
import type { Setlist } from '../music/setlist'
import type { Tune } from '../music/songs'
import { Popover } from './Popover'

interface AddToSetlistProps {
  tuneId: string
  tunes: Tune[]
  setlists: Setlist[]
  onAdd: (setlistId: string, tuneId: string) => void
  onCreateAndAdd: (name: string, tuneId: string) => void
}

export function AddToSetlist({ tuneId, tunes, setlists, onAdd, onCreateAndAdd }: AddToSetlistProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const tuneIds = useMemo(() => new Set(tunes.map((t) => t.id)), [tunes])

  return (
    <Popover
      id="add-to-setlist"
      className="share add-to-setlist"
      ariaLabel="Add to setlist"
      title="Add current tune to a setlist"
      label={
        <>
          <span className="topbar-long">Add to </span>setlist
        </>
      }
      onOpenChange={(open) => {
        if (!open) {
          setCreating(false)
          setName('')
        }
      }}
    >
      {(close) => (
        <div className="share-panel">
          {setlists.map((setlist) => {
            const has = setlist.tuneIds.includes(tuneId)
            const count = setlist.tuneIds.filter((id) => tuneIds.has(id)).length
            return (
              <button
                key={setlist.id}
                type="button"
                className="share-option"
                onClick={() => {
                  onAdd(setlist.id, tuneId)
                  close()
                }}
              >
                <span className="share-name">{setlist.name}</span>
                <span className="share-desc">
                  {has ? 'Already in setlist' : `${count} ${count === 1 ? 'tune' : 'tunes'}`}
                </span>
              </button>
            )
          })}

          {creating ? (
            <form
              className="setlist-popover-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (!name.trim()) return
                onCreateAndAdd(name, tuneId)
                setName('')
                setCreating(false)
                close()
              }}
            >
              <input
                type="text"
                className="library-search"
                aria-label="New setlist name"
                placeholder="Setlist name"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setCreating(false)
                    setName('')
                  }
                }}
              />
              <div className="setlist-inline-actions">
                <button type="submit" className="chip chip-primary" disabled={!name.trim()}>
                  Create &amp; add
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    setCreating(false)
                    setName('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="share-option" onClick={() => setCreating(true)}>
              <span className="share-name">New setlist…</span>
            </button>
          )}
        </div>
      )}
    </Popover>
  )
}
