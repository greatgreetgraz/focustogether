import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'FocusTogether',
        short_name: 'FocusTogether',
        description: 'Calm, steady focus sessions for students.',
        lang: 'th',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#F6F4EF',
        background_color: '#F6F4EF',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Never serve the SPA shell for Firebase auth helper paths.
        navigateFallbackDenylist: [/^\/__\//, /^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
      },
    }),
  ],
})
