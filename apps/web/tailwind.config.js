/** The staff portals (admin, marketing, vendor/chef/restaurant, driver) use Tailwind exactly like the original EAZyfoods portals. The customer shop does not use it. */
export default {
  content: ['./portal.html', './src/portal/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: 'rgb(var(--p-50) / <alpha-value>)', 100: 'rgb(var(--p-100) / <alpha-value>)', 200: 'rgb(var(--p-200) / <alpha-value>)', 300: 'rgb(var(--p-300) / <alpha-value>)', 400: 'rgb(var(--p-400) / <alpha-value>)', 500: 'rgb(var(--p-500) / <alpha-value>)', 600: 'rgb(var(--p-600) / <alpha-value>)', 700: 'rgb(var(--p-700) / <alpha-value>)', 800: 'rgb(var(--p-800) / <alpha-value>)', 900: 'rgb(var(--p-900) / <alpha-value>)' },
      },
    },
  },
  plugins: [],
};
