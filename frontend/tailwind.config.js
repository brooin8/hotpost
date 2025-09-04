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
          50: '#FFF5F2',
          100: '#FFE6DC',
          200: '#FFC5A6', // Main light color
          300: '#FDAC98', // Secondary light color
          400: '#DC8E90', // Mid tone
          500: '#A97882', // Dark mid tone
          600: '#58545F', // Darkest
          700: '#4A404A',
          800: '#3C323C',
          900: '#2E252E',
        },
        // Custom gradient colors
        peach: '#FFC5A6',
        coral: '#FDAC98',
        rose: '#DC8E90',
        mauve: '#A97882',
        charcoal: '#58545F',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(255, 197, 166, 0.4), 0 0 40px rgba(255, 197, 166, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(255, 197, 166, 0.6), 0 0 60px rgba(255, 197, 166, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0px)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(255, 197, 166, 0.3)',
        'glow': '0 0 20px rgba(255, 197, 166, 0.4)',
        'glow-lg': '0 0 30px rgba(255, 197, 166, 0.5)',
        'coral-glow': '0 0 20px rgba(253, 172, 152, 0.4)',
        'rose-glow': '0 0 20px rgba(220, 142, 144, 0.4)',
      },
    },
  },
  plugins: [],
}
