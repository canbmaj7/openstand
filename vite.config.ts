import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    // Works offline after the first visit, sound bank included
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'OpenStand',
        short_name: 'OpenStand',
        description: 'Practice with a band in your browser: chord charts with generated bass, piano and drums.',
        theme_color: '#e6e1d6',
        background_color: '#e6e1d6',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png}'],
        // The sound bank is cached the first time the app downloads it, so it is not fetched twice
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/soundfonts/'),
            handler: 'CacheFirst',
            options: { cacheName: 'soundbank', expiration: { maxEntries: 4 } },
          },
        ],
      },
    }),
  ],
})
