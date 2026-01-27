/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fpl: {
          purple: '#37003c',
          green: '#00ff87',
          pink: '#ff2882',
          cyan: '#04f5ff',
          dark: '#1a1a2e',
        },
      },
    },
  },
  plugins: [],
};
