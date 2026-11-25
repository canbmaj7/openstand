import type { PracticeOptions } from './timeline'

// Transposition for each chorus, kept within -5..+6 so the band's register doesn't drift
export function chorusTranspose(transpose: number, keyStep: number, chorus: number): number {
  return ((((transpose + keyStep * chorus + 5) % 12) + 12) % 12) - 5
}

// Deterministic 32-bit PRNG (Mulberry32) so timeline and UI agree on random keys
function nextUint32(state: { s: number }): number {
  state.s = (state.s + 0x6d2b79f5) | 0
  let t = Math.imul(state.s ^ (state.s >>> 15), 1 | state.s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return (t ^ (t >>> 14)) >>> 0
}

function shuffle(items: number[], rng: { s: number }): number[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = nextUint32(rng) % (i + 1)
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

// One 12-chorus block of distinct semitone offsets (0..11).
// Block 0 always begins at 0 (written key); subsequent blocks never repeat the previous block's last key.
function randomKeyBlock(seed: number, block: number, prevLast?: number): number[] {
  const rng = { s: (seed ^ Math.imul(block + 1, 0x9e3779b1)) | 0 }
  if (block === 0) {
    return [0, ...shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], rng)]
  }
  const keys = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], rng)
  if (prevLast !== undefined && keys[0] === prevLast) {
    const swapIdx = 1 + (nextUint32(rng) % 11)
    ;[keys[0], keys[swapIdx]] = [keys[swapIdx], keys[0]]
  }
  return keys
}

/**
 * Returns the chorus transposition in semitones (-5..+6), supporting both fixed keyStep
 * and seeded randomKeys (12 distinct keys per block, starting at 0, no consecutive repeat).
 */
export function chorusKeyOffset(
  practice: Pick<PracticeOptions, 'keyStep' | 'randomKeys'>,
  chorus: number,
  transpose = 0,
): number {
  if (practice.randomKeys) {
    const c = Math.max(0, Math.floor(chorus))
    const block = Math.floor(c / 12)
    let prevLast: number | undefined
    let keys: number[] = []
    for (let b = 0; b <= block; b++) {
      keys = randomKeyBlock(practice.randomKeys.seed | 0, b, prevLast)
      prevLast = keys[keys.length - 1]
    }
    return chorusTranspose(transpose, keys[c % 12], 1)
  }
  return chorusTranspose(transpose, practice.keyStep ?? 0, chorus)
}
