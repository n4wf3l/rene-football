/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Brand palette. Named `turf` for historical reasons (the site
           started on green) — kept as-is so we don't rename thousands of
           call sites when the palette shifts. Values now anchor on a
           deep, editorial blue: soft tints for backgrounds, high-contrast
           mids for accents, near-navy at the deep end. */
        turf: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0f2664',
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
