import assert from 'node:assert/strict'
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { backingTrack, chartFromMeasures, irealLink } from '../dist/index.js'

const sampleChart = chartFromMeasures({ title: 'Smoke Blues', style: 'medium-swing', key: 5, bpm: 140 }, [
  ['F7'],
  ['Bb7'],
  ['F7'],
  ['C-7', 'F7'],
])

const fromChart = backingTrack({ chart: sampleChart })
assert.equal(String.fromCharCode(...fromChart.midi.slice(0, 4)), 'MThd', 'Expected SMF MThd header')
assert.ok(fromChart.timeline.slots.length > 0, 'Expected non-empty timeline slots')
assert.equal(fromChart.style.id, 'medium-swing')

const link = irealLink([sampleChart])
const fromIreal = backingTrack({ ireal: link, style: 'bossa-nova', bpm: 160, choruses: 2 })
assert.equal(String.fromCharCode(...fromIreal.midi.slice(0, 4)), 'MThd', 'Expected SMF MThd header from ireal')
assert.equal(fromIreal.chart.title, 'Smoke Blues')
assert.equal(fromIreal.style.id, 'bossa-nova')
assert.ok(fromIreal.timeline.slots.length > 0, 'Expected non-empty timeline slots from ireal')

const bundlePath = fileURLToPath(new URL('../dist/index.js', import.meta.url))
const sizeKb = (statSync(bundlePath).size / 1024).toFixed(2)
console.log(`@openstand/engine smoke OK — dist/index.js: ${sizeKb} KB, MIDI bytes: ${fromIreal.midi.byteLength}`)
