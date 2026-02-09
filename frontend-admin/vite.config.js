import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: [
      'gabbroid-quinn-competently.ngrok-free.dev',
      'localhost',
      '.ngrok-free.dev',
      '.ngrok.io',
      '192.168.4.21',
      /^192\.168\.\d+\.\d+$/
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
