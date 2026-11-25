import { useCallback, useMemo, useState } from 'react'
import { keyPrefersFlats, noteName } from '../music/chords'
import type { Tune } from '../music/songs'
import { parseTuneSort, sortTunes, tuneMatchesQuery, type TuneSort } from '../music/sortTunes'
import { getStyle } from '../styles'
import { Setlists, type SetlistsProps } from './Setlists'

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
  setlists: Omit<SetlistsProps, 'tunes' | 'selectedId' | 'styleOverrides' | 'styleNames'>
}

const ALL = ''
const BUILTIN_PLAYLISTS = new Set(['Examples', 'Exercises'])
const LIMIT = 250 // long playlists are filtered by search rather than scrolled
const SORT_KEY = 'openstand:tune-sort'

function loadTuneSort(): TuneSort {
  try {
    if (typeof localStorage === 'undefined') return 'title'
    return parseTuneSort(localStorage.getItem(SORT_KEY))
  } catch {
    return 'title'
  }
}

function saveTuneSort(sort: TuneSort): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SORT_KEY, sort)
  } catch {
    // Storage may be disabled in private browsing
  }
}

export function Library({ tunes, selectedId, styleOverrides, styleNames, onSelect, onImport, onNew, disabled, onRemovePlaylist, setlists }: LibraryProps) {
  const [tab, setTab] = useState<'tunes' | 'setlists'>('tunes')
  const [query, setQuery] = useState('')
  const [playlist, setPlaylist] = useState(ALL)
  const [sort, setSort] = useState<TuneSort>(loadTuneSort)
  const [confirming, setConfirming] = useState(false)

  const playlists = useMemo(() => [...new Set(tunes.map((t) => t.playlist ?? 'Tunes'))], [tunes])
  const activePlaylist = playlists.includes(playlist) ? playlist : ALL

  const styleNameOf = useCallback(
    (tune: Tune) => styleNames[styleOverrides[tune.id]] ?? tune.chart.sourceStyle ?? getStyle(tune.chart.style).name,
    [styleNames, styleOverrides],
  )

  const matches = useMemo(() => {
    const filtered = tunes
      .filter((t) => activePlaylist === ALL || t.playlist === activePlaylist)
      .filter((t) => tuneMatchesQuery(t, query, styleNameOf))
    return sortTunes(filtered, sort, styleNameOf)
  }, [tunes, query, activePlaylist, sort, styleNameOf])

  const canRemove = activePlaylist !== ALL && !BUILTIN_PLAYLISTS.has(activePlaylist)

  return (
    <nav className="library" aria-label="Tunes" inert={disabled}>
      <div className="library-tabs" role="tablist" aria-label="Library">
        <button
          type="button"
          role="tab"
          className="library-tab"
          aria-selected={tab === 'tunes'}
          onClick={() => setTab('tunes')}
        >
          Tunes
        </button>
        <button
          type="button"
          role="tab"
          className="library-tab"
          aria-selected={tab === 'setlists'}
          onClick={() => setTab('setlists')}
        >
          Setlists
        </button>
      </div>

      {tab === 'setlists' ? (
        <Setlists
          {...setlists}
          tunes={tunes}
          selectedId={selectedId}
          styleOverrides={styleOverrides}
          styleNames={styleNames}
        />
      ) : (
        <>
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
        placeholder="Search title, composer or style"
        aria-label="Search tunes"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <label className="library-filter">
        <span className="label">Sort</span>
        <select
          className="select"
          aria-label="Sort tunes"
          value={sort}
          onChange={(e) => {
            const next = parseTuneSort(e.target.value)
            setSort(next)
            saveTuneSort(next)
          }}
        >
          <option value="title">Title</option>
          <option value="composer">Composer</option>
          <option value="style">Style</option>
          <option value="key">Key</option>
        </select>
      </label>

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
          const styleName = styleNameOf(tune)
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
        </>
      )}
    </nav>
  )
}
