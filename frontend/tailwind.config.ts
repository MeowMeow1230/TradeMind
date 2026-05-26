import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        agent: { bg: "#0d1117", card: "#161b22", border: "#30363d", accent: "#00d4aa", warn: "#ffd93d" }
      }
    }
  },
  plugins: []
};
export default config;
