/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#0f3d22',
        },
        cream: { 50: '#fffdf9', 100: '#fdf8f0', 200: '#f8eedd' },
        // Legacy screens use gray-*; point it at the warm "ink" neutrals shared with the web storefront.
        gray: { 50: '#f6f7f6', 100: '#e8ebe8', 200: '#cdd3cd', 300: '#a5afa6', 400: '#78857a', 500: '#56635a', 600: '#3f4a42', 700: '#2c352f', 800: '#1d2520', 900: '#121814' },
        nude: {
          50:  '#fff4e6',
          100: '#ffe0b3',
          200: '#ffcc80',
          300: '#ffb84d',
          400: '#ffa31a',
          500: '#ff8c00',
          600: '#ff6b35',
          700: '#ff5500',
          800: '#e64a00',
          900: '#cc3d00',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
}
