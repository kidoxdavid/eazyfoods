import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Android build config — run with: vite build --config vite.config.android.js --mode android
// Vite automatically loads .env.android when --mode android is passed, so VITE_API_BASE_URL
// is injected from .env.android without any manual define block.
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', '@react-google-maps/api'],
    exclude: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules/@stripe')) return 'stripe'
        },
      },
    },
  },
})
