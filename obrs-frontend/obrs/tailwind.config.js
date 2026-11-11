/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff1f0', 100: '#ffe0dd', 200: '#ffc6c0', 300: '#ff9e94',
          400: '#ff6a5a', 500: '#f8432f', 600: '#e5281a', 700: '#c01d12',
          800: '#9e1c14', 900: '#831d17',
        },
        ink: { 900: '#0f172a', 700: '#334155', 500: '#64748b', 300: '#cbd5e1' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)',
        lift: '0 8px 30px rgba(15,23,42,.12)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        'pop': { '0%': { transform: 'scale(.6)', opacity: 0 }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        pop: 'pop .5s cubic-bezier(.2,.9,.3,1.2) both',
      },
    },
  },
  plugins: [],
};
