// Android build config — no dev-server proxy, no localhost references.
// API URL is baked in via .env.android (VITE_API_BASE_URL).
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv('android', process.cwd(), '')
  return {
    plugins: [react()],
    define: {
      // Make sure the android env vars are available at build time
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || 'https://eazyfoods-api.onrender.com/api/v1'),
      'import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY || ''),
    },
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
  }
})
