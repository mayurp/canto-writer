import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { version as packageVersion } from './package.json'

const getVersion = () => {
  try {
    const githash = execSync('git rev-parse --short HEAD').toString().trim()
    const suffix = process.env.NODE_ENV === 'development' ? '-dev': ''
    return `${packageVersion} ${githash}` + suffix
  } catch {
    throw new Error('Failed to read git commit hash')
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },  
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      workbox: {
        // Enable for caching logs
        //mode: 'development',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,csv}'],
        runtimeCaching: [
          {
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
