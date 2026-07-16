import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['"Cinzel"', 'serif'],
        cinzel_deco: ['"Cinzel Decorative"', 'serif'],
        forum: ['"Forum"', 'serif'],
        grobold: ['"Grobold"', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      colors: {
        jungle: {
          950: '#030a04',
          900: '#071209',
          800: '#0d2010',
          700: '#143018',
          600: '#1b4020',
          500: '#235228',
          400: '#2d6934',
          300: '#3a8442',
          200: '#4ea855',
          100: '#6fcf77',
          50:  '#a8f0ad',
        },
        gold: {
          950: '#1a0f00',
          900: '#3d2400',
          800: '#6b3f00',
          700: '#9a5c00',
          600: '#c97a00',
          500: '#e89a00',
          400: '#f5b830',
          300: '#f9cc6a',
          200: '#fcdfa3',
          100: '#fef0d0',
        },
        glow: {
          green: '#00ff41',
          gold: '#ffd700',
        },

        // ── Client restyle palette (mockup: lightened jungle theme) ──
        // Additive only — MainDisplay/Landing keep the original jungle/gold.
        // Softer "brass" gold for client accents (and the slide-knob gradient).
        brass: {
          300: '#f2c85f',
          400: '#e6b64f',
          500: '#d29a2e',
        },
        // Warm cream for client headings / collection titles.
        parchment: '#f4ecd7',
        // Muted sage greens for client body text & secondary UI.
        sage: {
          50:  '#f0f6ec',
          100: '#dcecd4',
          200: '#c9e0c2',
          300: '#9dbf9a',
          400: '#8fb08c',
          500: '#7fa07f',
        },
        // Deep surfaces for the lightened client screen background.
        canopy: {
          700: '#15291b',
          800: '#0f2015',
          900: '#09140d',
        },
        // Card surface gradient stops + tender border/accents.
        frond: {
          from: '#23402c',
          to:   '#182e1f',
        },
        moss: '#94c994',
        signal: '#5fbf6a',
      },
      boxShadow: {
        glow_green: '0 0 8px 2px rgba(0,255,65,0.5)',
        glow_gold:  '0 0 8px 2px rgba(255,215,0,0.5)',
        glow_lg:    '0 0 20px 6px rgba(0,255,65,0.4)',
      },
      animation: {
        'pulse-glow':      'pulseGlow 2s ease-in-out infinite',
        'fade-in':         'fadeIn 0.4s ease-out forwards',
        'slide-up':        'slideUp 0.3s ease-out forwards',
        'typewriter':      'none',
        'materialize':     'materialize 6s ease-out forwards',
        'pulse-glow-gold': 'pulseGlowGold 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { textShadow: '0 0 6px rgba(0,255,65,0.6)' },
          '50%': { textShadow: '0 0 18px rgba(0,255,65,1)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        // Compositor-only reveal: animates ONLY opacity + transform (a "focus-in" from a
        // slightly larger scale) so old GPUs never re-rasterize. The gold glow is a static
        // text-shadow set in TypewriterText, not animated here — it fades in via opacity.
        materialize: {
          '0%':   { opacity: '0', transform: 'translateZ(0) scale(1.25)' },
          '100%': { opacity: '1', transform: 'translateZ(0) scale(1)' },
        },
        pulseGlowGold: {
          '0%, 100%': { textShadow: '0 0 10px rgba(249,204,106,0.5), 0 0 25px rgba(249,204,106,0.25)' },
          '50%':      { textShadow: '0 0 22px rgba(249,204,106,0.95), 0 0 50px rgba(249,204,106,0.5), 0 0 80px rgba(249,204,106,0.2)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
