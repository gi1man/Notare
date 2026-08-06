/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f1e8',
          100: '#8fa99b',
          500: '#c75b39',
          600: '#0f4c45',
          700: '#2b2b29',
        },
        notare: {
          ink: '#0F4C45',
          'ink-hover': '#135c54',
          'ink-light': '#e6f0ee',
          terracotta: '#C75B39',
          'terracotta-hover': '#b54e2d',
          'terracotta-light': '#f9eeea',
          sage: '#8FA99B',
          'sage-light': '#eef3f0',
          parchment: '#F5F1E8',
          'parchment-dark': '#eae4d8',
          charcoal: '#2B2B29',
          'charcoal-light': '#3a3a37',
        },
      },
      fontSize: {
        'accessible-base': '1.125rem', // 18px base font default for accessibility
      },
      minHeight: {
        'tap-target': '48px',
      },
      minWidth: {
        'tap-target': '48px',
      },
    },
  },
  plugins: [],
};
