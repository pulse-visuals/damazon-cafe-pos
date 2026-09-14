/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canopy: {
          50: "#f2f7f3",
          100: "#dfebe1",
          200: "#b9d4bf",
          300: "#8fba99",
          400: "#5f9a70",
          500: "#3f7d52",
          600: "#2e6440",
          700: "#245035",
          800: "#1d3f2b",
          900: "#153020",
          950: "#0c1c13",
        },
        canopyDark: "#0f2a1c",
        amber: {
          50: "#fdf7ec",
          100: "#faecd0",
          200: "#f3d69f",
          300: "#eabb69",
          400: "#e29f42",
          500: "#d0842a",
          600: "#ab6821",
          700: "#894f1f",
          800: "#6f401f",
          900: "#5c351d",
        },
        cream: "#faf6ee",
      },
      fontFamily: {
        display: ["'Fraunces'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 42, 28, 0.06), 0 4px 16px rgba(15, 42, 28, 0.08)",
        pop: "0 8px 30px rgba(15, 42, 28, 0.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
