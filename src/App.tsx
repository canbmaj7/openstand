import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Player } from './audio/player'
import { arrange, BASE_BPM, CHANNELS, type Part } from './engine/arrange'
import { warmUpMidi } from './engine/warmup'
import { chorusTranspose, slotAtBeat, type Timeline } from './engine/timeline'
import { parseChartFile } from './formats/chartFile'
import { parseIrealLinks } from './formats/ireal'
import { irealLink } from './formats/irealWrite'
import { reportError } from './errorReports'
import { chartFromHash, labFromHash, shareUrl, styleShareUrl } from './formats/share'
import { addTunes, loadTunes, removePlaylist, removeTune, saveTune } from './library/db'
import { loadMyStyles, myStyleId, removeMyStyle, saveMyStyle } from './library/myStyles'
import type { Chart as ChartData } from './music/chart'
import { keyPrefersFlats, noteName, parseChord, transposeChord, type Chord } from './music/chords'
import { emptyChart } from './music/edit'
import { CHORD_FONT_KEY, loadChordFont, type ChordFont } from './music/chordText'
import { isInstrumentId, viewOffset, type InstrumentId } from './music/instrument'
import { EXAMPLES, type Tune } from './music/songs'
import { getStyle, STYLES, type StyleDefinition } from './styles'
import { labFromStyle, styleFromLab, styleSource, labId, STEPS_PER_BEAT, type LabStyle } from './styles/lab'
import { loadSounds, saveSounds, withSounds, type SoundChoice } from './styles/sounds'
import { Chart } from './ui/Chart'
import { ChordHelper } from './ui/ChordHelper'
import { downloadChartFile, downloadChordPro, downloadMidi } from './ui/download'
import { Editor, EditorHeader } from './ui/Editor'
import { ImportDialog, type ImportResult } from './ui/ImportDialog'
import { Library } from './ui/Library'
import { Mixer } from './ui/Mixer'
import { Popover } from './ui/Popover'
import { NO_PRACTICE, startBeatFor, type PracticeSettings } from './music/practice'
import { Practice } from './ui/Practice'
import { StyleLab } from './ui/StyleLab'
import { switchMode } from './music/mode'
import { Transport, type ModeOption, type Readiness } from './ui/Transport'
import { handlePracticeShortcut, type PracticeShortcuts } from './ui/shortcuts'

