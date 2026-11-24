import { useMemo, useState } from 'react'
import { keyPrefersFlats, noteName } from '../music/chords'
import type { Tune } from '../music/songs'
import { getStyle } from '../styles'

interface LibraryProps {
  tunes: Tune[]
  selectedId: string
  styleOverrides: Record<string, string>
  styleNames: Record<string, string>
  onSelect: (id: string) => void
  onImport: () => void
  onNew: () => void
  disabled?: boolean // while a chart is being edited
  onRemovePlaylist: (playlist: string) => void
}

const ALL = ''
const LIMIT = 250 // long playlists are filtered by search rather than scrolled

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function Library({ tunes, selectedId, styleOverrides, styleNames, onSelect, onImport, onNew, disabled, onRemovePlaylist }: LibraryProps) {
  const [query, setQuery] = useState('')
  const [playlist, setPlaylist] = useState(ALL)
  const [confirming, setConfirming] = useState(false)

  const playlists = useMemo(() => [...new Set(tunes.map((t) => t.playlist ?? 'Tunes'))], [tunes])
  const activePlaylist = playlists.includes(playlist) ? playlist : ALL

  const matches = useMemo(() => {
    const q = fold(query.trim())
    return tunes
      .filter((t) => activePlaylist === ALL || t.playlist === activePlaylist)
      .filter((t) => !q || fold(`${t.chart.title} ${t.chart.composer ?? ''}`).includes(q))
      .sort((a, b) => a.chart.title.localeCompare(b.chart.title))
  }, [tunes, query, activePlaylist])

  const canRemove = activePlaylist !== ALL && activePlaylist !== 'Examples'

  return (
    <nav className="library" aria-label="Tunes" inert={disabled}>
      <div className="library-head">
        <h2 className="label">
          Tunes <span className="library-count">{matches.length}</span>
        </h2>
        <span className="library-actions">
          <button className="library-import" onClick={onNew}>
            New
          </button>
          <button className="library-import" onClick={onImport}>
            Import
          </button>
        </span>
      </div>

      <input
        className="library-search"
        type="search"
        placeholder="Search title or composer"
        aria-label="Search tunes"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {playlists.length > 1 && (
        <div className="library-filter">
          <select
            className="select"
            aria-label="Playlist"
            value={activePlaylist}
            onChange={(e) => {
              setPlaylist(e.target.value)
              setConfirming(false)
            }}
          >
            <option value={ALL}>All playlists</option>
            {playlists.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {canRemove && (
            <button
              className={confirming ? 'library-remove library-remove-confirm' : 'library-remove'}
              onClick={() => {
                if (!confirming) return setConfirming(true)
                onRemovePlaylist(activePlaylist)
                setPlaylist(ALL)
                setConfirming(false)
              }}
              onBlur={() => setConfirming(false)}
            >
              {confirming ? 'Remove?' : 'Remove'}
            </button>
          )}
        </div>
      )}

      <ul className="library-list">
        {matches.slice(0, LIMIT).map((tune) => {
          const overrideName = styleNames[styleOverrides[tune.id]]
          const styleName = overrideName ?? tune.chart.sourceStyle ?? getStyle(tune.chart.style).name
          return (
            <li key={tune.id}>
              <button
                className="tune"
                aria-current={tune.id === selectedId ? 'true' : undefined}
                onClick={() => onSelect(tune.id)}
              >
                <span className="tune-title">{tune.chart.title}</span>
                <span className="tune-meta">
                  {tune.chart.composer ? `${tune.chart.composer} · ` : ''}
                  {styleName} · {noteName(tune.chart.key, keyPrefersFlats(tune.chart.key))}
                  {tune.chart.minor ? '−' : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {matches.length > LIMIT && (
        <p className="library-more">{matches.length - LIMIT} more. Search to narrow the list.</p>
      )}
      {matches.length === 0 && <p className="library-more">No tunes match.</p>}
    </nav>
  )
}
