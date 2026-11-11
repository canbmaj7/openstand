import { useCallback, useEffect, useRef, useState } from 'react'
import { Player } from './audio/player'
import { arrange, BASE_BPM, CHANNELS, type Part } from './engine/arrange'
import { warmUpMidi } from './engine/warmup'
import { chorusTranspose, type Timeline } from './engine/timeline'
import { parseIrealLinks } from './formats/ireal'
import { irealLink } from './formats/irealWrite'
import { reportError } from './errorReports'
import { chartFromHash, labFromHash, shareUrl, styleShareUrl } from './formats/share'
import { addTunes, loadTunes, removePlaylist, removeTune, saveTune } from './library/db'
import { loadMyStyles, myStyleId, removeMyStyle, saveMyStyle } from './library/myStyles'
import type { Chart as ChartData } from './music/chart'
import { keyPrefersFlats, noteName } from './music/chords'
import { emptyChart } from './music/edit'
import { EXAMPLES, type Tune } from './music/songs'
import { getStyle, STYLES, type StyleDefinition } from './styles'
import { labFromStyle, styleFromLab, styleSource, labId, STEPS_PER_BEAT, type LabStyle } from './styles/lab'
import { Chart } from './ui/Chart'
import { Editor, EditorHeader } from './ui/Editor'
import { ImportDialog, type ImportResult } from './ui/ImportDialog'
import { Library } from './ui/Library'
import { Mixer } from './ui/Mixer'
import { Popover } from './ui/Popover'
import { NO_PRACTICE, type PracticeSettings } from './music/practice'
import { Practice } from './ui/Practice'
import { StyleLab } from './ui/StyleLab'
import { Transport, type Readiness } from './ui/Transport'
import { handlePracticeShortcut, type PracticeShortcuts } from './ui/shortcuts'

interface Position {
  measure: number // -1 during the count-in and the ending
  chorus: number
  beatInBar: number
  countIn: number // 1, 2, 3… during the count-in, otherwise 0
  ending: boolean
  barBeats: number
  barNumber: number // bars played since the start, -1 during the count-in
}

interface ArrangeOptions {
  styleId: string
  transpose: number
  choruses: number
  practice: PracticeSettings
}

// The chart being edited, and the saved tune it came from (none for a new chart)
interface Draft {
  chart: ChartData
  from: Tune | null
}

const BPM_RANGE: [number, number] = [40, 300]
const MAX_CHORUSES = 24
const clampBpm = (v: number) => Math.max(BPM_RANGE[0], Math.min(BPM_RANGE[1], v))

// Keeps the transposition within -5..+6 so the band's register doesn't drift
const offsetToKey = (from: number, to: number) => ((to - from + 17) % 12) - 5

// The comp instrument is named after the style's General MIDI program
const LAST_TUNE = 'openstand:last-tune'

// The style being made in the style lab is kept in the browser between visits
const LAB_KEY = 'openstand:style-lab'
const MASTER_KEY = 'openstand:master-volume'
const LATENCY_KEY = 'openstand:latency-offset'
const LAB_STYLE = 'lab' // style id used while the lab is open

