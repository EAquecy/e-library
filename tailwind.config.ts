import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: "#F6F1E7", deep: "#EDE5D3", edge: "#DDD2BA" },
        ink: { DEFAULT: "#1B2420", soft: "#4A5550", faint: "#7D877F" },
        forest: { DEFAULT: "#1E4D3A", dark: "#143628", light: "#DCE8E0" },
        gold: { DEFAULT: "#C8962E", light: "#F4E6C4" },
        clay: { DEFAULT: "#B4532A", light: "#F6DDD0" },
      },
      fontFamily: {
        serif: ['"Source Serif 4 Variable"', "Georgia", "serif"],
        sans: ['"Inter Variable"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        book: "0 1px 0 rgba(27,36,32,.06), 0 8px 24px -12px rgba(27,36,32,.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
