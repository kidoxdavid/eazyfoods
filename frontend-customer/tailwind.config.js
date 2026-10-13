/** @type {import('tailwindcss').Config} */
// EazyFoods "Atelier" design system: warm paper, near-black ink, deep forest green, restrained terracotta.
// Legacy class names (gray-*, primary-*, nude-*) map onto this palette so every page inherits it.

const ink = {
  50: '#F6F3EC', 100: '#ECE7DC', 200: '#D9D2C3', 300: '#B8B1A2', 400: '#716C62',
  500: '#6B665D', 600: '#57534C', 700: '#3D3A35', 800: '#2A2825', 900: '#1B1A17',
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // Crisper corners than Tailwind's defaults: cards and inputs read as printed paper, not bubbles.
    borderRadius: {
      none: '0', sm: '2px', DEFAULT: '3px', md: '4px', lg: '6px', xl: '8px',
      '2xl': '12px', '3xl': '16px', '4xl': '20px', full: '9999px',
    },
    boxShadow: {
      sm: '0 1px 0 rgba(27,26,23,0.04)',
      DEFAULT: '0 1px 2px rgba(27,26,23,0.06)',
      md: '0 6px 16px -8px rgba(27,26,23,0.16)',
      lg: '0 14px 32px -14px rgba(27,26,23,0.22)',
      xl: '0 24px 48px -20px rgba(27,26,23,0.28)',
      '2xl': '0 32px 64px -24px rgba(27,26,23,0.32)',
      soft: '0 1px 2px rgba(27,26,23,0.05)',
      lift: '0 14px 32px -14px rgba(27,26,23,0.24)',
      inner: 'inset 0 1px 2px rgba(27,26,23,0.06)',
      none: 'none',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Fraunces', 'Newsreader', 'Georgia', 'Times New Roman', 'serif'],
      },
      letterSpacing: { eyebrow: '0.14em' },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { 'fade-up': 'fade-up .45s cubic-bezier(.2,.7,.2,1) both', shimmer: 'shimmer 1.6s infinite' },
      colors: {
        paper: { 50: '#FDFCFA', 100: '#FAF7F2', 200: '#F3EEE5', 300: '#E9E1D3', 400: '#D8CDB9' },
        cream: { 50: '#FDFCFA', 100: '#FAF7F2', 200: '#F3EEE5', 300: '#E9E1D3' }, // legacy alias of paper
        ink,
        gray: ink,
        // Primary: deep forest green
        primary: {
          50: '#EEF4EF', 100: '#D9E8DC', 200: '#B3D1BA', 300: '#85B293', 400: '#4F8A64',
          500: '#2F6B47', 600: '#1F4D36', 700: '#183D2A', 800: '#112E20', 900: '#0B2016',
        },
        forest: {
          50: '#EEF4EF', 100: '#D9E8DC', 200: '#B3D1BA', 300: '#85B293', 400: '#4F8A64',
          500: '#2F6B47', 600: '#1F4D36', 700: '#183D2A', 800: '#112E20', 900: '#0B2016',
        },
        // Accent: terracotta (kept under the legacy "nude" key)
        nude: {
          50: '#FBF1EC', 100: '#F6DDD2', 200: '#EDBCA7', 300: '#E19A7E', 400: '#D27553',
          500: '#C25A38', 600: '#B4462B', 700: '#9A3A22', 800: '#7D2F1C', 900: '#5F2415',
        },
        clay: {
          50: '#FBF1EC', 100: '#F6DDD2', 200: '#EDBCA7', 300: '#E19A7E', 400: '#D27553',
          500: '#C25A38', 600: '#B4462B', 700: '#9A3A22', 800: '#7D2F1C', 900: '#5F2415',
        },
        // Secondary accent: ochre / saffron, used sparingly for highlights
        ochre: {
          50: '#FBF4E4', 100: '#F5E5BE', 200: '#EBCE88', 300: '#DFB257', 400: '#CF9634',
          500: '#BC8023', 600: '#A8681A', 700: '#8A5314', 800: '#6B3F10', 900: '#4D2D0B',
        },
        orange: { 500: '#C25A38', 600: '#B4462B', 700: '#9A3A22' },
        green: { 600: '#1F4D36', 700: '#183D2A' },
      },
    },
  },
  plugins: [],
}
