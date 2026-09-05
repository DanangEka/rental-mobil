/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        c57: {
          red:           '#810100',
          'red-dark':    '#630000',
          'red-light':   '#991A19',
          'red-soft':    '#F5E6E6',
          charcoal:      '#1B1717',
          'charcoal-soft': '#2A2525',
          slate:         '#3D3636',
          cotton:        '#EDEBDD',
          'cotton-light': '#F5F3EA',
          'cotton-dark':  '#D8D5C7',
          cream:         '#F8F6F0',
          ivory:         '#FAFAF6',
        },
        /* Keep brand as alias for backwards compatibility */
        brand: {
          50:  '#F5E6E6',
          100: '#E8CCCC',
          200: '#D19999',
          300: '#BA6666',
          400: '#A33333',
          500: '#810100',
          600: '#730100',
          700: '#630000',
          800: '#500000',
          900: '#3D0000',
          950: '#2A0000',
        },
      },
      screens: {
        'xs': '475px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      fontSize: {
        'xs':   ['0.75rem',  { lineHeight: '1rem' }],
        'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem',     { lineHeight: '1.5rem' }],
        'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':  ['1.5rem',   { lineHeight: '2rem' }],
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(129,1,0,0.4)' },
          '50%':      { boxShadow: '0 0 20px rgba(129,1,0,0.8)' },
        },
        progressBar: {
          '0%':   { width: '100%' },
          '100%': { width: '0%' },
        },
        popIn: {
          '0%':   { opacity: '0', transform: 'scale(0.8)' },
          '70%':  { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        swing: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%':      { transform: 'rotate(15deg)' },
          '40%':      { transform: 'rotate(-12deg)' },
          '60%':      { transform: 'rotate(8deg)' },
          '80%':      { transform: 'rotate(-5deg)' },
        },
        dropdownIn: {
          '0%':   { opacity: '0', transform: 'translateY(-8px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        fadeInUp:     'fadeInUp 0.6s ease-out both',
        fadeIn:       'fadeIn 0.5s ease-out both',
        slideInRight: 'slideInRight 0.4s ease-out both',
        slideInLeft:  'slideInLeft 0.4s ease-out both',
        shimmer:      'shimmer 2s infinite linear',
        float:        'float 3s ease-in-out infinite',
        pulseGlow:    'pulseGlow 2s ease-in-out infinite',
        progressBar:  'progressBar 3s linear forwards',
        popIn:        'popIn 0.3s ease-out both',
        swing:        'swing 0.6s ease-in-out',
        dropdownIn:   'dropdownIn 0.2s cubic-bezier(0.16,1,0.3,1) both',
      },
      boxShadow: {
        'brand':    '0 4px 15px rgba(129, 1, 0, 0.3)',
        'brand-lg': '0 8px 30px rgba(129, 1, 0, 0.4)',
        'c57-red':  '0 4px 20px rgba(129, 1, 0, 0.35)',
        'c57-cotton': '0 4px 20px rgba(237, 235, 221, 0.35)',
        'card':     '0 2px 20px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.15)',
        'glass':    '0 4px 24px rgba(0, 0, 0, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
