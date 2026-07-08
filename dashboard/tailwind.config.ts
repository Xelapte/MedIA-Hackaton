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
        ink: "#1a1d1f",
        paper: "#faf9f6",
        accent: {
          DEFAULT: "#1d4ed8",
          hover: "#1e40af",
        },
        verdict: {
          true: "#15803d",
          false: "#b91c1c",
          misleading: "#b45309",
          unverified: "#52525b",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
