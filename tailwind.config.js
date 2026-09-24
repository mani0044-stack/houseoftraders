/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deepsea: {
          DEFAULT: '#0F4C3A',
          hover: '#0A3A2A',
          dark: '#06261C',
          light: '#14634C',
          bg: 'rgba(15, 76, 58, 0.08)',
          border: 'rgba(15, 76, 58, 0.2)',
        },
        slate: {
          bg: '#FFFFFF',
          card: '#FFFFFF',
          surface: '#F8FAFC',
          border: '#E2E8F0',
          hover: '#F1F5F9',
          muted: '#64748B',
        },
        profit: {
          DEFAULT: '#059669',
          light: '#10B981',
          dark: '#047857',
          bg: '#ECFDF5',
          border: '#A7F3D0',
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
          DEFAULT: '#0F4C3A',
          hover: '#0A3A2A',
          light: '#059669',
          blue: '#2563EB',
          bg: '#ECFDF5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
