/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
        // Neumorphic specific colors - Light mode
        neu: {
          base: '#F0F5F9',
          surface: '#FFFFFF',
          dark: '#C9D6DF',
          light: '#FFFFFF',
        },
        primary: {
          DEFAULT: '#52616B',
          foreground: '#F0F5F9',
          glow: 'rgba(82, 97, 107, 0.4)',
        },
        secondary: {
          DEFAULT: '#C9D6DF',
          foreground: '#1E2022',
        },
        success: {
          DEFAULT: '#52616B',
          glow: 'rgba(82, 97, 107, 0.4)',
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
        // Hybrid Neumorphism - balanced dual shadows for light theme
        'neu-base': '6px 6px 12px rgba(163, 177, 198, 0.6), -6px -6px 12px rgba(255, 255, 255, 0.8)',
        'neu-hover': '8px 8px 16px rgba(163, 177, 198, 0.7), -8px -8px 16px rgba(255, 255, 255, 0.9)',
        'neu-active': 'inset 4px 4px 8px rgba(163, 177, 198, 0.6), inset -4px -4px 8px rgba(255, 255, 255, 0.8)',
        
        // Small elements (buttons, icons)
        'neu-sm': '3px 3px 6px rgba(163, 177, 198, 0.6), -3px -3px 6px rgba(255, 255, 255, 0.8)',
        'neu-sm-hover': '4px 4px 8px rgba(163, 177, 198, 0.7), -4px -4px 8px rgba(255, 255, 255, 0.9)',
        'neu-sm-active': 'inset 2px 2px 4px rgba(163, 177, 198, 0.6), inset -2px -2px 4px rgba(255, 255, 255, 0.8)',
        
        // Large elements (cards, panels)
        'neu-lg': '8px 8px 20px rgba(163, 177, 198, 0.5), -8px -8px 20px rgba(255, 255, 255, 0.8)',
        'neu-lg-hover': '12px 12px 24px rgba(163, 177, 198, 0.6), -12px -12px 24px rgba(255, 255, 255, 0.9)',
        
        // Glow effects - ONLY for active states and key metrics
        'glow-primary': '0 0 12px rgba(82, 97, 107, 0.4)',
        'glow-success': '0 0 12px rgba(82, 97, 107, 0.4)',
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
