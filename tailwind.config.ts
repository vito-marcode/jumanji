import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['"Cinzel"', 'serif'],
        cinzel_deco: ['"Cinzel Decorative"', 'serif'],
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
        materialize: {
          '0%':   { filter: 'blur(18px)', opacity: '0',    textShadow: 'none',                                                              transform: 'translateZ(0)' },
          '40%':  { filter: 'blur(7px)',  opacity: '0.5',                                                                                    transform: 'translateZ(0)' },
          '65%':  { filter: 'blur(3px)',  opacity: '0.75',                                                                                   transform: 'translateZ(0)' },
          '80%':  { filter: 'blur(1.5px)',opacity: '0.88',                                                                                   transform: 'translateZ(0)' },
          '90%':  { filter: 'blur(0.5px)',opacity: '0.95',                                                                                   transform: 'translateZ(0)' },
          '100%': { filter: 'blur(0px)',  opacity: '1',    textShadow: '0 0 10px rgba(249,204,106,0.7), 0 0 30px rgba(249,204,106,0.35)', transform: 'translateZ(0)' },
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