interface Position {
  measure: number // -1 during the count-in and the ending
  chorus: number
  beatInBar: number
  countIn: number // 1, 2, 3… during the count-in, otherwise 0
  ending: boolean
  barBeats: number
  barNumber: number // bars played since the start, -1 during the count-in
  sub?: boolean
  slotChord?: Chord
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

const MASTER_KEY = 'openstand:master-volume'
const LATENCY_KEY = 'openstand:latency-offset'
const INSTRUMENT_KEY = 'openstand:instrument'
const TUNE_STYLES_KEY = 'openstand:tune-styles'
const LAB_STYLE = 'lab' // style id used while the lab is open

function loadTuneStyles(): Record<string, string> {
  try {
    const saved = JSON.parse(localStorage.getItem(TUNE_STYLES_KEY) ?? '{}') as unknown
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {}
    return Object.fromEntries(Object.entries(saved).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  } catch {
    return {}
  }
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

const noteNameFor = (pc: number) => noteName(pc, keyPrefersFlats(pc)).replace('b', '♭').replace('#', '♯')

const compLabel = (program: number) => (program >= 24 && program <= 31 ? 'Guitar' : 'Piano')

function firstChord(chart: ChartData, transpose: number): Chord {
  for (const bar of chart.bars) {
    for (const c of bar.chords) {
      const parsed = c.symbol ? parseChord(c.symbol) : null
      if (parsed) return transposeChord(parsed, transpose)
    }
  }
  return transposeChord(parseChord('C')!, transpose)
}

function playingChord(chart: ChartData, position: Position | null, transpose: number): Chord | null {
  if (!position || position.countIn > 0) return null
  if (position.ending) return firstChord(chart, transpose)
  const bar = chart.bars[position.measure]
  if (!bar) return null
  if (bar.chords.length > 0) {
    let at = 0
    for (const c of bar.chords) {
      at += c.beats
      if (position.beatInBar < at || c === bar.chords[bar.chords.length - 1]) {
        const parsed = c.symbol ? parseChord(c.symbol) : null
        return parsed ? transposeChord(parsed, transpose) : null
      }
    }
  }
  const held = chart.bars
    .slice(0, position.measure)
    .flatMap((b) => b.chords)
    .findLast((c) => c.symbol)?.symbol
  const parsed = held ? parseChord(held) : null
  return parsed ? transposeChord(parsed, transpose) : null
}

function positionAt(timeline: Timeline, beat: number): Position | null {
  if (beat < timeline.countIn) {
    const barBeats = timeline.countIn
    return { measure: -1, chorus: 0, beatInBar: beat, countIn: timeline.clicks.findLast((c) => c.at <= beat + 1e-6)?.count ?? 1, ending: false, barBeats, barNumber: -1 }
  }
  const barNumber = timeline.bars.findLastIndex((b) => b.start <= beat)
  const bar = timeline.bars[barNumber]
  if (!bar) return null
  const slot = slotAtBeat(timeline, beat)
  const activeSlot = slot && beat >= slot.start && beat < slot.start + slot.beats ? slot : undefined
  const chorus = activeSlot?.chorus ?? timeline.slots.findLast((s) => s.start <= beat)?.chorus ?? 0
  return {
    measure: bar.measure,
    chorus,
    beatInBar: beat - bar.start,
    countIn: 0,
    ending: bar.measure === -1,
    barBeats: bar.beats,
    barNumber,
    sub: Boolean(activeSlot?.sub),
    slotChord: activeSlot?.chord,
  }
}

export default function App() {
  const playerRef = useRef<Player | null>(null)
  const timelineRef = useRef<Timeline | null>(null)
  const pointerFocusedButtonRef = useRef<HTMLElement | null>(null)

  const [readiness, setReadiness] = useState<Readiness>({ kind: 'loading', progress: 0 })
  const [tunes, setTunes] = useState<Tune[]>(EXAMPLES)
  const [songId, setSongId] = useState(EXAMPLES[0].id)
  const [styleId, setStyleId] = useState(EXAMPLES[0].chart.style)
  const styleRef = useRef(styleId)
  const [lab, setLabState] = useState<LabStyle | null>(null)
  const labRef = useRef<LabStyle | null>(null)
  const [labBaseline, setLabBaseline] = useState<LabStyle | null>(null)
  const labReturnStyleRef = useRef<string | null>(null)
  const labCloseActionRef = useRef<(() => void) | null>(null)
  const [labClosePrompt, setLabClosePrompt] = useState(false)
  const [labStartStyleId, setLabStartStyleId] = useState(EXAMPLES[0].chart.style)
  const [labUndo, setLabUndo] = useState<{ lab: LabStyle; startStyleId: string } | null>(null)
  const [labCopy, setLabCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [labShare, setLabShare] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [myStyles, setMyStylesState] = useState<LabStyle[]>(loadMyStyles)
  const myStylesRef = useRef(myStyles)
  const [tuneStyles, setTuneStylesState] = useState<Record<string, string>>(loadTuneStyles)
  const tuneStylesRef = useRef(tuneStyles)
  const openSharedStyleRef = useRef<(lab: LabStyle) => void>(() => {})
  const setMyStyles = (next: LabStyle[]) => {
    myStylesRef.current = next
    setMyStylesState(next)
  }
  const [sounds, setSoundsState] = useState<SoundChoice>(loadSounds)
  const soundsRef = useRef(sounds)
  const setSounds = (next: SoundChoice) => {
    soundsRef.current = next
    setSoundsState(next)
  }
  const setTuneStyles = (next: Record<string, string>) => {
    tuneStylesRef.current = next
    setTuneStylesState(next)
    try {
      localStorage.setItem(TUNE_STYLES_KEY, JSON.stringify(next))
    } catch {
      // Storage may be disabled in private browsing
    }
  }
  useEffect(() => {
    styleRef.current = styleId
  }, [styleId])
  const [transpose, setTranspose] = useState(0)
  const [instrument, setInstrument] = useState<InstrumentId>(() => {
    try {
      const saved = localStorage.getItem(INSTRUMENT_KEY)
      return isInstrumentId(saved) ? saved : 'C'
    } catch {
      return 'C'
    }
  })
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
  const [selectedChord, setSelectedChord] = useState<Chord | null>(null)
  const [selectedChordAt, setSelectedChordAt] = useState<string | null>(null)
  const [chordsOpen, setChordsOpen] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editBar, setEditBar] = useState(0)
  const [irealState, setIrealState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [mode, setMode] = useState<ModeOption>('original')
  const [chordFont, setChordFont] = useState<ChordFont>(loadChordFont)

  const tune = tunes.find((t) => t.id === songId) ?? tunes[0] ?? EXAMPLES[0]
  const baseChart = draft?.chart ?? tune.chart
  const chart = useMemo(
    () => (!draft && mode !== 'original' ? switchMode(baseChart, mode) : baseChart),
    [baseChart, draft, mode],
  )
  // The lab's style is rebuilt from the grid each time it is needed
  // Saved styles are chosen as "my:<id>"
  const styleFor = (id: string, current: LabStyle | null, mine: LabStyle[]): StyleDefinition => {
    if (id === LAB_STYLE && current) return { ...styleFromLab(current), id }
    const saved = id.startsWith('my:') ? mine.find((m) => myStyleId(m) === id) : undefined
    return saved ? { ...styleFromLab(saved), id } : getStyle(id)
  }
  const resolveStyle = (id: string) => withSounds(styleFor(id, labRef.current, myStylesRef.current), soundsRef.current)
  const style = withSounds(draft ? getStyle(draft.chart.style) : styleFor(styleId, lab, myStyles), sounds)
  const keyPc = (chart.key + transpose + 12) % 12

  // During practice the chorus decides the key on the stand and the tempo
  const chorus = position ? Math.min(position.chorus, choruses - 1) : 0
  const shownTranspose = playing ? chorusTranspose(transpose, practice.keyStep, chorus) : transpose
  const viewTranspose = shownTranspose + viewOffset(instrument)
  const shownKeyPc = (chart.key + viewTranspose + 12) % 12
  const liveBpm = clampBpm(bpm + practice.ramp * (playing ? chorus : 0))
  const shownChord = selectedChord
    ? transposeChord(selectedChord, viewTranspose)
    : (playing && position?.slotChord ? transposeChord(position.slotChord, viewOffset(instrument)) : null) ??
      (playing ? playingChord(chart, position, viewTranspose) : null) ??
      firstChord(chart, viewTranspose)

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
        // (with the saved sound choices, so a chosen bass, comping sound or kit is ready too)
        const first = getStyle(styleRef.current)
        const styles = [first, ...STYLES.filter((s) => s !== first)].map((s) => withSounds(s, soundsRef.current))
        void player.warmUp(styles.map(warmUpMidi))
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

  useEffect(() => {
    try {
      localStorage.setItem(INSTRUMENT_KEY, instrument)
    } catch {
      // Storage may be disabled in private browsing
    }
  }, [instrument])

  useEffect(() => {
    try {
      localStorage.setItem(CHORD_FONT_KEY, chordFont)
    } catch {
      // Storage may be disabled in private browsing
    }
    if (chordFont === 'Plain') {
      document.documentElement.dataset.chordFont = 'plain'
    } else {
      delete document.documentElement.dataset.chordFont
    }
  }, [chordFont])

  useEffect(() => {
    saveSounds(sounds)
  }, [sounds])

  // Tempo changes only the playback rate; the arrangement is not regenerated
  useEffect(() => {
    playerRef.current?.setRate(liveBpm / BASE_BPM)
  }, [liveBpm])

  const start = async (opts: ArrangeOptions, fromSeconds = 0, chartToUse = chart, fromStartPoint = false) => {
    const player = playerRef.current
    if (!player) return
    setNotice(null)
    const { loop, keyStep, subs } = opts.practice
    const { midi, timeline } = arrange(chartToUse, resolveStyle(opts.styleId), opts.transpose, opts.choruses, { loop, keyStep, subs })
    timelineRef.current = timeline

    let offsetSeconds = fromSeconds
    if (fromStartPoint && !loop && selectedChordAt) {
      const [barStr, chordStr] = selectedChordAt.split(':')
      const startBeat = startBeatFor(timeline, Number(barStr), Number(chordStr), chartToUse)
      // When starting from a selected chord, count-in is skipped and playback begins directly at the chord.
      offsetSeconds = (startBeat * 60) / BASE_BPM
    }

    try {
      await player.play(midi, offsetSeconds)
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
    if (patch.styleId && patch.styleId !== LAB_STYLE) {
      const nextTuneStyles = { ...tuneStylesRef.current }
      if (patch.styleId === tune.chart.style) delete nextTuneStyles[songId]
      else nextTuneStyles[songId] = patch.styleId
      setTuneStyles(nextTuneStyles)
    }
    const player = playerRef.current
    const loopChanged = String(next.practice.loop) !== String(practice.loop)
    if (playing && player) void start(next, loopChanged ? 0 : player.position)
  }

  const changeMode = (nextMode: ModeOption) => {
    setMode(nextMode)
    setSelectedChord(null)
    setSelectedChordAt(null)
    const nextChart = !draft && nextMode !== 'original' ? switchMode(baseChart, nextMode) : baseChart
    const player = playerRef.current
    if (playing && player) {
      void start({ styleId, transpose, choruses, practice }, player.position, nextChart)
    }
  }

  const changePractice = (next: PracticeSettings) => {
    // Going round the keys needs enough choruses to get back home
    const keysNeeded = next.keyStep ? 12 / gcd(next.keyStep, 12) : 0
    const nextChoruses = next.keyStep !== practice.keyStep && choruses < keysNeeded ? keysNeeded : choruses
    changeArrangement({ practice: next, choruses: nextChoruses })
  }

  const toggle = () => (playing ? stop() : void start({ styleId, transpose, choruses, practice }, 0, chart, true))
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
      handlePracticeShortcut(e, editing, shortcutsRef.current, pointerFocusedButtonRef.current)
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      pointerFocusedButtonRef.current = target?.closest<HTMLElement>('button, [role="button"]') ?? null
    }
    // Focus that did not come from the recorded pointer target was established
    // by keyboard navigation, script, or assistive technology.
    const onFocusIn = (e: FocusEvent) => {
      if (e.target !== pointerFocusedButtonRef.current) pointerFocusedButtonRef.current = null
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('keydown', onKey)
    }
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
    const preferred = tuneStylesRef.current[next.id]
    const known = preferred && (STYLES.some((style) => style.id === preferred) || myStylesRef.current.some((style) => myStyleId(style) === preferred))
    setStyleId(labRef.current ? LAB_STYLE : known ? preferred : next.chart.style)
    setTranspose(0)
    setMode('original')
    setBpm(next.chart.bpm)
    setPractice((p) => ({ ...p, loop: null }))
    setPicking(null)
    setSelectedChord(null)
    setSelectedChordAt(null)
    setChordsOpen(false)
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
    async (text: string, filename?: string): Promise<ImportResult> => {
      if (filename?.toLowerCase().endsWith('.json') || text.trimStart().startsWith('{')) {
        const imported = parseChartFile(text)
        const [added] = await addTunes([imported], 'import', 'Imported tunes', setNotice)
        setTunes((all) => [...all.filter((t) => t.id !== added.id), added])
        showTune(added)
        return { tunes: 1, playlists: ['Imported tunes'] }
      }
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
    // While playing, the change is heard from the same spot; quick clicks are gathered into one update
    window.clearTimeout(labTimer.current)
    labTimer.current = window.setTimeout(() => rearrangeRef.current(), 120)
  }

  const openLab = () => {
    setLibraryOpen(false)
    const saved = myStylesRef.current.find((item) => myStyleId(item) === styleId)
    const starting = saved ?? labFromStyle(getStyle(styleId))
    setLabBaseline(starting)
    labReturnStyleRef.current = styleId
    setLabClosePrompt(false)
    setLabStartStyleId(styleId)
    setLab(starting)
    setStyleId(LAB_STYLE)
  }

  const labDirty = !!lab && !!labBaseline && JSON.stringify(lab) !== JSON.stringify(labBaseline)

  function closeLab(afterClose?: () => void) {
    const current = labRef.current
    if (!current) return
    labCloseActionRef.current = null
    window.clearTimeout(labTimer.current)
    labRef.current = null
    setLabBaseline(null)
    const returnStyle = labReturnStyleRef.current ?? current.base
    labReturnStyleRef.current = null
    setLabState(null)
    setLabClosePrompt(false)
    setLabUndo(null)
    changeArrangement({ styleId: returnStyle })
    afterClose?.()
  }

  const requestCloseLab = (afterClose?: () => void) => {
    if (!labRef.current) return afterClose?.()
    if (!labDirty) return closeLab(afterClose)
    labCloseActionRef.current = afterClose ?? null
    setLabClosePrompt(true)
  }

  const saveLab = () => {
    const current = labRef.current
    if (!current) return
    setMyStyles(saveMyStyle(myStylesRef.current, current))
    setLabBaseline(current)
    labReturnStyleRef.current = myStyleId(current)
    setLabStartStyleId(myStyleId(current))
  }

  // A style link: the style is saved to My styles and opened in the lab
  useEffect(() => {
    openSharedStyleRef.current = (shared: LabStyle) => {
      setMyStyles(saveMyStyle(myStylesRef.current, shared))
      setLabBaseline(shared)
      labReturnStyleRef.current = myStyleId(shared)
      setLabStartStyleId(myStyleId(shared))
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
    const start = () => {
      stop()
      setPicking(null)
      setSelectedChord(null)
      setSelectedChordAt(null)
      setChordsOpen(false)
      setLibraryOpen(false)
      setDraft({ chart: from ? from.chart : emptyChart(), from })
      setEditBar(0)
    }
    if (labRef.current) requestCloseLab(start)
    else start()
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
    <div className="app" data-chord-font={chordFont === 'Plain' ? 'plain' : undefined}>
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="OpenStand home">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M6 4h20l-2 11H8z" />
            <path d="M5 15h22" />
            <path d="M16 15v12M16 27l-6 3M16 27l6 3" />
          </svg>
          <span className="wordmark-name">OpenStand</span>
        </a>
        <span className="topbar-tag">Practice with a band in your browser</span>
        <span className="topbar-spacer" />
        {!editing && (
          <>
            <button
              className="topbar-button topbar-lab"
              aria-pressed={!!lab}
              onClick={() => (lab ? requestCloseLab() : openLab())}
              title="Make your own style: edit the drums, bass and chords and hear them as you go"
            >
              <span className="topbar-long">Style </span>lab
            </button>
            <button className="topbar-button" onClick={() => startEditing(tune)} title="Edit this chart">
              Edit
            </button>
            <Popover id="share" className="share" label="Share">
              {(close) => (
                <div className="share-panel">
                  <button className="share-option" onClick={() => void copy(() => shareUrl(baseChart), setShareState)}>
                    <span className="share-name">
                      {shareState === 'copied' ? 'Link copied' : shareState === 'failed' ? 'Copy failed' : 'Copy OpenStand link'}
                    </span>
                    <span className="share-desc">Opens this chart in OpenStand. Nothing is uploaded.</span>
                  </button>
                  <button className="share-option" onClick={() => void copy(() => irealLink([baseChart]), setIrealState)}>
                    <span className="share-name">
                      {irealState === 'copied' ? 'Link copied' : irealState === 'failed' ? 'Copy failed' : 'Copy iReal Pro link'}
                    </span>
                    <span className="share-desc">An irealb:// link that opens in iReal Pro.</span>
                  </button>
                  <button
                    className="share-option"
                    onClick={() => {
                      const { loop, keyStep, subs } = practice
                      downloadMidi(chart, resolveStyle(styleId), transpose, choruses, { loop, keyStep, subs }, bpm)
                      close()
                    }}
                  >
                    <span className="share-name">Download MIDI</span>
                    <span className="share-desc">Bass, piano and drums on separate tracks, at the current tempo.</span>
                  </button>
                  <button
                    className="share-option"
                    onClick={() => {
                      downloadChordPro(chart, transpose)
                      close()
                    }}
                  >
                    <span className="share-name">Download ChordPro</span>
                    <span className="share-desc">A chord grid for songbook apps (OnSong, SongbookPro).</span>
                  </button>
                  <button
                    className="share-option"
                    onClick={() => {
                      downloadChartFile(baseChart)
                      close()
                    }}
                  >
                    <span className="share-name">Save as file</span>
                    <span className="share-desc">An OpenStand chart file you can open again or send to someone.</span>
                  </button>
                </div>
              )}
            </Popover>
          </>
        )}
        <button
          type="button"
          className="topbar-button topbar-chord-font"
          aria-pressed={chordFont === 'Plain'}
          aria-label="Plain chords"
          title="Plain chords"
          onClick={() => setChordFont((f) => (f === 'Plain' ? 'Handwritten' : 'Plain'))}
        >
          Aa
        </button>
        <button className="tunes-toggle" aria-expanded={libraryOpen} onClick={() => setLibraryOpen(!libraryOpen)}>
          Tunes
        </button>
        <a
          className="topbar-link topbar-whatsnew"
          href="https://github.com/canbmaj7/openstand/blob/main/CHANGELOG.md"
          target="_blank"
          rel="noreferrer"
        >
          What's new
        </a>
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
          styleOverrides={tuneStyles}
          styleNames={Object.fromEntries([
            ...STYLES.map((item) => [item.id, item.name]),
            ...myStyles.map((item) => [myStyleId(item), item.name]),
          ])}
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
            transpose={draft ? 0 : viewTranspose}
            activeMeasure={position && position.measure >= 0 ? position.measure : null}
            activeSub={position?.sub ?? false}
            beatInBar={position?.beatInBar ?? 0}
            barBeats={position?.barBeats ?? 4}
            range={picking && picking !== 'first' ? [picking.from, picking.from] : draft ? null : practice.loop}
            selectedBar={draft ? editBar : null}
            plain={chordFont === 'Plain'}
            startAt={!playing ? selectedChordAt : null}
            onBarClick={draft ? setEditBar : picking ? pickBar : undefined}
            onChordClick={
              !draft && !picking
                ? (c, barIndex, chordIndex) => {
                    const at = `${barIndex}:${chordIndex}`
                    // Clicking the open chord again closes the helper and clears the start point
                    if (chordsOpen && selectedChordAt === at) {
                      setChordsOpen(false)
                      setSelectedChord(null)
                      setSelectedChordAt(null)
                      return
                    }
                    setSelectedChord(transposeChord(c, -viewTranspose))
                    setSelectedChordAt(at)
                    setChordsOpen(true)
                  }
                : undefined
            }
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
          startFromId={labStartStyleId}
          dirty={labDirty}
          confirmClose={labClosePrompt}
          onChange={(next) => {
            setLab(next)
            setLabUndo(null)
          }}
          onStartFrom={(id) => {
            setLabUndo({ lab, startStyleId: labStartStyleId })
            setLabStartStyleId(id)
            const saved = myStyles.find((m) => myStyleId(m) === id)
            setLab(saved ?? labFromStyle(getStyle(id)))
          }}
          myStyles={myStyles.map((m) => ({ id: myStyleId(m), name: m.name }))}
          isSaved={myStyles.some((m) => myStyleId(m) === myStyleId(lab))}
          onShare={() => void copy(() => styleShareUrl(lab, baseChart), setLabShare)}
          shareState={labShare}
          onDelete={() => {
            const id = myStyleId(lab)
            setMyStyles(removeMyStyle(myStyles, id))
            setTuneStyles(Object.fromEntries(Object.entries(tuneStylesRef.current).filter(([, style]) => style !== id)))
            setLabBaseline(lab)
            if (labReturnStyleRef.current === id) labReturnStyleRef.current = tune.chart.style
            if (labStartStyleId === id) setLabStartStyleId(lab.base)
            if (styleId === id) changeArrangement({ styleId: LAB_STYLE })
          }}
          canUndo={labUndo !== null}
          onUndo={() => {
            if (labUndo) {
              setLab(labUndo.lab)
              setLabStartStyleId(labUndo.startStyleId)
            }
            setLabUndo(null)
          }}
          step={playing ? labStep : null}
          onCopy={() => void copy(() => styleSource(styleFromLab(lab), getStyle(lab.base).name), setLabCopy)}
          copyState={labCopy}
          onSend={sendLab}
          onClose={() => requestCloseLab()}
          onSaveAndClose={() => {
            saveLab()
            const afterClose = labCloseActionRef.current
            labCloseActionRef.current = null
            closeLab(afterClose ?? undefined)
          }}
          onDiscardClose={() => {
            const afterClose = labCloseActionRef.current
            labCloseActionRef.current = null
            closeLab(afterClose ?? undefined)
          }}
          onKeepEditing={() => {
            labCloseActionRef.current = null
            setLabClosePrompt(false)
          }}
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
        mode={mode}
        originalMinor={tune.chart.minor}
        onMode={changeMode}
        instrument={instrument}
        onInstrument={setInstrument}
        bpm={bpm}
        bpmRange={BPM_RANGE}
        onBpm={setBpm}
        choruses={choruses}
        maxChoruses={MAX_CHORUSES}
        onChoruses={(n) => changeArrangement({ choruses: n })}
      >
        <Practice chart={chart} settings={practice} onChange={changePractice} onPickLoop={() => setPicking('first')} />
        <ChordHelper
          chord={shownChord}
          keyPc={shownKeyPc}
          following={selectedChord === null}
          onFollowChange={(follow) => {
            setSelectedChord(follow ? null : transposeChord(shownChord, -viewTranspose))
            setSelectedChordAt(null)
          }}
          open={chordsOpen}
          onOpenChange={setChordsOpen}
        />
        <Mixer
          labels={{ bass: 'Bass', comp: compLabel(style.comp.program), drums: 'Drums' }}
          volumes={volumes}
          muted={muted}
          sounds={sounds}
          onVolume={(part, v) => setVolumes((all) => ({ ...all, [part]: v }))}
          onMute={(part) => setMuted((all) => ({ ...all, [part]: !all[part] }))}
          onSound={(part, program) => {
            setSounds({ ...soundsRef.current, [part]: program })
            changeArrangement({})
          }}
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
