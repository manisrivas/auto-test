import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink:       "#0a0a0a",
        "ink-2":   "#3a3a3a",
        "ink-3":   "#8a8a8a",
        "ink-4":   "#c4c4c4",
        paper:     "#fafaf8",
        "paper-2": "#f2f2ef",
        "paper-3": "#e8e8e3",
        line:      "rgba(0,0,0,0.07)",
        "line-2":  "rgba(0,0,0,0.12)",
        sidebar:   "#0a0a0a",
        "green-text": "#1a7a4a",
        "green-bg":   "#edf7f1",
        "green-mid":  "#2ea865",
        "red-text":   "#c0392b",
        "red-bg":     "#fdf0ee",
        "amber-text": "#b45309",
        "amber-bg":   "#fef8ee",
        "blue-text":  "#1a4fa8",
        "blue-bg":    "#eef3fc",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderColor: {
        DEFAULT: "rgba(0,0,0,0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
