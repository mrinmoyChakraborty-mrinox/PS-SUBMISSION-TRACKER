/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ff6b00', // Saffron / Electric Orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        navy: {
          800: '#0f172a',
          900: '#090d16',
          950: '#030712',
        },
        surface: {
          light: '#f8fafc',
          lightCard: '#ffffff',
          dark: '#030712',
          darkCard: '#0f172a',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'orange-glow': 'orangeGlow 3s ease-in-out infinite',
        'count-change': 'countChange 1s ease-in-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)', boxShadow: '0 0 10px rgba(255, 107, 0, 0.5)' },
          '50%': { opacity: '.8', transform: 'scale(1.05)', boxShadow: '0 0 20px rgba(255, 107, 0, 0.8)' },
        },
        orangeGlow: {
          '0%, 100%': { opacity: '0.4', filter: 'blur(80px)' },
          '50%': { opacity: '0.7', filter: 'blur(110px)' },
        },
        countChange: {
          '0%': { transform: 'scale(1)', color: 'inherit' },
          '50%': { transform: 'scale(1.15)', color: '#ff6b00' },
          '100%': { transform: 'scale(1)', color: 'inherit' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
