/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Support dark mode toggle
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#85a4ff',
          500: '#4f75ff',
          600: '#2b4cff',
          700: '#1b32eb',
          800: '#1727be',
          900: '#192696',
          950: '#10175b',
        },
        slate: {
          850: '#151f32',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
