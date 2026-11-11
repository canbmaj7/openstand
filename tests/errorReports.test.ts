import { describe, expect, test } from 'vitest'
import { parseUserAgent, prepareReport, scrubUrl } from '../src/errorReports'

describe('error reports', () => {
  test('shared charts and styles never leave in the address', () => {
    expect(scrubUrl('https://openstand-eta.vercel.app/#tune=abc')).toBe('https://openstand-eta.vercel.app/')
    expect(scrubUrl('https://openstand-eta.vercel.app/?x=1#style=abc&tune=def')).toBe('https://openstand-eta.vercel.app/')
    expect(scrubUrl('https://openstand-eta.vercel.app/path')).toBe('https://openstand-eta.vercel.app/path')
  })

  test('filters out third-party script noise and canceled service worker loads', () => {
    expect(prepareReport({ message: 'Script error.' }, 'https://openstand-eta.vercel.app/')).toBeNull()
    expect(prepareReport({ exception: { values: [{ value: 'Script error.' }] } }, 'https://openstand-eta.vercel.app/')).toBeNull()
    expect(
      prepareReport({ exception: { values: [{ value: "Can't find variable: wrsParams" }] } }, 'https://openstand-eta.vercel.app/'),
    ).toBeNull()
    expect(
      prepareReport({ exception: { values: [{ value: 'ServiceWorker script at /sw.js load failed' }] } }, 'https://openstand-eta.vercel.app/'),
    ).toBeNull()
    expect(
      prepareReport({ exception: { values: [{ value: 'Importing a module script is canceled.' }] } }, 'https://openstand-eta.vercel.app/'),
    ).toBeNull()
  })

  test('parses only coarse browser name, major version, and OS name from User-Agent', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      ),
    ).toEqual({ browser: { name: 'Safari', version: '17' }, os: { name: 'iOS' } })

    expect(
      parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.2420.65',
      ),
    ).toEqual({ browser: { name: 'Edge', version: '123' }, os: { name: 'Windows' } })

    expect(
      parseUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
      ),
    ).toEqual({ browser: { name: 'Chrome', version: '124' }, os: { name: 'Android' } })

    expect(parseUserAgent('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0')).toEqual({
      browser: { name: 'Firefox', version: '125' },
      os: { name: 'Linux' },
    })

    expect(parseUserAgent('')).toEqual({})
  })

  test('keeps real errors with scrubbed URL and coarse contexts only', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
    const event = prepareReport(
      {
        exception: { values: [{ value: 'TypeError: Cannot read properties of null' }] },
        user: { ip_address: '1.2.3.4' },
        breadcrumbs: [{ message: 'clicked' }],
      },
      'https://openstand-eta.vercel.app/?foo=1#tune=secret',
      ua,
    )
    expect(event).toEqual({
      exception: { values: [{ value: 'TypeError: Cannot read properties of null' }] },
      request: { url: 'https://openstand-eta.vercel.app/' },
      contexts: {
        browser: { name: 'Safari', version: '17' },
        os: { name: 'macOS' },
      },
    })
  })
})
