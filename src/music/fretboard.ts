import { closeVoicingTones, type Chord } from './chords'

// Standard guitar tuning (E2 A2 D3 G3 B3 E4) as pitch classes and MIDI note numbers
export const TUNING = [4, 9, 2, 7, 11, 4] as const
const MIDI = [40, 45, 50, 55, 59, 64] as const

export interface FretShape {
  frets: (number | null)[] // 6 strings from low E (0) to high E (5); null = muted (x)
  baseFret: number
}

interface Candidate extends FretShape {
  bassString: number
  bassFret: number
  coverage: number
  score: number
}

function isErgonomic(frets: (number | null)[], minFret: number): boolean {
  const fretted = frets.filter((f): f is number => f !== null && f > 0)
  if (fretted.length <= 4) return true
  // 5 or 6 fretted strings need an index-finger barre at minFret and at most 3 other fingers
  const firstBarred = frets.findIndex((f) => f === minFret)
  const lastPlayed = frets.findLastIndex((f) => f !== null)
  for (let s = firstBarred; s <= lastPlayed; s++) {
    if (frets[s] === null || frets[s]! < minFret) return false
  }
  return fretted.filter((f) => f > minFret).length <= 3
}

function isContiguousOrShell(played: number[]): boolean {
  const span = played[played.length - 1] - played[0] + 1
  if (span === played.length) return true
  // Jazz shell / drop-3 with bass on 6th string and 5th string muted
  return played[0] === 0 && played[1] === 2 && played[played.length - 1] - 2 + 1 === played.length - 1
}

export function guitarShapes(chord: Chord): [FretShape, FretShape] {
  const tones = closeVoicingTones(chord)
  const tonePcs = new Set(tones.map((t) => (chord.root + t) % 12))
  const required = new Set<number>([
    chord.root,
    (chord.root + tones[1]) % 12,
    ...(tones.length > 3 ? [(chord.root + tones[3]) % 12] : []),
    ...(tones[2] !== 7 ? [(chord.root + tones[2]) % 12] : []),
  ])

  const byKey = new Map<string, Candidate>()

  for (let bassString = 0; bassString <= 2; bassString++) {
    for (let bassFret = 0; bassFret <= 11; bassFret++) {
      if ((TUNING[bassString] + bassFret) % 12 !== chord.bass) continue

      const winStarts: number[] = []
      if (bassFret <= 4) winStarts.push(1)
      if (bassFret > 0) {
        for (let w = Math.max(1, bassFret - 3); w <= Math.min(11, bassFret); w++) {
          if (!winStarts.includes(w)) winStarts.push(w)
        }
      }

      for (const win of winStarts) {
        const choices: (number | null)[][] = Array.from({ length: 6 }, (_, s) => {
          if (s < bassString) return [null]
          if (s === bassString) return [bassFret]
          const opts: (number | null)[] = [null]
          if (win === 1 && tonePcs.has(TUNING[s])) opts.push(0)
          for (let f = win; f <= win + 3; f++) {
            if (tonePcs.has((TUNING[s] + f) % 12)) opts.push(f)
          }
          return opts
        })

        const cur: (number | null)[] = [null, null, null, null, null, null]
        const search = (s: number) => {
          if (s === 6) {
            const played: number[] = []
            for (let i = 0; i < 6; i++) if (cur[i] !== null) played.push(i)
            if (played.length < 4 || !isContiguousOrShell(played)) return

            for (let i = 1; i < played.length; i++) {
              if (MIDI[played[i]] + cur[played[i]]! <= MIDI[played[i - 1]] + cur[played[i - 1]]!) return
            }

            const fretted = played.map((i) => cur[i]!).filter((f) => f > 0)
            const minFret = fretted.length ? Math.min(...fretted) : 0
            const maxFret = fretted.length ? Math.max(...fretted) : 0
            if (fretted.length && maxFret - minFret > 3) return
            if (played.some((i) => cur[i] === 0) && maxFret > 4) return
            if (fretted.length && !isErgonomic(cur, minFret)) return

            const pcs = new Set(played.map((i) => (TUNING[i] + cur[i]!) % 12))
            let reqHits = 0
            for (const r of required) if (pcs.has(r)) reqHits++
            const coverage = reqHits * 30 + pcs.size * 12

            const contiguous = played[played.length - 1] - played[0] + 1 === played.length
            const openCount = played.filter((i) => cur[i] === 0).length
            const span = fretted.length ? maxFret - minFret : 0
            const baseFret = maxFret <= 4 ? 1 : minFret
            const score =
              coverage +
              (contiguous ? 16 : 0) +
              played.length * 4 +
              openCount * 2 -
              span * 3 -
              baseFret * 1.5 -
              bassFret * 0.5

            const key = cur.map((f) => f ?? 'x').join(',')
            const prev = byKey.get(key)
            if (!prev || score > prev.score) {
              byKey.set(key, { frets: [...cur], baseFret, bassString, bassFret, coverage, score })
            }
            return
          }
          for (const f of choices[s]) {
            cur[s] = f
            search(s + 1)
          }
        }
        search(0)
      }
    }
  }

  const all = [...byKey.values()]
  const maxCoverage = Math.max(0, ...all.map((c) => c.coverage))
  const strong = all.filter((c) => c.coverage >= maxCoverage - 12)
  const pool = strong.length >= 2 ? strong : all

  pool.sort((a, b) => a.baseFret - b.baseFret || a.bassFret - b.bassFret || b.score - a.score)
  const firstPos = pool[0]?.baseFret ?? 1
  const first =
    pool.filter((c) => c.baseFret === firstPos).sort((a, b) => b.score - a.score)[0] ??
    ({ frets: [null, null, 0, 0, 0, 0], baseFret: 1, bassString: 2, bassFret: 0, coverage: 0, score: 0 } as Candidate)

  const higher = pool.filter(
    (c) => c.baseFret >= first.baseFret + 2 || (c.bassString !== first.bassString && c.bassFret >= first.bassFret + 2),
  )
  const secondPool = higher.length ? higher : pool.filter((c) => c !== first)
  const nextPos = secondPool[0]?.baseFret ?? first.baseFret
  const second =
    secondPool.filter((c) => c.baseFret <= nextPos + 1).sort((a, b) => b.score - a.score)[0] ??
    secondPool[0] ??
    first

  return [
    { frets: first.frets, baseFret: first.baseFret },
    { frets: second.frets, baseFret: second.baseFret },
  ]
}
