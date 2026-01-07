import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: {
    // (replaces process.env.BUILD_DATE with actual build timestamp - for logging)
    "process.env.BUILD_DATE": JSON.stringify(new Date().toISOString()),
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },  
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We handle registration manually following dexie-cloud example
      injectRegister: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // pre-caching for "strategies" above
      injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,csv}'],
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
