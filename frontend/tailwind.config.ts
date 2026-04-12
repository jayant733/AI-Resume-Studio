import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#12263a",
        mist: "#eef4fb",
        accent: "#ff6b35",
        slate: "#5b6c82"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(18, 38, 58, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
