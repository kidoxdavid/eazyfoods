import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    force: true, // Force re-optimization on startup
    include: ['react', 'react-dom', 'react-router-dom', 'axios', '@react-google-maps/api']
  },
  server: {
    port: 3003,
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
    // Ensure file changes are detected (fixes real-time updates vs other frontends)
    watch: {
      usePolling: true,
      interval: 300,
    },
    hmr: true,
    // Disable caching in development for immediate updates
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // Ensure proper cache busting in development
  build: {
    rollupOptions: {
      output: {
        // Add hash to filenames for cache busting
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  }
})
