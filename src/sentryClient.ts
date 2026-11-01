// Only the parts of Sentry that error reports use, so the downloaded chunk stays small.
// Loaded on demand by errorReports.ts.
export { captureException, dedupeIntegration, init, linkedErrorsIntegration } from '@sentry/browser'
