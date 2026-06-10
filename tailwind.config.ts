import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#11100E",
        charcoal: "#1A1815",
        ivory: "#F4EDE1",
        sand: "#C9B89E",
        gold: "#C79A3B",
        rust: "#B85C38",
        sage: "#8BA17F",
        moss: "#344236",
        bronze: "#5A4732",
        softwhite: "#F8F4EC",
        muted: "#A99B87",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Manrope", "Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-fine":
          "linear-gradient(to right, rgba(201,184,158,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(201,184,158,0.05) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;