function loadLab(): LabStyle | null {
  try {
    const saved = localStorage.getItem(LAB_KEY)
    return saved ? (JSON.parse(saved) as LabStyle) : null
  } catch {
    return null
  }
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

const noteNameFor = (pc: number) => noteName(pc, keyPrefersFlats(pc)).replace('b', '♭').replace('#', '♯')

const compLabel = (program: number) => (program >= 24 && program <= 31 ? 'Guitar' : 'Piano')

function positionAt(timeline: Timeline, beat: number): Position | null {
  if (beat < timeline.countIn) {
    const barBeats = timeline.countIn
    return { measure: -1, chorus: 0, beatInBar: beat, countIn: timeline.clicks.findLast((c) => c.at <= beat + 1e-6)?.count ?? 1, ending: false, barBeats, barNumber: -1 }
  }
  const barNumber = timeline.bars.findLastIndex((b) => b.start <= beat)
  const bar = timeline.bars[barNumber]
  if (!bar) return null
  const chorus = timeline.slots.findLast((s) => s.start <= beat)?.chorus ?? 0
  return {
    measure: bar.measure,
    chorus,
    beatInBar: beat - bar.start,
    countIn: 0,
    ending: bar.measure === -1,
    barBeats: bar.beats,
    barNumber,
  }
}

export default function App() {
  const playerRef = useRef<Player | null>(null)
  const timelineRef = useRef<Timeline | null>(null)

  const [readiness, setReadiness] = useState<Readiness>({ kind: 'loading', progress: 0 })
  const [tunes, setTunes] = useState<Tune[]>(EXAMPLES)
  const [songId, setSongId] = useState(EXAMPLES[0].id)
  const [styleId, setStyleId] = useState(EXAMPLES[0].chart.style)
  const styleRef = useRef(styleId)
  const [lab, setLabState] = useState<LabStyle | null>(null)
  const labRef = useRef<LabStyle | null>(null)
  const [labUndo, setLabUndo] = useState<LabStyle | null>(null)
  const [labCopy, setLabCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [labShare, setLabShare] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [labSaved, setLabSaved] = useState<'idle' | 'saved'>('idle')
  const [myStyles, setMyStylesState] = useState<LabStyle[]>(loadMyStyles)
  const myStylesRef = useRef(myStyles)
  const openSharedStyleRef = useRef<(lab: LabStyle) => void>(() => {})
  const setMyStyles = (next: LabStyle[]) => {
    myStylesRef.current = next
    setMyStylesState(next)
  }
  useEffect(() => {
    styleRef.current = styleId
  }, [styleId])
  const [transpose, setTranspose] = useState(0)
  const [bpm, setBpm] = useState(EXAMPLES[0].chart.bpm)
  const [importOpen, setImportOpen] = useState(false)
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [choruses, setChoruses] = useState(3)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const [volumes, setVolumes] = useState<Record<Part, number>>({ bass: 110, comp: 85, drums: 95 })
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [muted, setMuted] = useState<Record<Part, boolean>>({ bass: false, comp: false, drums: false })
  // The master volume is kept in the browser: it depends on the speakers, not the tune
  const [master, setMaster] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(MASTER_KEY))
      return Number.isFinite(saved) && saved > 0 && saved <= 127 ? saved : 100
    } catch {
      return 100
    }
  })
  const [masterMuted, setMasterMuted] = useState(false)
  const [latencyOffset, setLatencyOffset] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(LATENCY_KEY))
      return Number.isFinite(saved) && saved >= -300 && saved <= 300 ? saved : 0
    } catch {
      return 0
    }
  })
  const [notice, setNotice] = useState<string | null>(null)
  const outputLevel = useCallback(() => playerRef.current?.level() ?? { peak: -100, rms: -100 }, [])
  const [practice, setPractice] = useState<PracticeSettings>(NO_PRACTICE)
  const [picking, setPicking] = useState<null | 'first' | { from: number }>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editBar, setEditBar] = useState(0)
  const [irealState, setIrealState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const tune = tunes.find((t) => t.id === songId) ?? tunes[0] ?? EXAMPLES[0]
  const chart = draft?.chart ?? tune.chart
  // The lab's style is rebuilt from the grid each time it is needed
  // Saved styles are chosen as "my:<id>"
  const styleFor = (id: string, current: LabStyle | null, mine: LabStyle[]): StyleDefinition => {
    if (id === LAB_STYLE && current) return { ...styleFromLab(current), id }
    const saved = id.startsWith('my:') ? mine.find((m) => myStyleId(m) === id) : undefined
    return saved ? { ...styleFromLab(saved), id } : getStyle(id)
  }
  const resolveStyle = (id: string) => styleFor(id, labRef.current, myStylesRef.current)
  const style = draft ? getStyle(draft.chart.style) : styleFor(styleId, lab, myStyles)
  const keyPc = (chart.key + transpose + 12) % 12

  // During practice the chorus decides the key on the stand and the tempo
  const chorus = position ? Math.min(position.chorus, choruses - 1) : 0
  const shownTranspose = playing ? chorusTranspose(transpose, practice.keyStep, chorus) : transpose
  const liveBpm = clampBpm(bpm + practice.ramp * (playing ? chorus : 0))

  useEffect(() => {
    // The effect may run twice (StrictMode); a discarded player must not update the UI
    let active = true
    const player = new Player()
    playerRef.current = player
    player.onEnded = () => {
      setPlaying(false)
      setPosition(null)
    }
    player
      .init((progress) => active && setReadiness({ kind: 'loading', progress }))
      .then(() => {
        if (!active) return
        setReadiness({ kind: 'ready' })
        // Decode the sounds in the background, the style on screen first
        const first = getStyle(styleRef.current)
        void player.warmUp([first, ...STYLES.filter((s) => s !== first)].map(warmUpMidi))
      })
      .catch((err: unknown) => {
        if (!active) return
        setReadiness({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
        if (player.supported) reportError(err, 'sound bank')
      })
    return () => {
      active = false
      void player.dispose()
    }
  }, [])

  useEffect(() => {
    const player = playerRef.current
    if (!player || readiness.kind !== 'ready') return
    for (const part of Object.keys(CHANNELS) as Part[]) {
      player.setVolume(CHANNELS[part], muted[part] ? 0 : volumes[part])
    }
  }, [volumes, muted, readiness.kind])

  useEffect(() => {
    try {
      localStorage.setItem(MASTER_KEY, String(master))
    } catch {
      // Storage may be disabled in private browsing
    }
    playerRef.current?.setMasterVolume(masterMuted ? 0 : master)
  }, [master, masterMuted, readiness.kind])

  useEffect(() => {
    try {
      localStorage.setItem(LATENCY_KEY, String(latencyOffset))
    } catch {
      // Storage may be disabled in private browsing
    }
    playerRef.current?.setLatencyOffset(latencyOffset)
  }, [latencyOffset, readiness.kind])

  // Tempo changes only the playback rate; the arrangement is not regenerated
  useEffect(() => {
    playerRef.current?.setRate(liveBpm / BASE_BPM)
  }, [liveBpm])

  const start = async (opts: ArrangeOptions, fromSeconds = 0) => {
    const player = playerRef.current
    if (!player) return
    setNotice(null)
    const { loop, keyStep } = opts.practice
    const { midi, timeline } = arrange(chart, resolveStyle(opts.styleId), opts.transpose, opts.choruses, { loop, keyStep })
    timelineRef.current = timeline
    try {
      await player.play(midi, fromSeconds)
      player.setRate(liveBpm / BASE_BPM)
      setPlaying(true)
    } catch (err) {
      setPlaying(false)
      setPosition(null)
      setNotice(err instanceof Error ? err.message : "Couldn't start the audio. Check your sound output and try Play again.")
    }
  }

  const stop = useCallback(() => {
    playerRef.current?.stop()
    setPlaying(false)
    setPosition(null)
  }, [])

  // Changing style, key or choruses while playing continues from the same spot with a new arrangement;
  // a new loop starts over
  const changeArrangement = (patch: Partial<ArrangeOptions>) => {
    const next = { styleId, transpose, choruses, practice, ...patch }
    setStyleId(next.styleId)
    setTranspose(next.transpose)
    setChoruses(next.choruses)
    setPractice(next.practice)
    const player = playerRef.current
    const loopChanged = String(next.practice.loop) !== String(practice.loop)
    if (playing && player) void start(next, loopChanged ? 0 : player.position)
  }

  const changePractice = (next: PracticeSettings) => {
    // Going round the keys needs enough choruses to get back home
    const keysNeeded = next.keyStep ? 12 / gcd(next.keyStep, 12) : 0
    const nextChoruses = next.keyStep !== practice.keyStep && choruses < keysNeeded ? keysNeeded : choruses
    changeArrangement({ practice: next, choruses: nextChoruses })
  }

  const toggle = () => (playing ? stop() : void start({ styleId, transpose, choruses, practice }))
  const shortcuts: PracticeShortcuts = {
    toggle: () => {
      if (readiness.kind === 'ready') toggle()
    },
    tempo: (delta) => setBpm((current) => clampBpm(current + delta)),
    transpose: (delta) => changeArrangement({ transpose: offsetToKey(chart.key, (keyPc + delta + 12) % 12) }),
    clearLoop: () => {
      setPicking(null)
      if (practice.loop) changePractice({ ...practice, loop: null })
    },
  }
  const shortcutsRef = useRef(shortcuts)
  useEffect(() => {
    shortcutsRef.current = shortcuts
  })

  // The registered listener uses the latest arrangement without accumulating handlers.
  const editing = draft !== null
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPicking(null)
      handlePracticeShortcut(e, editing, shortcutsRef.current)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing])

  // Follow the audio clock to highlight the current bar
  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = () => {
      const player = playerRef.current
      const timeline = timelineRef.current
      if (player && timeline) setPosition(positionAt(timeline, (player.heardPosition * BASE_BPM) / 60))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  const showTune = useCallback((next: Tune) => {
    playerRef.current?.stop()
    setPlaying(false)
    setPosition(null)
    setSongId(next.id)
    setStyleId(labRef.current ? LAB_STYLE : next.chart.style)
    setTranspose(0)
    setBpm(next.chart.bpm)
    setPractice((p) => ({ ...p, loop: null }))
    setPicking(null)
    setLibraryOpen(false)
    try {
      localStorage.setItem(LAST_TUNE, next.id)
    } catch {
      // Storage may be disabled in private browsing
    }
  }, [])

  const selectSong = (id: string) => {
    const next = tunes.find((t) => t.id === id)
    if (next) showTune(next)
  }

  // Load the saved library, then open a shared tune from the URL or the last tune played
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const saved = await loadTunes()
      let all = [...EXAMPLES, ...saved]
      const shared = await chartFromHash(window.location.hash)
      const sharedStyle = await labFromHash(window.location.hash)
      if (sharedStyle) openSharedStyleRef.current(sharedStyle)
      let open: Tune | undefined
      if (shared) {
        const [added] = await addTunes([shared], 'link', 'Shared with me', setNotice)
        all = [...all.filter((t) => t.id !== added.id), added]
        open = added
        history.replaceState(null, '', window.location.pathname)
      } else {
        try {
          open = all.find((t) => t.id === localStorage.getItem(LAST_TUNE))
        } catch {
          open = undefined
        }
      }
      if (cancelled) return
      setTunes(all)
      if (open) showTune(open)
    })()
    return () => {
      cancelled = true
    }
  }, [showTune])

  // A share link opened while the app is already open only changes the URL fragment
  useEffect(() => {
    const onHash = async () => {
      // A style link may carry a tune too; read both before the fragment is cleared
      const sharedStyle = await labFromHash(window.location.hash)
      const shared = await chartFromHash(window.location.hash)
      if (sharedStyle) openSharedStyleRef.current(sharedStyle)
      if (!shared) return
      const [added] = await addTunes([shared], 'link', 'Shared with me', setNotice)
      setTunes((all) => [...all.filter((t) => t.id !== added.id), added])
      showTune(added)
      history.replaceState(null, '', window.location.pathname)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [showTune])

  const importText = useCallback(
    async (text: string): Promise<ImportResult> => {
      const lists = parseIrealLinks(text)
      const added: Tune[] = []
      for (const list of lists) added.push(...(await addTunes(list.charts, 'import', list.name, setNotice)))
      if (added.length) {
        const ids = new Set(added.map((t) => t.id))
        setTunes((all) => [...all.filter((t) => !ids.has(t.id)), ...added])
        showTune(added[0])
      }
      return { tunes: added.length, playlists: [...new Set(lists.filter((l) => l.charts.length).map((l) => l.name))] }
    },
    [showTune],
  )

  // Pasting an iReal Pro link anywhere outside a text field imports it
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea')) return
      const text = e.clipboardData?.getData('text') ?? ''
      if (!/irealb(ook)?:\/\//.test(text)) return
      e.preventDefault()
      void importText(text)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [importText])

  const copy = async (text: () => Promise<string> | string, set: (s: 'idle' | 'copied' | 'failed') => void) => {
    try {
      await navigator.clipboard.writeText(await text())
      set('copied')
    } catch {
      set('failed')
    }
    setTimeout(() => set('idle'), 2200)
  }

  // ---- Style lab ----

  const labTimer = useRef(0)
  const rearrangeRef = useRef(() => {})
  useEffect(() => {
    rearrangeRef.current = () => changeArrangement({})
  })

  const setLab = (next: LabStyle) => {
    labRef.current = next
    setLabState(next)
    try {
      localStorage.setItem(LAB_KEY, JSON.stringify(next))
    } catch {
      // Storage may be disabled in private browsing
    }
    // While playing, the change is heard from the same spot; quick clicks are gathered into one update
    window.clearTimeout(labTimer.current)
    labTimer.current = window.setTimeout(() => rearrangeRef.current(), 120)
  }

  const openLab = () => {
    setLibraryOpen(false)
    setLab(loadLab() ?? labFromStyle(getStyle(styleId)))
    setStyleId(LAB_STYLE)
  }

  function closeLab() {
    const current = labRef.current
    if (!current) return
    window.clearTimeout(labTimer.current)
    labRef.current = null
    setLabState(null)
    setLabUndo(null)
    changeArrangement({ styleId: current.base })
  }

  // A style link: the style is saved to My styles and opened in the lab
  useEffect(() => {
    openSharedStyleRef.current = (shared: LabStyle) => {
      setMyStyles(saveMyStyle(myStylesRef.current, shared))
      setLabUndo(null)
      setLab(shared)
      setStyleId(LAB_STYLE)
      history.replaceState(null, '', window.location.pathname)
    }
  })

  const labStep = (() => {
    if (!lab || !position || position.countIn || position.ending) return null
    const groovebar = position.barNumber - (lab.fills ? 1 : 0)
    if (groovebar < 0) return null
    return Math.floor(((groovebar % lab.bars) * lab.beats + position.beatInBar) * STEPS_PER_BEAT)
  })()

  // Copies the style as a file and opens GitHub's new-file page in the style folder.
  // The clipboard is written before the new tab takes the focus.
  const sendLab = () => {
    if (!lab) return
    const written = navigator.clipboard.writeText(styleSource(styleFromLab(lab), getStyle(lab.base).name))
    const file = `src/styles/library/${labId(lab)}.ts`
    window.open(`https://github.com/canbmaj7/openstand/new/main?filename=${encodeURIComponent(file)}`, '_blank', 'noopener')
    written.then(
      () => setLabCopy('copied'),
      () => setLabCopy('failed'),
    )
    setTimeout(() => setLabCopy('idle'), 2200)
  }

  // ---- Editing ----

  const startEditing = (from: Tune | null) => {
    stop()
    closeLab()
    setPicking(null)
    setLibraryOpen(false)
    setDraft({ chart: from ? from.chart : emptyChart(), from })
    setEditBar(0)
  }

  const saveDraft = async () => {
    if (!draft) return
    const chart = { ...draft.chart, title: draft.chart.title.trim() || 'Untitled' }
    let saved: Tune
    if (draft.from && draft.from.source !== 'example') {
      saved = { ...draft.from, chart }
      await saveTune(saved, setNotice)
    } else {
      ;[saved] = await addTunes([chart], 'own', 'My tunes', setNotice)
    }
    setTunes((all) => [...all.filter((t) => t.id !== saved.id), saved])
    setDraft(null)
    showTune(saved)
  }

  const deleteDraftTune = async () => {
    if (!draft?.from) return
    await removeTune(draft.from.id)
    setTunes((all) => all.filter((t) => t.id !== draft.from?.id))
    setDraft(null)
    showTune(EXAMPLES[0])
  }

  // ---- Loop picking: tap the first bar, then the last ----

  const pickBar = (index: number) => {
    if (picking === 'first') setPicking({ from: index })
    else if (picking) {
      setPicking(null)
      const from = picking.from
      changePractice({ ...practice, loop: [Math.min(from, index), Math.max(from, index)] })
    }
  }

  const loopLabel = practice.loop
    ? practice.loop[0] === practice.loop[1]
      ? `Bar ${practice.loop[0] + 1}`
      : `Bars ${practice.loop[0] + 1}–${practice.loop[1] + 1}`
    : null

  const readout = (() => {
    if (picking) return picking === 'first' ? 'Tap the first bar of the loop' : 'Now tap the last bar'
    const extras = [
      practice.keyStep && position && !position.countIn ? `in\u00a0${noteNameFor((chart.key + shownTranspose + 12) % 12)}` : '',
      practice.ramp && position ? `${liveBpm}\u00a0bpm` : '',
    ]
      .filter(Boolean)
      .join('  ')
    if (!position) return `${loopLabel ?? `${chart.bars.filter((b) => !b.spacer).length} bars`} × ${choruses}`
    if (position.countIn) return `Count-in  ${position.countIn}`
    if (position.ending) return 'Ending'
    // Non-breaking spaces keep each part on one line when the readout wraps on phones
    return `Chorus\u00a0${position.chorus + 1}/${choruses}  Bar\u00a0${position.measure + 1}${extras ? `  ${extras}` : ''}`
  })()

  return (
    <div className="app">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="OpenStand home">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M6 4h20l-2 11H8z" />
            <path d="M5 15h22" />
            <path d="M16 15v12M16 27l-6 3M16 27l6 3" />
          </svg>
          OpenStand
        </a>
        <span className="topbar-tag">Practice with a band in your browser</span>
        <span className="topbar-spacer" />
        {!editing && (
          <>
            <button
              className="topbar-button topbar-lab"
              aria-pressed={!!lab}
              onClick={() => (lab ? closeLab() : openLab())}
              title="Make your own style: edit the drums, bass and chords and hear them as you go"
            >
              <span className="topbar-long">Style </span>lab
            </button>
            <button className="topbar-button" onClick={() => startEditing(tune)} title="Edit this chart">
              Edit
            </button>
            <Popover id="share" className="share" label="Share">
              {() => (
                <div className="share-panel">
                  <button className="share-option" onClick={() => void copy(() => shareUrl(chart), setShareState)}>
                    <span className="share-name">
                      {shareState === 'copied' ? 'Link copied' : shareState === 'failed' ? 'Copy failed' : 'Copy OpenStand link'}
                    </span>
                    <span className="share-desc">Opens this chart in OpenStand. Nothing is uploaded.</span>
                  </button>
                  <button className="share-option" onClick={() => void copy(() => irealLink([chart]), setIrealState)}>
                    <span className="share-name">
                      {irealState === 'copied' ? 'Link copied' : irealState === 'failed' ? 'Copy failed' : 'Copy iReal Pro link'}
                    </span>
                    <span className="share-desc">An irealb:// link that opens in iReal Pro.</span>
                  </button>
                </div>
              )}
            </Popover>
          </>
        )}
        <button className="tunes-toggle" aria-expanded={libraryOpen} onClick={() => setLibraryOpen(!libraryOpen)}>
          Tunes
        </button>
        <a className="topbar-link" href="https://github.com/canbmaj7/openstand" target="_blank" rel="noreferrer">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span className="topbar-link-text">GitHub</span>
        </a>
      </header>

      <div className={libraryOpen ? 'workspace library-open' : 'workspace'}>
        <Library
          tunes={tunes}
          selectedId={tune.id}
          onSelect={selectSong}
          onImport={() => setImportOpen(true)}
          onNew={() => startEditing(null)}
          disabled={editing}
          onRemovePlaylist={(name) => {
            void removePlaylist(name)
            setTunes((all) => all.filter((t) => t.source === 'example' || t.playlist !== name))
          }}
        />

        <main
          className={['stage', editing && 'stage-editing', picking && 'stage-picking'].filter(Boolean).join(' ')}
          onClick={() => setLibraryOpen(false)}
        >
          <Chart
            chart={chart}
            style={style}
            transpose={draft ? 0 : shownTranspose}
            activeMeasure={position && position.measure >= 0 ? position.measure : null}
            beatInBar={position?.beatInBar ?? 0}
            barBeats={position?.barBeats ?? 4}
            range={picking && picking !== 'first' ? [picking.from, picking.from] : draft ? null : practice.loop}
            selectedBar={draft ? editBar : null}
            onBarClick={draft ? setEditBar : picking ? pickBar : undefined}
            header={draft ? <EditorHeader chart={draft.chart} onChange={(c) => setDraft({ ...draft, chart: c })} /> : undefined}
          />
        </main>
      </div>

      {draft ? (
        <Editor
          chart={draft.chart}
          onChange={(c) => setDraft({ ...draft, chart: c })}
          selected={editBar}
          onSelect={setEditBar}
          saveLabel={draft.from && draft.from.source !== 'example' ? 'Save' : 'Save to My tunes'}
          canDelete={!!draft.from && draft.from.source !== 'example'}
          onSave={() => void saveDraft()}
          onCancel={() => setDraft(null)}
          onDelete={() => void deleteDraftTune()}
        />
      ) : (
      <>
      {lab && (
        <StyleLab
          lab={lab}
          onChange={(next) => {
            setLab(next)
            setLabUndo(null)
          }}
          onStartFrom={(id) => {
            setLabUndo(lab)
            const saved = myStyles.find((m) => myStyleId(m) === id)
            setLab(saved ?? labFromStyle(getStyle(id)))
          }}
          myStyles={myStyles.map((m) => ({ id: myStyleId(m), name: m.name }))}
          isSaved={myStyles.some((m) => myStyleId(m) === myStyleId(lab))}
          onSave={() => {
            setMyStyles(saveMyStyle(myStyles, lab))
            setLabSaved('saved')
            setTimeout(() => setLabSaved('idle'), 2200)
          }}
          saveState={labSaved}
          onShare={() => void copy(() => styleShareUrl(lab, chart), setLabShare)}
          shareState={labShare}
          onDelete={() => {
            const id = myStyleId(lab)
            setMyStyles(removeMyStyle(myStyles, id))
            if (styleId === id) changeArrangement({ styleId: LAB_STYLE })
          }}
          canUndo={labUndo !== null}
          onUndo={() => {
            if (labUndo) setLab(labUndo)
            setLabUndo(null)
          }}
          step={playing ? labStep : null}
          onCopy={() => void copy(() => styleSource(styleFromLab(lab), getStyle(lab.base).name), setLabCopy)}
          copyState={labCopy}
          onSend={sendLab}
          onClose={closeLab}
        />
      )}
      <Transport
        readiness={readiness}
        playing={playing}
        onToggle={toggle}
        position={readout}
        notice={notice}
        styleId={styleId}
        extraStyles={[
          ...(lab ? [{ id: LAB_STYLE, name: `${lab.name.trim() || 'My style'} (style lab)` }] : []),
          ...myStyles.map((m) => ({ id: myStyleId(m), name: m.name })),
        ]}
        onStyle={(id) => {
          setBpm(resolveStyle(id).tempo.default)
          changeArrangement({ styleId: id })
        }}
        keyPc={keyPc}
        onKey={(pc) => changeArrangement({ transpose: offsetToKey(chart.key, pc) })}
        bpm={bpm}
        bpmRange={BPM_RANGE}
        onBpm={setBpm}
        choruses={choruses}
        maxChoruses={MAX_CHORUSES}
        onChoruses={(n) => changeArrangement({ choruses: n })}
      >
        <Practice chart={chart} settings={practice} onChange={changePractice} onPickLoop={() => setPicking('first')} />
        <Mixer
          labels={{ bass: 'Bass', comp: compLabel(style.comp.program), drums: 'Drums' }}
          volumes={volumes}
          muted={muted}
          onVolume={(part, v) => setVolumes((all) => ({ ...all, [part]: v }))}
          onMute={(part) => setMuted((all) => ({ ...all, [part]: !all[part] }))}
          master={master}
          masterMuted={masterMuted}
          onMaster={setMaster}
          onMasterMute={() => setMasterMuted((m) => !m)}
          sync={latencyOffset}
          onSync={setLatencyOffset}
          level={outputLevel}
        />
      </Transport>
      </>
      )}

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={importText} />
    </div>
  )
}
