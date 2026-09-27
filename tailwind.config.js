/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Emerald Sidebar & Brand Theme
        emeraldDark: {
          sidebar: '#062c26',     // Deep dark emerald green background
          active: '#0d483d',      // Active navigation pill background
          hover: '#0b3a33',       // Hover state for navigation items
          textMuted: '#7aa69e',   // Muted sage teal text for inactive items
          textActive: '#ffffff',  // Active item white text
          accent: '#10b981',      // Vibrant mint emerald icon accent
        },
        deepsea: {
          DEFAULT: '#059669',
          hover: '#047857',
          dark: '#062c26',
          light: '#10b981',
          bg: 'rgba(16, 185, 129, 0.08)',
          border: 'rgba(16, 185, 129, 0.2)',
        },
        slate: {
          bg: '#f4f7f6',          // Soft light off-white page background
          card: '#ffffff',        // Card crisp white background
          surface: '#f7f9f8',
          border: '#e2e8f0',
          hover: '#f1f5f9',
          muted: '#64748b',
        },
        profit: {
          DEFAULT: '#059669',     // Positive green
          light: '#10b981',
          dark: '#047857',
          bg: '#e6f7f2',          // Light mint green badge fill
          border: '#a7f3d0',
        },
        loss: {
          DEFAULT: '#dc2626',     // Negative coral red
          light: '#ef4444',
          dark: '#b91c1c',
          bg: '#fee2e2',          // Light coral red badge fill
          border: '#fca5a5',
        },
        warning: {
          DEFAULT: '#d97706',
          light: '#f59e0b',
          bg: '#fffbeb',
          border: '#fde68a',
        },
        brand: {
          DEFAULT: '#062c26',     // Emerald brand primary
          hover: '#0d483d',
          light: '#10b981',
          blue: '#10b981',
          bg: '#e6f7f2',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
