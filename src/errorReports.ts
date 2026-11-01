// Error reports from the official site, so problems in someone's browser get fixed without
// them having to tell us. What is sent: the error, where in the code it happened, the browser
// and the page path. What is not: charts or styles (they live in the address after #, which is
// cut off), the address's query, cookies, IP-based user info, or anything typed.
// The reporting code is downloaded only when an error actually happens.

const OFFICIAL_HOST = 'openstand-eta.vercel.app'
const DSN: string | undefined = import.meta.env.VITE_SENTRY_DSN
const MAX_REPORTS = 10 // per page load, so a loop of errors doesn't flood the reports

// The address without the query and the fragment: shared charts and styles travel after #
export function scrubUrl(url: string): string {
  return url.split(/[?#]/)[0]
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
          event.request = { url: scrubUrl(location.href) }
          delete event.user
          delete event.breadcrumbs
          return event
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
