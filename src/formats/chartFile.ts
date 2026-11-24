// Serialization and strict validation for .openstand.json chart files (format version 1).

import type { BarChord, Chart, ChartBar, TimeSignature } from '../music/chart'

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isPosNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0

function isTimeSignature(v: unknown): v is TimeSignature {
  return Array.isArray(v) && v.length === 2 && isPosNum(v[0]) && isPosNum(v[1])
}

function validateBarChord(raw: unknown, barIndex: number, chordIndex: number): BarChord {
  if (!isRecord(raw)) throw new Error(`Invalid bar ${barIndex + 1} chord ${chordIndex + 1}: expected an object.`)
  if (raw.symbol !== null && typeof raw.symbol !== 'string') {
    throw new Error(`Invalid bar ${barIndex + 1} chord ${chordIndex + 1}: "symbol" must be a string or null.`)
  }
  if (raw.alt !== undefined && typeof raw.alt !== 'string') {
    throw new Error(`Invalid bar ${barIndex + 1} chord ${chordIndex + 1}: "alt" must be a string.`)
  }
  if (!isPosNum(raw.beats)) {
    throw new Error(`Invalid bar ${barIndex + 1} chord ${chordIndex + 1}: "beats" must be a positive number.`)
  }
  return raw as unknown as BarChord
}

const BOOL_BAR_FIELDS = ['rowStart', 'repeatStart', 'repeatEnd', 'segno', 'coda', 'fermata', 'end', 'spacer'] as const
const STR_BAR_FIELDS = ['section', 'directive', 'comment'] as const

function validateBar(raw: unknown, index: number): ChartBar {
  if (!isRecord(raw)) throw new Error(`Invalid bar ${index + 1}: expected an object.`)
  if (!Array.isArray(raw.chords)) throw new Error(`Invalid bar ${index + 1}: "chords" must be an array.`)
  if (!isPosNum(raw.cells)) throw new Error(`Invalid bar ${index + 1}: "cells" must be a positive number.`)

  for (let j = 0; j < raw.chords.length; j++) validateBarChord(raw.chords[j], index, j)

  for (const field of BOOL_BAR_FIELDS) {
    if (raw[field] !== undefined && typeof raw[field] !== 'boolean') {
      throw new Error(`Invalid bar ${index + 1}: "${field}" must be a boolean.`)
    }
  }
  for (const field of STR_BAR_FIELDS) {
    if (raw[field] !== undefined && typeof raw[field] !== 'string') {
      throw new Error(`Invalid bar ${index + 1}: "${field}" must be a string.`)
    }
  }
  if (raw.time !== undefined && !isTimeSignature(raw.time)) {
    throw new Error(`Invalid bar ${index + 1}: "time" must be a [beats, unit] pair.`)
  }
  if (raw.repeatTimes !== undefined && !isPosNum(raw.repeatTimes)) {
    throw new Error(`Invalid bar ${index + 1}: "repeatTimes" must be a positive number.`)
  }
  if (raw.ending !== undefined && !isPosNum(raw.ending)) {
    throw new Error(`Invalid bar ${index + 1}: "ending" must be a positive number.`)
  }
  if (raw.barline !== undefined && raw.barline !== 'double' && raw.barline !== 'final') {
    throw new Error(`Invalid bar ${index + 1}: "barline" must be "double" or "final".`)
  }

  return raw as unknown as ChartBar
}

export function validateChart(data: unknown): Chart {
  if (!isRecord(data)) throw new Error('Invalid chart file: expected a JSON object.')
  if (data.format !== 'openstand-chart') {
    throw new Error('Invalid chart format: expected "openstand-chart".')
  }
  if (data.version !== 1) {
    throw new Error('Unsupported chart version: expected version 1.')
  }
  if (typeof data.title !== 'string') throw new Error('Invalid chart: "title" must be a string.')
  if (data.composer !== undefined && typeof data.composer !== 'string') {
    throw new Error('Invalid chart: "composer" must be a string.')
  }
  if (typeof data.style !== 'string') throw new Error('Invalid chart: "style" must be a string.')
  if (data.sourceStyle !== undefined && typeof data.sourceStyle !== 'string') {
    throw new Error('Invalid chart: "sourceStyle" must be a string.')
  }
  if (typeof data.key !== 'number' || !Number.isInteger(data.key) || data.key < 0 || data.key > 11) {
    throw new Error('Invalid chart: "key" must be an integer between 0 and 11.')
  }
  if (data.minor !== undefined && typeof data.minor !== 'boolean') {
    throw new Error('Invalid chart: "minor" must be a boolean.')
  }
  if (!isPosNum(data.bpm)) throw new Error('Invalid chart: "bpm" must be a positive number.')
  if (!isTimeSignature(data.time)) throw new Error('Invalid chart: "time" must be a [beats, unit] pair.')
  if (!Array.isArray(data.bars) || data.bars.length === 0) {
    throw new Error('Invalid chart: "bars" must be a non-empty array.')
  }

  for (let i = 0; i < data.bars.length; i++) validateBar(data.bars[i], i)

  return data as unknown as Chart
}

export function chartToFile(chart: Chart): string {
  return JSON.stringify(chart, null, 2)
}

export function parseChartFile(text: string): Chart {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON: could not parse the chart file.')
  }
  return validateChart(data)
}
