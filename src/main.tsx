import { Analytics } from '@vercel/analytics/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/ibm-plex-sans'
import '@fontsource/ibm-plex-mono/500.css'
import './index.css'
import App from './App.tsx'
import { startErrorReports } from './errorReports'
import { ErrorBoundary } from './ui/ErrorBoundary'

startErrorReports()

if (import.meta.env.PROD && 'serviceWorker' in navigator && navigator.serviceWorker) {
  window.addEventListener('load', () => {
    try {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    } catch {
      // Offline caching is optional; private browsing and restricted contexts disable service workers
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    {/* Visitor counts for the official site only: no cookies, and the address is cut before ? and #,
        so shared charts are never sent. Copies hosted elsewhere load nothing. */}
    {location.hostname === 'openstand-eta.vercel.app' && (
      <Analytics beforeSend={(event) => ({ ...event, url: event.url.split(/[?#]/)[0] })} />
    )}
  </StrictMode>,
)
