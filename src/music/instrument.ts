// Transposing instruments: written pitch is offset above concert pitch so Bb and Eb
// players can read in their written key while the band plays in concert pitch.

export type InstrumentId = 'C' | 'Bb' | 'Eb'

export interface Instrument {
  id: InstrumentId
  label: string
  offset: number // semitones added to concert pitch to get written pitch
}

export const INSTRUMENTS: readonly Instrument[] = [
  { id: 'C', label: 'C (concert)', offset: 0 },
  { id: 'Bb', label: 'Bb instrument', offset: 2 },
  { id: 'Eb', label: 'Eb instrument', offset: 9 },
]

export function isInstrumentId(value: string | null | undefined): value is InstrumentId {
  return INSTRUMENTS.some((i) => i.id === value)
}

export function viewOffset(id: InstrumentId | string): number {
  return INSTRUMENTS.find((i) => i.id === id)?.offset ?? 0
}
