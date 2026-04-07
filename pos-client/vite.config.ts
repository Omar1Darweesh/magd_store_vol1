import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,    // ← Add this for network access
    port: 5173,
    headers: {
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*",
    },
  },
})
