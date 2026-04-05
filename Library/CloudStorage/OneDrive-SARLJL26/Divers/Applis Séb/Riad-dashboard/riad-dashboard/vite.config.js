import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // JS exclu du précache statique → toujours récupéré depuis le réseau
        globPatterns: ['**/*.{css,html,ico,png,svg}'],
        runtimeCaching: [
          // Assets JS : NetworkFirst — réseau en priorité, cache en fallback
          {
            urlPattern: /\/assets\/.*\.js$/i,
            handler: 'NetworkFirst',
            options: {
              networkTimeoutSeconds: 5,
              cacheName: 'js-assets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          // Firebase Firestore
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              networkTimeoutSeconds: 5,
              cacheName: 'firebase-cache',
            },
          },
          {
            urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              networkTimeoutSeconds: 5,
              cacheName: 'google-apis-cache',
            },
          },
          // Proxy iCal interne Vercel
          {
            urlPattern: /\/api\/ical/i,
            handler: 'NetworkFirst',
            options: {
              networkTimeoutSeconds: 6,
              cacheName: 'ical-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 30,
              },
            },
          },
          // Fallback proxy allorigins
          {
            urlPattern: /api\.allorigins\.win/i,
            handler: 'NetworkFirst',
            options: {
              networkTimeoutSeconds: 6,
              cacheName: 'allorigins-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 30,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Kasbah Blanca Marrakech',
        short_name: 'Kasbah Blanca',
        description: 'Tableau de bord locatif',
        theme_color: '#f5ede8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
    }),
  ],
})
// force-rebuild-v3
