import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0a0a0a",
          panel: "#0f0f0f",
          header: "#1a1a1a",
          border: "#2a2a2a",
          amber: "#d4a017",
          green: "#00a854",
          red: "#e05555",
          muted: "#888888",
          text: "#c8c8c8",
          bright: "#e8e8e8",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
