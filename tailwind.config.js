/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warna biru khas PENS/Aplikasi dari mockup
        primary: '#005596', 
        secondary: '#EBF5FB',
      }
    },
  },
  plugins: [],
}