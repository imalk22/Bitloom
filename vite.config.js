import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Backend to forward /api and /socket.io to during `npm run dev`.
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:3001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: ['**/.superpowers/**'],
    },
    // Same-origin dev: the browser only ever talks to the Vite host, and Vite
    // forwards API + Socket.IO to the backend. No CORS, and the app uses the
    // same relative `/api/...` paths it uses in production.
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/socket.io': { target: BACKEND, changeOrigin: true, ws: true },
    },
  },
})
