/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        // Editorial Crimson: Playfair Display for display, Plus Jakarta Sans
        // for UI/body. Inter is retained for pages that have not been migrated
        // onto the type scale yet; drop it with the final migration batch.
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        // Tailwind's default `serif` stack resolves to Times New Roman, which
        // is what the 9 files already using `font-serif` were silently
        // rendering. Pointing it at the display face fixes those pages without
        // touching a line of them.
        serif:  ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Editorial Crimson token set. Values reference the CSS custom
           properties declared in src/index.css, which are the single source
           of truth.

           Each colour resolves as rgb(var(--c57-<name>-rgb) / <alpha-value>)
           rather than a bare var(--c57-<name>). That form is what lets
           Tailwind's alpha modifier work: with a bare var, `bg-c57-primary/10`
           compiles to *nothing at all* — a silent no-op that looks right in
           review and renders as no background. The `-rgb` triplets are
           generated from the hex by scripts/build-color-rgb-vars.py so the two
           forms cannot drift; re-run it after editing any hex token.

           The old c57 palette (#810100 cherry red, charcoal, cotton, gold) is
           retired here; it was referenced zero times. The legacy `brand` alias
           below is still load-bearing for un-migrated pages and is NOT
           removed. */
        c57: {
          /* Brand */
          'primary':                 'rgb(var(--c57-primary-rgb) / <alpha-value>)',
          'primary-container':       'rgb(var(--c57-primary-container-rgb) / <alpha-value>)',
          'on-primary':              'rgb(var(--c57-on-primary-rgb) / <alpha-value>)',
          'primary-fixed':           'rgb(var(--c57-primary-fixed-rgb) / <alpha-value>)',
          'primary-fixed-dim':       'rgb(var(--c57-primary-fixed-dim-rgb) / <alpha-value>)',
          'on-primary-fixed':        'rgb(var(--c57-on-primary-fixed-rgb) / <alpha-value>)',
          'on-primary-fixed-variant':'rgb(var(--c57-on-primary-fixed-variant-rgb) / <alpha-value>)',
          'inverse-primary':         'rgb(var(--c57-inverse-primary-rgb) / <alpha-value>)',
          'surface-tint':            'rgb(var(--c57-surface-tint-rgb) / <alpha-value>)',

          /* Surfaces */
          'surface':                    'rgb(var(--c57-surface-rgb) / <alpha-value>)',
          'surface-dim':                'rgb(var(--c57-surface-dim-rgb) / <alpha-value>)',
          'surface-bright':             'rgb(var(--c57-surface-bright-rgb) / <alpha-value>)',
          'surface-container-lowest':   'rgb(var(--c57-surface-container-lowest-rgb) / <alpha-value>)',
          'surface-container-low':      'rgb(var(--c57-surface-container-low-rgb) / <alpha-value>)',
          'surface-container':          'rgb(var(--c57-surface-container-rgb) / <alpha-value>)',
          'surface-container-high':     'rgb(var(--c57-surface-container-high-rgb) / <alpha-value>)',
          'surface-container-highest':  'rgb(var(--c57-surface-container-highest-rgb) / <alpha-value>)',
          'surface-variant':            'rgb(var(--c57-surface-variant-rgb) / <alpha-value>)',
          'background':                 'rgb(var(--c57-background-rgb) / <alpha-value>)',
          'on-background':              'rgb(var(--c57-on-background-rgb) / <alpha-value>)',

          /* Ink */
          'on-surface':         'rgb(var(--c57-on-surface-rgb) / <alpha-value>)',
          'on-surface-variant': 'rgb(var(--c57-on-surface-variant-rgb) / <alpha-value>)',
          'outline':            'rgb(var(--c57-outline-rgb) / <alpha-value>)',
          'outline-variant':    'rgb(var(--c57-outline-variant-rgb) / <alpha-value>)',

          /* Secondary — warm umber */
          'secondary':                  'rgb(var(--c57-secondary-rgb) / <alpha-value>)',
          'on-secondary':               'rgb(var(--c57-on-secondary-rgb) / <alpha-value>)',
          'secondary-container':        'rgb(var(--c57-secondary-container-rgb) / <alpha-value>)',
          'on-secondary-container':     'rgb(var(--c57-on-secondary-container-rgb) / <alpha-value>)',
          'secondary-fixed':            'rgb(var(--c57-secondary-fixed-rgb) / <alpha-value>)',
          'secondary-fixed-dim':        'rgb(var(--c57-secondary-fixed-dim-rgb) / <alpha-value>)',
          'on-secondary-fixed':         'rgb(var(--c57-on-secondary-fixed-rgb) / <alpha-value>)',
          'on-secondary-fixed-variant': 'rgb(var(--c57-on-secondary-fixed-variant-rgb) / <alpha-value>)',

          /* Tertiary — warm sand, VIP badges and luxury tiers */
          'tertiary':                  'rgb(var(--c57-tertiary-rgb) / <alpha-value>)',
          'on-tertiary':               'rgb(var(--c57-on-tertiary-rgb) / <alpha-value>)',
          'tertiary-container':        'rgb(var(--c57-tertiary-container-rgb) / <alpha-value>)',
          'on-tertiary-container':     'rgb(var(--c57-on-tertiary-container-rgb) / <alpha-value>)',
          'tertiary-fixed':            'rgb(var(--c57-tertiary-fixed-rgb) / <alpha-value>)',
          'tertiary-fixed-dim':        'rgb(var(--c57-tertiary-fixed-dim-rgb) / <alpha-value>)',
          'on-tertiary-fixed':         'rgb(var(--c57-on-tertiary-fixed-rgb) / <alpha-value>)',
          'on-tertiary-fixed-variant': 'rgb(var(--c57-on-tertiary-fixed-variant-rgb) / <alpha-value>)',

          /* Inverse — deep footer fields */
          'inverse-surface':    'rgb(var(--c57-inverse-surface-rgb) / <alpha-value>)',
          'inverse-on-surface': 'rgb(var(--c57-inverse-on-surface-rgb) / <alpha-value>)',

          /* Status */
          'error':              'rgb(var(--c57-error-rgb) / <alpha-value>)',
          'on-error':           'rgb(var(--c57-on-error-rgb) / <alpha-value>)',
          'error-container':    'rgb(var(--c57-error-container-rgb) / <alpha-value>)',
          'on-error-container': 'rgb(var(--c57-on-error-container-rgb) / <alpha-value>)',

          /* Dark surfaces — heroes, footers, navbar utility strip */
          'scrim':       'rgb(var(--c57-scrim-rgb) / <alpha-value>)',
          'on-scrim':    'rgb(var(--c57-on-scrim-rgb) / <alpha-value>)',
          'accent-line': 'rgb(var(--c57-accent-line-rgb) / <alpha-value>)',

          /* Semantic */
          'available-bg':   'rgb(var(--c57-available-bg-rgb) / <alpha-value>)',
          'available-text': 'rgb(var(--c57-available-text-rgb) / <alpha-value>)',
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
        /* Navbar clearance. The fixed Navbar is 40px (utility bar) + 80px (nav)
           = 120px tall, so every page shell reserves exactly this much before
           its hero starts. Tailwind's default scale jumps 28 -> 32, so without
           this `pt-30` silently generates no CSS and content renders underneath
           the header. */
        '30': '7.5rem',
        /* Editorial Crimson layout rhythm (DESIGN.md §Spacing). Named to match
           the mockups so migration is a rename rather than a retype. */
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.75rem',
        'space-xl': '3rem',
        /* Section separation. DESIGN.md §Spacing calls for 5rem-7rem on desktop;
           the previous largest step was space-xl (3rem), which left the tour
           page needing something heavier. This token was *referenced* six times
           as `mt-space-2xl` and never defined — Tailwind drops unknown
           utilities silently, so all six section breaks rendered as zero margin
           and every section on the page sat flush against the next one.

           Deliberately flat rather than a `{ DEFAULT, md }` object: a responsive
           object in `theme.spacing` is not resolved as a breakpoint map here —
           Tailwind emits the keys as declarations (`-d-e-f-a-u-l-t: …; md: …;`),
           producing a rule that matches nothing. Two flat steps and an explicit
           `md:` at the call site say the same thing and actually compile. */
        'space-2xl': '2.5rem',
        'space-3xl': '5rem',
        'gutter': '1.5rem',
        'gutter-mobile': '1rem',
        'margin': '4rem',
        'margin-tablet': '2rem',
        'margin-mobile': '1.25rem',
      },
      borderRadius: {
        /* Editorial radii are exposed as `c57-*` rather than overwriting
           rounded-md/lg/xl, because those three are already used 263 times
           across un-migrated pages and widening them would silently change
           layout outside the redesign's scope. */
        'c57-sm': '0.25rem',
        'c57-md': '0.5rem',
        'c57-lg': '1rem',
        'c57-xl': '1.5rem',
        'c57-2xl': '2rem',
      },
      fontSize: {
        'xs':   ['0.75rem',  { lineHeight: '1rem' }],
        'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem',     { lineHeight: '1.5rem' }],
        'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':  ['1.5rem',   { lineHeight: '2rem' }],

        /* Editorial type scale (DESIGN.md §Typography). Named after the
           tokens the mockups reference, so `font-headline-xl` / `font-label-sm`
           port directly. 11px (label-sm) is the floor — the current
           `text-[10px]` (x390) and `text-[7.5px]` are violations, not
           precedents. label-* is for metadata and badges only, never body
           copy, which is body-md (15px) or body-lg (18px). */
        'headline-xl':        ['56px', { lineHeight: '64px', letterSpacing: '-0.02em',   fontWeight: '600' }],
        'headline-xl-mobile': ['36px', { lineHeight: '44px', letterSpacing: '-0.01em',   fontWeight: '600' }],
        'headline-lg':        ['40px', { lineHeight: '48px', letterSpacing: '-0.015em',  fontWeight: '600' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', letterSpacing: '0',         fontWeight: '600' }],
        'headline-md':        ['28px', { lineHeight: '36px', letterSpacing: '0',         fontWeight: '500' }],
        'headline-sm':        ['22px', { lineHeight: '28px', letterSpacing: '0',         fontWeight: '500' }],
        'body-lg':            ['18px', { lineHeight: '28px', letterSpacing: '0',         fontWeight: '400' }],
        'body-md':            ['15px', { lineHeight: '24px', letterSpacing: '0',         fontWeight: '400' }],
        'body-sm':            ['13px', { lineHeight: '20px', letterSpacing: '0',         fontWeight: '400' }],
        'label-lg':           ['14px', { lineHeight: '20px', letterSpacing: '0.04em',   fontWeight: '600' }],
        'label-md':           ['12px', { lineHeight: '16px', letterSpacing: '0.06em',   fontWeight: '600' }],
        'label-sm':           ['11px', { lineHeight: '14px', letterSpacing: '0.08em',   fontWeight: '600' }],
      },
      /* The wide tracked eyebrows on the Open Trip and Tour Packages heroes.
         `tracking-editorial` was referenced in four places with no matching
         entry here, and Tailwind drops unknown utilities silently — so those
         eyebrows had been rendering with default tracking and nobody noticed.
         Per DESIGN.md §Typography, display eyebrows carry the most tracking,
         body copy none. */
      letterSpacing: {
        'editorial': '0.22em',
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
        /* Legacy — still referenced by un-migrated pages. Do not remove until
           the final migration batch. */
        'brand':    '0 4px 15px rgba(129, 1, 0, 0.3)',
        'brand-lg': '0 8px 30px rgba(129, 1, 0, 0.4)',
        'c57-red':  '0 4px 20px rgba(129, 1, 0, 0.35)',
        'c57-cotton': '0 4px 20px rgba(237, 235, 221, 0.35)',
        'card':     '0 2px 20px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.15)',
        'glass':    '0 4px 24px rgba(0, 0, 0, 0.2)',

        /* Editorial Crimson elevation (DESIGN.md §Elevation). Hairline borders
           and low-contrast warm ambient diffusion rather than heavy shadow.
           Level 2 tints crimson on lift, which is the signature interaction. */
        'c57-card': '0 8px 30px -4px rgba(42, 23, 15, 0.04)',
        'c57-card-hover': '0 16px 40px -6px rgba(153, 0, 0, 0.08)',
        'c57-overlay': '0 24px 48px -12px rgba(42, 23, 15, 0.12)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        // The app's existing page-transition curve (App.js PageTransition) and
        // the curve the mockups use for hover/filter transitions.
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
