/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        panel: "0 18px 80px rgba(20, 27, 36, 0.12)",
        lift: "0 12px 32px rgba(20, 27, 36, 0.14)"
      }
    }
  },
  plugins: []
};
