/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08090C',
          900: '#0C0F14',
          850: '#10141B',
          800: '#151B24',
          750: '#1A212D',
          700: '#232C3B',
          600: '#2E3A4E',
          500: '#41506A',
        },
        gold: {
          300: '#FFD98A',
          400: '#F8C566',
          500: '#F0A93F',
          600: '#DE922A',
          700: '#BC7418',
        },
        pole: {
          red: '#E14B5A',
          blue: '#3B82F6',
        },
        mint: {
          400: '#4ADE80',
          500: '#2FCE70',
        },
        cream: '#F4EDE1',
        muted: {
          DEFAULT: '#8B96A9',
          dark: '#5B6577',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(240,169,63,0.25), 0 8px 40px -8px rgba(240,169,63,0.25)',
        card: '0 8px 30px -12px rgba(0,0,0,0.6)',
        pop: '0 16px 50px -12px rgba(0,0,0,0.7)',
      },
      keyframes: {
        poleSlide: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' },
        },
        ringPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(240,169,63,0.5)' },
          '50%': { boxShadow: '0 0 0 12px rgba(240,169,63,0)' },
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
      },
      animation: {
        poleSlide: 'poleSlide 2.2s linear infinite',
        ringPulse: 'ringPulse 2s ease-out infinite',
        fadeUp: 'fadeUp .45s cubic-bezier(.22,.8,.36,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
