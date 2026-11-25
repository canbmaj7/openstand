import { useEffect, useRef, useState } from 'react'
import { irealLink } from '../formats/irealWrite'
import { keyPrefersFlats, noteName } from '../music/chords'
import type { Setlist } from '../music/setlist'
import type { Tune } from '../music/songs'
import { getStyle } from '../styles'

export interface SetlistDetailProps {
  setlist: Setlist
  items: { tune: Tune; rawIndex: number }[]
  selectedId: string
  activeSetlistId: string | null
  playThrough: boolean
  styleOverrides: Record<string, string>
  styleNames: Record<string, string>
  onBack: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onSelectTune: (setlistId: string, tune: Tune) => void
  onMoveTune: (setlistId: string, from: number, to: number) => void
  onRemoveTune: (setlistId: string, index: number) => void
  onTogglePlayThrough: () => void
  onAddTune: (setlistId: string, tuneId: string) => void
}

export function SetlistDetail(props: SetlistDetailProps) {
  const { setlist, items, selectedId, activeSetlistId, playThrough, styleOverrides, styleNames } = props
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [linkState, setLinkState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copyTimerRef = useRef(0)

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), [])

  const activePos = activeSetlistId === setlist.id ? items.findIndex((item) => item.tune.id === selectedId) : -1

  const copyIreal = async () => {
    try {
      await navigator.clipboard.writeText(
        irealLink(
          items.map((item) => item.tune.chart),
          setlist.name,
        ),
      )
      setLinkState('copied')
    } catch {
      setLinkState('failed')
    }
    window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => setLinkState('idle'), 2200)
  }

  return (
    <>
      <div className="setlist-detail-head">
        <button type="button" className="library-import" aria-label="Back to setlists" onClick={props.onBack}>
          ← All
        </button>
        <span className="library-actions">
          <button
            type="button"
            className="library-import"
            onClick={() => {
              setRenameText(setlist.name)
              setRenaming(true)
              setConfirmDelete(false)
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="library-remove"
            onClick={() => {
              setConfirmDelete(true)
              setRenaming(false)
            }}
          >
            Delete
          </button>
        </span>
      </div>

      {confirmDelete && (
        <div className="setlist-confirm" role="alert">
          <span>Delete?</span>
          <button
            type="button"
            className="chip chip-danger"
            onClick={() => {
              props.onDelete(setlist.id)
              setConfirmDelete(false)
            }}
          >
            Yes
          </button>
          <button type="button" className="chip" onClick={() => setConfirmDelete(false)}>
            No
          </button>
        </div>
      )}

      {renaming ? (
        <form
          className="setlist-inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!renameText.trim()) return
            props.onRename(setlist.id, renameText)
            setRenaming(false)
          }}
        >
          <input
            type="text"
            className="library-search"
            aria-label="Rename setlist"
            value={renameText}
            autoFocus
            onChange={(e) => setRenameText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setRenaming(false)
            }}
          />
          <div className="setlist-inline-actions">
            <button type="submit" className="chip chip-primary" disabled={!renameText.trim()}>
              Save
            </button>
            <button type="button" className="chip" onClick={() => setRenaming(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="setlist-title-row">
          <h2 className="setlist-title">{setlist.name}</h2>
          <span className="setlist-progress">{activePos >= 0 ? `${activePos + 1}/${items.length}` : `${items.length}`}</span>
        </div>
      )}

      <div className="setlist-actions">
        <button type="button" className="chip" aria-pressed={playThrough} onClick={props.onTogglePlayThrough}>
          Play through
        </button>
        <button
          type="button"
          className="chip"
          disabled={setlist.tuneIds.includes(selectedId)}
          onClick={() => props.onAddTune(setlist.id, selectedId)}
        >
          Add this tune
        </button>
        <button type="button" className="chip" disabled={items.length === 0} onClick={() => void copyIreal()}>
          {linkState === 'copied' ? 'Link copied' : linkState === 'failed' ? 'Copy failed' : 'Copy iReal Pro link'}
        </button>
      </div>

      <ul className="library-list">
        {items.map((item, pos) => {
          const isActive = activeSetlistId === setlist.id && item.tune.id === selectedId
          const overrideName = styleNames[styleOverrides[item.tune.id]]
          const styleName = overrideName ?? item.tune.chart.sourceStyle ?? getStyle(item.tune.chart.style).name
          return (
            <li
              key={`${item.tune.id}-${item.rawIndex}`}
              className={isActive ? 'setlist-row setlist-row-active' : 'setlist-row'}
            >
              <button
                type="button"
                className="tune setlist-tune"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => props.onSelectTune(setlist.id, item.tune)}
              >
                <span className="tune-title">
                  <span className="setlist-num">{pos + 1}.</span> {item.tune.chart.title}
                </span>
                <span className="tune-meta">
                  {styleName} · {noteName(item.tune.chart.key, keyPrefersFlats(item.tune.chart.key))}
                  {item.tune.chart.minor ? '−' : ''}
                </span>
              </button>
              <div className="setlist-row-actions">
                <button
                  type="button"
                  className="setlist-move"
                  aria-label="Move up"
                  disabled={pos === 0}
                  onClick={() => props.onMoveTune(setlist.id, item.rawIndex, items[pos - 1].rawIndex)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="setlist-move"
                  aria-label="Move down"
                  disabled={pos === items.length - 1}
                  onClick={() => props.onMoveTune(setlist.id, item.rawIndex, items[pos + 1].rawIndex)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="setlist-move"
                  aria-label="Remove from setlist"
                  onClick={() => props.onRemoveTune(setlist.id, item.rawIndex)}
                >
                  ×
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {items.length === 0 && (
        <p className="library-more">No tunes in this setlist. Open a tune and use Add to setlist.</p>
      )}
    </>
  )
}
