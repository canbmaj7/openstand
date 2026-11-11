// Error reports from the official site, so problems in someone's browser get fixed without
// them having to tell us. What is sent: the error, where in the code it happened, the browser
// name and major version, the operating system name, and the page path. What is not: charts or
// styles (they live in the address after #, which is cut off), the address's query, HTTP headers
// or the full User-Agent string, screen size, language, cookies, IP-based user info, or anything
// typed. The reporting code is downloaded only when an error actually happens.

const OFFICIAL_HOST = 'openstand-eta.vercel.app'
const DSN: string | undefined = import.meta.env.VITE_SENTRY_DSN
const MAX_REPORTS = 10 // per page load, so a loop of errors doesn't flood the reports
const IGNORED_SUBSTRINGS = ['wrsParams', 'sw.js', 'Importing a module script is canceled']

const BROWSERS: [string, RegExp][] = [
  ['Edge', /Edg(?:e|A|iOS)?\/(\d+)/],
  ['Opera', /OPR\/(\d+)/],
  ['Firefox', /(?:Firefox|FxiOS)\/(\d+)/],
  ['Chrome', /(?:Chrome|CriOS)\/(\d+)/],
  ['Safari', /Version\/(\d+).*Safari\//],
]

const SYSTEMS: [string, RegExp][] = [
  ['iOS', /iPhone|iPad|iPod/],
  ['Android', /Android/],
  ['Windows', /Windows/],
  ['macOS', /Macintosh|Mac OS X/],
  ['ChromeOS', /CrOS/],
  ['Linux', /Linux/],
]

// The address without the query and the fragment: shared charts and styles travel after #
export function scrubUrl(url: string): string {
  return url.split(/[?#]/)[0]
}

// Coarse browser name/major version and OS name only; the full User-Agent string is never sent
export function parseUserAgent(ua: string): { browser?: { name: string; version: string }; os?: { name: string } } {
  const out: { browser?: { name: string; version: string }; os?: { name: string } } = {}
  for (const [name, pattern] of BROWSERS) {
    const match = ua.match(pattern)
    if (match) {
      out.browser = { name, version: match[1] }
      break
    }
  }
  for (const [name, pattern] of SYSTEMS) {
    if (pattern.test(ua)) {
      out.os = { name }
      break
    }
  }
  return out
}

export interface ReportEvent {
  message?: string
  exception?: { values?: Array<{ value?: string }> }
  request?: { url?: string }
  contexts?: Record<string, Record<string, unknown> | undefined>
  user?: unknown
  breadcrumbs?: unknown
}

export function prepareReport<T extends ReportEvent>(
  event: T,
  url: string = location.href,
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): T | null {
  const messages = [event.message, ...(event.exception?.values?.map((v) => v.value) ?? [])].filter(
    (m): m is string => typeof m === 'string',
  )
  if (messages.some((m) => m === 'Script error.' || IGNORED_SUBSTRINGS.some((s) => m.includes(s)))) {
    return null
  }
  event.request = { url: scrubUrl(url) }
  const { browser, os } = parseUserAgent(ua)
  event.contexts = { ...(browser ? { browser } : {}), ...(os ? { os } : {}) }
  delete event.user
  delete event.breadcrumbs
  return event
}

let sent = 0
let sentry: Promise<typeof import('./sentryClient') | null> | null = null

function load() {
  sentry ??= import('./sentryClient')
    .then((Sentry) => {
      Sentry.init({
        dsn: DSN,
        release: `openstand@${__APP_VERSION__}`,
        environment: 'production',
        // No breadcrumbs, console capture, sessions or request context: only the errors passed in below
        defaultIntegrations: false,
        integrations: [Sentry.linkedErrorsIntegration(), Sentry.dedupeIntegration()],
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
          stackFrameVariables: false,
        },
        beforeSend(event) {
          return prepareReport(event)
        },
      })
      return Sentry
    })
    .catch(() => null)
  return sentry
}

export function reportError(error: unknown, where?: string) {
  if (!DSN || location.hostname !== OFFICIAL_HOST || sent >= MAX_REPORTS) return
  sent++
  void load().then((Sentry) => Sentry?.captureException(error, where ? { tags: { where } } : undefined))
}

export function startErrorReports() {
  if (!DSN || location.hostname !== OFFICIAL_HOST) return
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'window'))
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'))
}
