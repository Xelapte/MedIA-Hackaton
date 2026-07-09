import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: "#1e1b15",
        paper: "#f1ead6",
        card: "#fffdf7",
        accent: {
          DEFAULT: "#21504a",
          hover: "#153733",
        },
        verdict: {
          true: "#2f6b3a",
          false: "#a32b1f",
          misleading: "#b0731a",
          unverified: "#5b564a",
        },
      },
      fontFamily: {
        serif: ["var(--font-display)", "Georgia", "Cambria", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.12s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
