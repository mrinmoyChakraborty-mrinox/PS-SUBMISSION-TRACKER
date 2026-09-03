/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'hsl(220, 95%, 95%)',
          100: 'hsl(220, 95%, 90%)',
          200: 'hsl(220, 95%, 80%)',
          300: 'hsl(220, 95%, 70%)',
          400: 'hsl(220, 95%, 60%)',
          500: 'hsl(220, 95%, 50%)',
          600: 'hsl(220, 95%, 40%)',
          700: 'hsl(220, 95%, 30%)',
          800: 'hsl(220, 95%, 20%)',
          900: 'hsl(220, 95%, 10%)',
        },
        accent: {
          50: 'hsl(240, 95%, 95%)',
          100: 'hsl(240, 95%, 90%)',
          200: 'hsl(240, 95%, 80%)',
          300: 'hsl(240, 95%, 70%)',
          400: 'hsl(240, 95%, 60%)',
          500: 'hsl(240, 95%, 50%)',
          600: 'hsl(240, 95%, 40%)',
          700: 'hsl(240, 95%, 30%)',
          800: 'hsl(240, 95%, 20%)',
          900: 'hsl(240, 95%, 10%)',
        },
        surface: {
          dark: '#0a0f1e',
          card: '#111827',
          border: '#1f2937',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'count-change': 'countChange 1s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)', boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)' },
          '50%': { opacity: .7, transform: 'scale(1.05)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.8)' },
        },
        countChange: {
          '0%': { transform: 'scale(1)', color: 'inherit', textShadow: 'none' },
          '50%': { transform: 'scale(1.1)', color: '#3b82f6', textShadow: '0 0 15px #3b82f6' },
          '100%': { transform: 'scale(1)', color: 'inherit', textShadow: 'none' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}
