export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: '#FF6B35',
        blue: '#2563EB',
        success: '#10B981',
        accent: '#7C3AED',
        'brand-primary': '#4F46E5', // Indigo-600
        'brand-secondary': '#8B5CF6', // Violet-500
        'brand-accent': '#F43F5E', // Rose-500
        'pearl-bg': '#FDFDFF',
        'glass-white': 'rgba(255, 255, 255, 0.7)',
        'text-main': '#1E293B', // Slate-800
        'text-secondary': '#64748B', // Slate-500
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
        hindi: ['"Noto Sans Devanagari"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'mesh-gradient': 'meshGradient 15s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        meshGradient: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        }
      }
    },
  },
  plugins: [],
}
