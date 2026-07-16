import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'GROBOLD.ttf'],
      manifest: {
        name: 'Jumanji',
        short_name: 'Jumanji',
        description: 'Display collaborativo multi-dispositivo in tempo reale.',
        lang: 'it',
        theme_color: '#030a04',
        background_color: '#030a04',
        // Launch the installed PWA truly fullscreen (no browser/OS chrome), no user
        // gesture needed. display_override lets browsers that don't support 'fullscreen'
        // display mode fall back to standalone, then minimal-ui.
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone', 'minimal-ui'],
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell + self-hosted fonts + icons for offline loading.
        globPatterns: ['**/*.{js,css,html,svg,png,ttf,woff,woff2}'],
        // SPA deep links (/main/:code, /client/:code) resolve to index.html offline.
        navigateFallback: '/index.html',
        // Never cache Supabase REST/auth — always hit the network (realtime is a WebSocket, not cached).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
            options: { cacheName: 'supabase-network-only' },
          },
        ],
      },
      devOptions: {
        // Keep the service worker off during `npm run dev` to avoid caching surprises.
        enabled: false,
      },
    }),
  ],
})
