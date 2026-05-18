/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        primary: {
          light: '#06b6d4',
          DEFAULT: '#0891b2',
          dark: '#155e75',
        },
        slate: {
          850: '#151e2e',
        }
      },
    },
  },
  plugins: [],
}
