import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDir = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'aico',
        short_name: 'aico',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0b0c',
        theme_color: '#0b0b0c',
        icons: [
          { src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@transit/shared': resolve(rootDir, '../shared')
    }
  },
  server: {
    fs: { allow: [resolve(rootDir, '..')] },
    port: Number(process.env.VITE_PORT) || 5173
  }
})
