/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        tr: {
          bg: '#0b0e11',
          panel: '#161a1e',
          card: '#1e2329',
          input: '#2b3139',
          border: '#2b3139',
          green: '#0ecb81',
          red: '#f6465d',
          text: '#eaecef',
          muted: '#848e9c',
          yellow: '#f0b90b',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
