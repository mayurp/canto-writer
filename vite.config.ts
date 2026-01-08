import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
  },  
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      workbox: {
        // Enable for to log caching
        //mode: 'development',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,csv}'],
        runtimeCaching: [
          {
            // Google doc includes redirect so this pattern matches both the original
            // request and redirect URL
            // TODO: try caching just the initial URL again?
            urlPattern: /^https:\/\/docs\.google\.com\/spreadsheets.*output=csv/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-sheets-csv',
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/hanzi-writer-data@.*\.json/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hanzi-writer-data',
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Canto Writer',
        short_name: 'CantoWriter',
        start_url: './',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        description: 'Learn chinese characters with cantonese',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: process.env.PUBLIC_URL ?? './',
})
