/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base:        '#f5f4ff',
        surface:     '#ffffff',
        'surface-2': '#f0effe',
        'surface-3': '#e4e2f5',
        accent:      '#7c3aed',
        'accent-2':  '#6d28d9',
        'accent-dim':'rgba(124,58,237,0.10)',
        ink:         '#1a1838',
        'ink-2':     '#4e4c6e',
        'ink-3':     '#9896b4',
        success:     '#16a34a',
        danger:      '#dc2626',
        warn:        '#d97706',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spin-disc': {
          to: { transform: 'rotate(360deg)' },
        },
        'blink': {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.25' },
        },
        'bar1': { '0%,100%': { height: '4px' }, '50%': { height: '14px' } },
        'bar2': { '0%,100%': { height: '10px' }, '50%': { height: '4px' } },
        'bar3': { '0%,100%': { height: '6px' }, '50%': { height: '16px' } },
      },
      animation: {
        'fade-up':    'fade-up 0.2s ease-out',
        'spin-disc':  'spin-disc 8s linear infinite',
        'blink':      'blink 1.4s ease-in-out infinite',
        'bar1':       'bar1 0.9s ease-in-out infinite',
        'bar2':       'bar2 0.9s ease-in-out infinite 0.15s',
        'bar3':       'bar3 0.9s ease-in-out infinite 0.3s',
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
