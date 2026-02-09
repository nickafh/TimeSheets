/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#002349", // SIR Blue
        gold: "#C29B40",
        "accent-grey": "#999999",
        "text-grey": "#666666",
        "background-light": "#F8F9FA",
        afh: {
          navy: "#002349",
          navyDark: "#00172b",
          gold: "#C29B40",
          goldDark: "#a8832e",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        sans: ["'Montserrat'", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "2px",
        sm: "2px",
      },
    },
  },
  plugins: [],
};
