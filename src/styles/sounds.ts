import type { ByChordLength, CompHit, StyleDefinition } from './types'

export type SoundChoice = { bass: number | null; comp: number | null; drums: number | null }
export type SoundPart = keyof SoundChoice

export interface SoundOption {
  label: string
  program: number
}

export const BASS_SOUNDS: SoundOption[] = [
  { label: 'Acoustic', program: 32 },
  { label: 'Electric (finger)', program: 33 },
  { label: 'Electric (pick)', program: 34 },
  { label: 'Fretless', program: 35 },
  { label: 'Synth', program: 38 },
]

export const COMP_SOUNDS: SoundOption[] = [
  { label: 'Piano', program: 0 },
  { label: 'Bright piano', program: 1 },
  { label: 'Electric piano', program: 4 },
  { label: 'Nylon guitar', program: 24 },
  { label: 'Jazz guitar', program: 26 },
  { label: 'Clean guitar', program: 27 },
  { label: 'Organ', program: 16 },
  { label: 'Rock organ', program: 18 },
  { label: 'Vibraphone', program: 11 },
]

export const DRUMS_SOUNDS: SoundOption[] = [
  { label: 'Standard', program: 0 },
  { label: 'Room', program: 8 },
  { label: 'Power', program: 16 },
  { label: 'Jazz', program: 32 },
  { label: 'Brush', program: 40 },
]

export const SOUND_OPTIONS: Record<SoundPart, SoundOption[]> = {
  bass: BASS_SOUNDS,
  comp: COMP_SOUNDS,
  drums: DRUMS_SOUNDS,
}

const VALID_PROGRAMS: Record<SoundPart, Set<number>> = {
  bass: new Set(BASS_SOUNDS.map((o) => o.program)),
  comp: new Set(COMP_SOUNDS.map((o) => o.program)),
  drums: new Set(DRUMS_SOUNDS.map((o) => o.program)),
}

export const SOUNDS_KEY = 'openstand:sounds'

export const DEFAULT_SOUNDS: SoundChoice = { bass: null, comp: null, drums: null }

const isGuitarProgram = (program: number) => program >= 24 && program <= 31

// Four-to-the-bar ("Freddie Green") quarter-note strums with a light accent on beats 2 and 4
function freddieGreenRhythms([v1, v2]: [number, number]): ByChordLength<CompHit[]> {
  return {
    '4': [[[0, 0.45, v1], [1, 0.45, v2], [2, 0.45, v1], [3, 0.45, v2]]],
    '3': [[[0, 0.45, v1], [1, 0.45, v2], [2, 0.45, v2]]],
    '2': [[[0, 0.45, v1], [1, 0.45, v2]]],
    '1': [[[0, 0.45, v1]]],
  }
}

function compWithSound(
  comp: StyleDefinition['comp'],
  family: StyleDefinition['family'],
  program: number | null,
): StyleDefinition['comp'] {
  if (program === null) return comp
  if (!isGuitarProgram(program) || isGuitarProgram(comp.program)) {
    return { ...comp, program }
  }
  if (family === 'jazz') {
    return {
      ...comp,
      program,
      voicing: 'guitar',
      pedal: false,
      anticipation: 0,
      rhythms: freddieGreenRhythms(comp.velocity),
    }
  }
  return { ...comp, program, voicing: 'guitar', pedal: false }
}

/** Returns a new style with any non-null sound choices applied without mutating the input. */
export function withSounds(style: StyleDefinition, sounds: SoundChoice): StyleDefinition {
  const firstChorus = style.firstChorus
    ? {
        ...(style.firstChorus.bass && {
          bass: sounds.bass === null ? style.firstChorus.bass : { ...style.firstChorus.bass, program: sounds.bass },
        }),
        ...(style.firstChorus.comp && {
          comp: compWithSound(style.firstChorus.comp, style.family, sounds.comp),
        }),
        ...(style.firstChorus.drums && {
          drums: sounds.drums === null ? style.firstChorus.drums : { ...style.firstChorus.drums, kit: sounds.drums },
        }),
      }
    : undefined
  return {
    ...style,
    bass: sounds.bass === null ? style.bass : { ...style.bass, program: sounds.bass },
    comp: compWithSound(style.comp, style.family, sounds.comp),
    drums: sounds.drums === null ? style.drums : { ...style.drums, kit: sounds.drums },
    ...(firstChorus ? { firstChorus } : {}),
  }
}

/** Parses stored JSON into a SoundChoice, turning missing or invalid entries into null. */
export function parseSounds(raw: string | null): SoundChoice {
  if (!raw) return { ...DEFAULT_SOUNDS }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_SOUNDS }
    const obj = parsed as Record<string, unknown>
    const pick = (part: SoundPart): number | null => {
      const value = obj[part]
      return typeof value === 'number' && VALID_PROGRAMS[part].has(value) ? value : null
    }
    return {
      bass: pick('bass'),
      comp: pick('comp'),
      drums: pick('drums'),
    }
  } catch {
    return { ...DEFAULT_SOUNDS }
  }
}

export function loadSounds(): SoundChoice {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SOUNDS }
    return parseSounds(localStorage.getItem(SOUNDS_KEY))
  } catch {
    return { ...DEFAULT_SOUNDS }
  }
}

export function saveSounds(sounds: SoundChoice): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SOUNDS_KEY, JSON.stringify(sounds))
  } catch {
    // Storage may be disabled in private browsing
  }
}
