import { describe, expect, test } from 'vitest'
import { arrange } from '../src/engine/arrange'
import { chartFromMeasures } from '../src/music/chart'
import { getStyle, STYLES } from '../src/styles'
import { labFromStyle, labId, normalizeLab, setBars, styleFromLab, styleSource } from '../src/styles/lab'
import type { StyleDefinition } from '../src/styles/types'

const tune = chartFromMeasures({ title: 'Lab', style: 'medium-swing', key: 0, bpm: 120 }, [['D-7'], ['G7'], ['C^7'], ['C^7']])

// Reads the generated file back the way TypeScript would see the object
function evalSource(source: string): StyleDefinition {
  const literal = source.slice(source.indexOf('= ') + 2)
  return new Function(`return (${literal})`)() as StyleDefinition
}

describe('style lab', () => {
  test('a style survives the trip through the grid', () => {
    const bossa = getStyle('bossa-nova')
    const back = styleFromLab(labFromStyle(bossa))
    const hits = (s: StyleDefinition) => s.drums.grooves.middle[0].hits.map((h) => `${h[0]}:${h[1]}:${h[2]}`).sort()
    expect(hits(back)).toEqual(hits(bossa))
    expect(back.bass.mode === 'pattern' && back.bass.patterns['4']?.[0].map((n) => [n.at, n.tone])).toEqual(
      bossa.bass.mode === 'pattern' && bossa.bass.patterns['4']?.[0].map((n) => [n.at, n.tone]),
    )
    expect(back.comp.rhythms['4']?.[0].map((h) => h[0])).toEqual(bossa.comp.rhythms['4']?.[0].map((h) => h[0]))
  })

  test('hits that play only sometimes keep their chance', () => {
    const lab = labFromStyle(getStyle('medium-swing'))
    expect(lab.drums.snare?.find(Boolean)).toMatchObject({ chance: 0.15 })
    const snare = styleFromLab(lab).drums.grooves.middle[0].hits.find((h) => h[1] === 'snare')
    expect(snare?.[3]).toBe(0.15)
  })

  test('every style can be opened in the lab and played', () => {
    for (const style of STYLES) {
      const lab = labFromStyle(style)
      expect(lab.beats, style.id).toBe(style.id === 'jazz-waltz' ? 3 : 4)
      const { midi } = arrange(tune, styleFromLab(lab), 0, 2)
      expect(midi.length, style.id).toBeGreaterThan(100)
    }
  })

  test('the generated file reads back as the same style', () => {
    for (const style of STYLES) {
      const made = styleFromLab(labFromStyle(style))
      const source = styleSource(made, style.name)
      expect(source).toContain(`export const `)
      expect(evalSource(source), style.id).toEqual(made)
    }
  })

  test('names become ids', () => {
    const lab = { ...labFromStyle(getStyle('samba')), name: 'Çok Güzel  Samba!' }
    expect(labId(lab)).toBe('cok-guzel-samba')
    expect(labId({ ...lab, name: '   ' })).toBe('my-style')
  })

  test('a one-bar groove doubled repeats its first bar', () => {
    const lab = labFromStyle(getStyle('medium-swing'))
    const two = setBars(lab, 2)
    expect(two.drums.ride).toHaveLength(32)
    expect(two.drums.ride?.slice(16)).toEqual(lab.drums.ride)
    expect(setBars(two, 1).drums.ride).toEqual(lab.drums.ride)
  })

  test('without a bass pattern the bass walks', () => {
    const lab = labFromStyle(getStyle('bossa-nova'))
    const silent = { ...lab, bass: { walking: false, steps: lab.bass.steps.map(() => null) } }
    expect(styleFromLab(silent).bass.mode).toBe('walking')
  })

  test('a style from a link is checked and repaired', () => {
    for (const style of STYLES) {
      const lab = labFromStyle(style)
      expect(normalizeLab(JSON.parse(JSON.stringify(lab))), style.id).toEqual(lab)
    }
    expect(normalizeLab(null)).toBeNull()
    expect(normalizeLab('nonsense')).toBeNull()
    expect(normalizeLab({ base: 'no-such-style' })).toBeNull()

    const odd = normalizeLab({
      base: 'funk',
      name: 'x'.repeat(500),
      swing: 9,
      beats: 7,
      bars: 5,
      drums: { kick: [{ vel: 900 }, 'junk', null], laser: [{ vel: 90 }], __proto__: [{ vel: 1 }] },
      bass: { steps: ['R', 'X', 3] },
      comp: [true, 'yes'],
    })!
    expect(odd.name).toHaveLength(60)
    expect(odd.swing).toBe(0.75)
    expect([odd.beats, odd.bars]).toEqual([4, 1])
    expect(Object.keys(odd.drums)).toEqual(['kick'])
    expect(odd.drums.kick?.slice(0, 3)).toEqual([{ vel: 127 }, null, null])
    expect(odd.drums.kick).toHaveLength(16)
    expect(odd.bass.steps.slice(0, 3)).toEqual(['R', null, null])
    expect(odd.comp.slice(0, 2)).toEqual([true, false])
    expect(() => styleFromLab(odd)).not.toThrow()
  })
})

describe('style links', () => {
  test('a style survives a share link', async () => {
    globalThis.window ??= { location: { href: 'https://openstand.test/' } } as unknown as Window & typeof globalThis
    const { labFromHash, styleShareUrl } = await import('../src/formats/share')
    const lab = { ...labFromStyle(getStyle('samba')), name: 'Samba de Can' }
    const url = await styleShareUrl(lab)
    expect(url.length).toBeLessThan(2500)
    expect(await labFromHash(new URL(url).hash)).toEqual(lab)
    expect(await labFromHash('#style=garbage')).toBeNull()

    // With a tune to hear it on
    const { chartFromHash } = await import('../src/formats/share')
    const withTune = await styleShareUrl(lab, tune)
    expect(await labFromHash(new URL(withTune).hash)).toEqual(lab)
    expect((await chartFromHash(new URL(withTune).hash))?.title).toBe('Lab')
  })
})
