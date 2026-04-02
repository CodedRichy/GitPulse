/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/renderer/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Neumorphic specific colors
        neu: {
          base: '#0B0F1A',
          surface: '#111624',
          dark: '#080b13',
          light: '#1a2135',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          glow: 'rgba(99, 102, 241, 0.4)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        success: {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.4)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          glow: 'rgba(239, 68, 68, 0.4)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      boxShadow: {
        // Hybrid Neumorphism - balanced dual shadows
        'neu-base': '4px 4px 10px rgba(0,0,0,0.35), -2px -2px 6px rgba(255,255,255,0.03)',
        'neu-hover': '6px 6px 14px rgba(0,0,0,0.4), -3px -3px 8px rgba(255,255,255,0.04)',
        'neu-active': 'inset 4px 4px 8px rgba(0,0,0,0.5), inset -2px -2px 6px rgba(255,255,255,0.03)',
        
        // Small elements (buttons, icons)
        'neu-sm': '2px 2px 6px rgba(0,0,0,0.35), -1px -1px 4px rgba(255,255,255,0.03)',
        'neu-sm-hover': '3px 3px 8px rgba(0,0,0,0.4), -2px -2px 5px rgba(255,255,255,0.04)',
        'neu-sm-active': 'inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(255,255,255,0.03)',
        
        // Large elements (cards, panels)
        'neu-lg': '6px 6px 16px rgba(0,0,0,0.35), -3px -3px 10px rgba(255,255,255,0.03)',
        'neu-lg-hover': '8px 8px 20px rgba(0,0,0,0.4), -4px -4px 12px rgba(255,255,255,0.04)',
        
        // Glow effects - ONLY for active states and key metrics
        'glow-primary': '0 0 12px rgba(99, 102, 241, 0.4)',
        'glow-success': '0 0 12px rgba(16, 185, 129, 0.4)',
        'glow-error': '0 0 12px rgba(239, 68, 68, 0.4)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'neu': '16px',
        'neu-sm': '12px',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'brightness(1)' },
          '50%': { opacity: .7, filter: 'brightness(1.5)' },
        }
      },
    },
  },
  plugins: [],
}
