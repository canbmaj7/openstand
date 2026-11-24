import { describe, expect, test } from 'vitest'
import { generateComp } from '../src/engine/comp'
import type { NoteEvent } from '../src/engine/events'
import { buildTimeline } from '../src/engine/timeline'
import { chartFromMeasures } from '../src/music/chart'
import { getStyle } from '../src/styles'
import { withSounds } from '../src/styles/sounds'

// Group comp note events into simultaneous chord strikes (humanize jitters ticks by ±6).
function strikesOf(events: NoteEvent[]): NoteEvent[][] {
  const sorted = [...events].sort((a, b) => a.tick - b.tick)
  const groups: NoteEvent[][] = []
  for (const event of sorted) {
    const last = groups[groups.length - 1]
    if (last && event.tick - last[0].tick <= 30) {
      last.push(event)
    } else {
      groups.push([event])
    }
  }
  return groups
}

const averageLeap = (from: number[], to: number[]) =>
  from.reduce((sum, p) => sum + Math.min(...to.map((q) => Math.abs(p - q))), 0) / from.length

describe('withSounds guitar comping', () => {
  test('medium-swing + Jazz guitar switches to guitar voicing and four-to-the-bar rhythm', () => {
    const swing = getStyle('medium-swing')
    const guitar = withSounds(swing, { bass: null, comp: 26, drums: null })

    expect(guitar.comp.program).toBe(26)
    expect(guitar.comp.voicing).toBe('guitar')
    expect(guitar.comp.pedal).toBe(false)
    expect(guitar.comp.anticipation).toBe(0)

    const [v1, v2] = swing.comp.velocity
    expect(v2).toBeGreaterThan(v1)
    expect(guitar.comp.rhythms['4']).toEqual([
      [
        [0, 0.45, v1],
        [1, 0.45, v2],
        [2, 0.45, v1],
        [3, 0.45, v2],
      ],
    ])
    expect(guitar.comp.rhythms['3']).toEqual([
      [
        [0, 0.45, v1],
        [1, 0.45, v2],
        [2, 0.45, v2],
      ],
    ])
    expect(guitar.comp.rhythms['2']).toEqual([
      [
        [0, 0.45, v1],
        [1, 0.45, v2],
      ],
    ])
    expect(guitar.comp.rhythms['1']).toEqual([[[0, 0.45, v1]]])
  })

  test('jazz-waltz + Jazz guitar uses 3-beat strums in 3/4', () => {
    const waltz = withSounds(getStyle('jazz-waltz'), { bass: null, comp: 26, drums: null })
    const chart = chartFromMeasures({ title: 'Waltz', style: 'jazz-waltz', key: 0, bpm: 150, time: [3, 4] }, [
      ['Dm7'],
      ['G7'],
      ['Cmaj7'],
    ])
    const timeline = buildTimeline(chart, 0, 1)
    const middleSlots = timeline.slots.filter((s) => s.measure >= 0)
    const events = generateComp(middleSlots, waltz.comp, waltz.swing, timeline.countIn)
    expect(strikesOf(events)).toHaveLength(9)
  })

  test('non-jazz styles with guitar keep their own rhythm and only change voicing and pedal', () => {
    const pop = getStyle('pop-rock')
    const guitar = withSounds(pop, { bass: null, comp: 27, drums: null })

    expect(guitar.comp.program).toBe(27)
    expect(guitar.comp.voicing).toBe('guitar')
    expect(guitar.comp.pedal).toBe(false)
    expect(guitar.comp.rhythms).toBe(pop.comp.rhythms)
    expect(guitar.comp.anticipation).toBe(pop.comp.anticipation)
  })

  test('styles that already use guitar keep their voicing, pedal, and rhythms untouched', () => {
    for (const id of ['bossa-nova', 'samba', 'reggae']) {
      const original = getStyle(id)
      const updated = withSounds(original, { bass: null, comp: 26, drums: null })

      expect(updated.comp.program).toBe(26)
      expect(updated.comp.voicing).toBe(original.comp.voicing)
      expect(updated.comp.rhythms).toBe(original.comp.rhythms)
      expect(updated.comp.anticipation).toBe(original.comp.anticipation)
      expect(updated.comp.pedal).toBe(original.comp.pedal)
    }
  })

  test('medium-swing + Electric piano keeps rootless voicing and swing rhythms', () => {
    const swing = getStyle('medium-swing')
    const ep = withSounds(swing, { bass: null, comp: 4, drums: null })

    expect(ep.comp.program).toBe(4)
    expect(ep.comp.voicing).toBe(swing.comp.voicing)
    expect(ep.comp.rhythms).toBe(swing.comp.rhythms)
    expect(ep.comp.anticipation).toBe(swing.comp.anticipation)
  })
})

describe('generateComp with guitar voicing', () => {
  test('produces 3-4 note voicings in guitar range (40..76), no duplicate pitch classes, and smooth voice leading', () => {
    const style = withSounds(getStyle('medium-swing'), { bass: null, comp: 26, drums: null })
    const chart = chartFromMeasures({ title: 'Changes', style: 'medium-swing', key: 0, bpm: 140 }, [
      ['Dm7'],
      ['G7'],
      ['Cmaj7'],
      ['Fmaj7'],
      ['Fm7'],
      ['Bb7'],
      ['Ebmaj7'],
      ['Ab7'],
      ['Bh7'],
      ['E7'],
      ['Am7', 'D7'],
      ['C/G', 'G7'],
    ])
    const timeline = buildTimeline(chart, 0, 1)
    const events = generateComp(timeline.slots, style.comp, style.swing, timeline.countIn)
    const strikes = strikesOf(events)

    expect(strikes.length).toBeGreaterThan(20)

    for (const strike of strikes) {
      expect(strike.length).toBeGreaterThanOrEqual(3)
      expect(strike.length).toBeLessThanOrEqual(4)

      const pcs = new Set<number>()
      for (const e of strike) {
        expect(e.note).toBeGreaterThanOrEqual(40)
        expect(e.note).toBeLessThanOrEqual(76)
        pcs.add(e.note % 12)
      }
      expect(pcs.size).toBe(strike.length)
    }

    // Measure average voice-leading leap across consecutive chord changes
    const chordVoicings: number[][] = []
    for (const slot of timeline.slots) {
      const hit = strikes.find((s) => Math.abs(s[0].tick - slot.start * 480) <= 30)
      if (hit) chordVoicings.push(hit.map((e) => e.note))
    }
    let totalLeap = 0
    for (let i = 1; i < chordVoicings.length; i++) {
      totalLeap += averageLeap(chordVoicings[i - 1], chordVoicings[i])
    }
    const meanLeap = totalLeap / (chordVoicings.length - 1)
    expect(meanLeap).toBeLessThan(5)
  })
})
