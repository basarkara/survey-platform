/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4F46E5', // Pollify İndigo
          accent: '#10B981',  // Pollify Zümrüt Yeşili
          bg: '#F9FAFB',      // Açık gri arkaplan
          dark: '#111827',    // Koyu metin rengi
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Yeni fontumuz
      }
    },
  },
  plugins: [],
}