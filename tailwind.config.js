/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  
  theme: {
    extend: {
      colors: {
        deepsea: {
          DEFAULT: '#0F6B5C',
          hover: '#0B5347',
          dark: '#083D34',
          light: '#14876F',
          bg: 'rgba(15, 107, 92, 0.08)',
          border: 'rgba(15, 107, 92, 0.2)',
        },
        slate: {
          bg: '#FFFFFF',
          card: '#FFFFFF',
          surface: '#F7F8FA',
          border: '#E5E7EB',
          hover: '#F3F4F6',
          muted: '#6B7280',
        },
        profit: {
          DEFAULT: '#16A34A',
          light: '#22C55E',
          dark: '#15803D',
          bg: '#F0FDF4',
          border: '#BBF7D0',
        },
        loss: {
          DEFAULT: '#DC2626',
          light: '#EF4444',
          dark: '#B91C1C',
          bg: '#FEF2F2',
          border: '#FECACA',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#F59E0B',
          bg: '#FFFBEB',
          border: '#FDE68A',
        },
        brand: {
          DEFAULT: '#0F6B5C',
          hover: '#0B5347',
          light: '#14876F',
          blue: '#2563EB',
          bg: '#ECFAF6',
        }
      },
      fontFamily: {
        serif: ['"Bodoni Moda"', 'Didot', '"Bodoni MT"', 'Georgia', 'serif'],
        script: ['"Pinyon Script"', 'cursive'],
        sans: ['Montserrat', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}