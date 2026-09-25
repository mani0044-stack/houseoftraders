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
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          dark: '#1E40AF',
          light: '#3B82F6',
          bg: 'rgba(37, 99, 235, 0.08)',
          border: 'rgba(37, 99, 235, 0.2)',
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
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#3B82F6',
          blue: '#2563EB',
          bg: '#EFF6FF',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
