import animate from 'tailwindcss-animate';

const config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      // ───────────────────────────────────────────────────────────────────
      // Colors — NO hardcodear valores acá. Tailwind solo REFERENCIA las
      // CSS custom properties definidas en src/app/globals.css.
      //
      // Esto permite:
      //   - Una sola fuente de verdad (el bloque :root en globals.css).
      //   - Alpha modifiers (ej. `bg-primary/20`) vía el token
      //     <alpha-value> que Tailwind reemplaza en tiempo de build.
      //   - Dark mode sin tocar código — solo overrides de las CSS vars.
      //   - Tematización dinámica en runtime si alguna vez se necesita.
      //
      // Para agregar un color nuevo: definir la var en globals.css y
      // agregar una entrada acá que la referencie. Nunca poner un hex.
      // ───────────────────────────────────────────────────────────────────
      colors: {
        primary: {
          DEFAULT:    'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT:    'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT:    'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT:    'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT:    'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT:    'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT:    'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input:  'rgb(var(--input) / <alpha-value>)',
        ring:   'rgb(var(--ring) / <alpha-value>)',
      },
      fontFamily: {
        sans:    ['var(--font-poppins)', 'Poppins', 'system-ui', 'sans-serif'],
        heading: ['var(--font-poppins)', 'Poppins', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':   '0.75rem',
        'sm':   '0.875rem',
        'base': '1rem',
        'lg':   '1.125rem',
        'xl':   '1.25rem',
        '2xl':  '1.5rem',
        '3xl':  '1.875rem',
        '4xl':  '2.25rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        'navbar-height': 'var(--navbar-height)',
      },
      padding: {
        'safe': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        'sm': 'calc(var(--radius) - 4px)',
        'md': 'calc(var(--radius) - 2px)',
        'lg': 'var(--radius)',
        'xl': '0.75rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' }
        },
        'slide-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-in': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'slide-up':       'slide-up 0.3s ease-out',
        'fade-in':        'fade-in 0.3s ease-in-out',
        'slide-in':       'slide-in 0.3s ease-out'
      },
      maxWidth: {
        'screen-2xl': '1536px',
      },
      zIndex: {
        '1': '1', '2': '2', '3': '3',
        '60': '60', '70': '70', '80': '80', '90': '90', '100': '100',
        'navbar':   'var(--z-index-navbar)',
        'dropdown': 'var(--z-index-dropdown)',
        'modal':    'var(--z-index-modal)',
        'drawer':   'var(--z-index-drawer)',
        'toast':    'var(--z-index-toast)',
        'content':  'var(--z-index-content)',
      },
    }
  },
  plugins: [animate],
  // Configuración adicional para purgar estilos no utilizados
  safelist: [
    'text-xs',
    'text-sm', 
    'text-base',
    'text-lg',
    'text-xl',
    'text-2xl',
    'text-3xl',
    'w-4',
    'w-5',
    'w-6',
    'w-8',
    'w-10',
    'w-12',
    'h-4',
    'h-5',
    'h-6',
    'h-8',
    'h-10',
    'h-12',
  ]
};

export default config;