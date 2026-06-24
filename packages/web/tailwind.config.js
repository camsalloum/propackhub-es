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
        // gold: decorative (borders, icons, backgrounds) — #C8962A ~3.0:1 on white
        gold: '#C8962A',
        // gold-accessible: for text on white — #7A5800 gives ~6.0:1 (WCAG AA + AAA)
        // Use `text-gold-accessible` for selling price, headings, and any text that must pass contrast
        'gold-accessible': '#7A5800',
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