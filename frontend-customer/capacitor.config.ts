import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ca.eazyfoods.app',
  appName: 'eazyfoods',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // In production leave androidScheme as https so cookies and storage work correctly.
    androidScheme: 'https',
    // cleartext must stay false in production; Android blocks HTTP by default.
    cleartext: false,
    // Allow the app to open external links (Google Maps, payment pages, etc.)
    allowNavigation: ['*.google.com', '*.googleapis.com', '*.stripe.com', '*.helcim.com'],
  },
  android: {
    // Minimum SDK 24 = Android 7.0 (2016); covers 99%+ of active devices.
    minWebViewVersion: 87,
    backgroundColor: '#ff6b35',
    // Keep the splash screen visible until Angular/React bootstrap is done.
    hideLogs: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // Web client ID — used to request an ID token verifiable by the backend
      serverClientId: process.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '',
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ff6b35',
      androidSplashResourceName: 'splash',
      showSpinner: true,
      spinnerColor: '#ffffff',
      // Use native resize mode so splash fills the full screen.
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ff6b35',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
