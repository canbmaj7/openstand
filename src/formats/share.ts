// Share links: the whole chart travels in the URL fragment, compressed.
// No server is involved, and the fragment is never sent to one.

import type { Chart } from '../music/chart'
import { normalizeLab, type LabStyle } from '../styles/lab'

const PARAM = 'tune'
const STYLE_PARAM = 'style'

function toBase64Url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

async function encodeJson(value: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(value))
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))
}

async function decodeJson(value: string): Promise<unknown> {
  try {
    const json = await pipe(fromBase64Url(value), new DecompressionStream('deflate-raw'))
    return JSON.parse(new TextDecoder().decode(json))
  } catch {
    return null
  }
}

export const encodeChart = (chart: Chart) => encodeJson(chart)

export async function decodeChart(value: string): Promise<Chart | null> {
  const chart = (await decodeJson(value)) as Chart | null
  return chart && chart.format === 'openstand-chart' && Array.isArray(chart.bars) ? chart : null
}

function linkWith(params: Record<string, string>): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return url.toString()
}

const fromHash = (hash: string, param: string) => new URLSearchParams(hash.replace(/^#/, '')).get(param)

export async function shareUrl(chart: Chart): Promise<string> {
  return linkWith({ [PARAM]: await encodeChart(chart) })
}

export async function chartFromHash(hash: string): Promise<Chart | null> {
  const value = fromHash(hash, PARAM)
  return value ? decodeChart(value) : null
}

// A style made in the style lab travels the same way, with a tune to hear it on
export async function styleShareUrl(lab: LabStyle, chart?: Chart): Promise<string> {
  return linkWith({ [STYLE_PARAM]: await encodeJson(lab), ...(chart ? { [PARAM]: await encodeChart(chart) } : {}) })
}

export async function labFromHash(hash: string): Promise<LabStyle | null> {
  const value = fromHash(hash, STYLE_PARAM)
  return value ? normalizeLab(await decodeJson(value)) : null
}
