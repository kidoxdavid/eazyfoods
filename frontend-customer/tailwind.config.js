/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'ui-serif', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(20,35,24,0.04), 0 8px 24px -8px rgba(20,35,24,0.10)',
        lift: '0 2px 4px rgba(20,35,24,0.06), 0 18px 40px -12px rgba(20,35,24,0.22)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { 'fade-up': 'fade-up .5s ease-out both', shimmer: 'shimmer 1.6s infinite' },
      colors: {
        cream: { 50: '#fffdf9', 100: '#fdf8f0', 200: '#f8eedd', 300: '#f0e0c4' },
        ink: { 50: '#f6f7f6', 100: '#e8ebe8', 200: '#cdd3cd', 300: '#a5afa6', 400: '#78857a', 500: '#56635a', 600: '#3f4a42', 700: '#2c352f', 800: '#1d2520', 900: '#121814' },
        // Legacy pages use gray-*; point it at the warm ink scale so they match the new design without per-page edits.
        gray: { 50: '#f6f7f6', 100: '#e8ebe8', 200: '#cdd3cd', 300: '#a5afa6', 400: '#78857a', 500: '#56635a', 600: '#3f4a42', 700: '#2c352f', 800: '#1d2520', 900: '#121814' },
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        nude: {
          50: '#fff4e6',
          100: '#ffe0b3',
          200: '#ffcc80',
          300: '#ffb84d',
          400: '#ffa31a',
          500: '#ff8c00', // Skip the Dishes style orange
          600: '#ff6b35', // Vibrant orange
          700: '#ff5500', // Deeper orange
          800: '#e64a00', // Darker orange
          900: '#cc3d00', // Darkest orange
        },
      },
    },
  },
  plugins: [],
}

