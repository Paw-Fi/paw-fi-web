/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#E4DDFC',  // Light purple for background
          DEFAULT: '#C8BCF6', // Main purple color from header
          dark: '#9181FF',   // Darker purple for accents
        },
      },
    },
  },
  plugins: [],
}
