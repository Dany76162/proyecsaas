import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/modules/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f8ff",
          100: "#e8efff",
          200: "#c9d9fd",
          300: "#9ab8fb",
          400: "#6694f5",
          500: "#2356d9",
          600: "#1744b3",
          700: "#1238a0",
          800: "#0e2c7d",
          900: "#0d1d47",
        },
      },
      boxShadow: {
        soft: "0 18px 55px -24px rgba(13, 29, 71, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

