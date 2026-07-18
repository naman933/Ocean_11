/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        ink2: "var(--ink2)",
        steel: "var(--steel)",
        "steel-soft": "var(--steel-soft)",
        paper: "var(--paper)",
        mist: "var(--mist)",
        mist2: "var(--mist2)",
        line: "var(--line)",
        leak: "var(--leak)",
        "leak-soft": "var(--leak-soft)",
        green: "var(--green)",
        "green-soft": "var(--green-soft)",
        gold: "var(--gold)",
        "gold-soft": "var(--gold-soft)",
      },
      fontFamily: {
        display: ["Archivo", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
    },
  },
  plugins: [],
};
