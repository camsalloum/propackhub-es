/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0F1F3D',
        gold: '#C8962A',
        slate: '#F4F5F7',
        ink: '#1A1D23',
        mist: '#8A8E97',
        success: '#1A7F5A',
        warning: '#B8820A',
        danger: '#C0392B',
        border: '#E2E4E8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}