import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const PRODUCTION_API_URL = 'https://eazyfoods-api.onrender.com/api/v1'

// Android build config — run with: vite build --config vite.config.android.js --mode android
// Injects the API URL directly into index.html as a <script> tag so it is available
// before any JS module loads — this is the most reliable method for Capacitor WebViews.
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-android-api-url',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head><script>window.API_BASE_URL = '${PRODUCTION_API_URL}';</script>`
        )
      },
    },
  ],
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
