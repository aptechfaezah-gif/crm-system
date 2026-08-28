import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ifra: {
          navy: "#0A2351",
          deep: "#061632",
          mid: "#123A6B",
          light: "#1A4F8A",
          gold: "#FBB03B",
          "gold-dark": "#E09A20",
          mist: "#F4F7FB",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10, 35, 81, 0.06), 0 8px 24px rgba(10, 35, 81, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
