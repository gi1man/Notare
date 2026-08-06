/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
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
