/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        turf: {
          50:  '#f1f8f4',
          100: '#dcecdf',
          200: '#b5d7c0',
          300: '#84b896',
          400: '#52996d',
          500: '#2d7d4f',
          600: '#1f6840',
          700: '#175133',
          800: '#0f5132',
          900: '#0c3d27',
          950: '#06251a',
        },
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        sans:    ['Geist', 'system-ui', 'sans-serif'],
        mono:    ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      maxWidth: {
        page: '1280px',
      },
      boxShadow: {
        diffusion: '0 15px 35px -18px rgba(0,0,0,0.18)',
        'inset-hi': 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
