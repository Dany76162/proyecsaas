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
        soft: "0 2px 10px -2px rgba(13, 29, 71, 0.05), 0 10px 25px -5px rgba(13, 29, 71, 0.1)",
        enterprise: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};

export default config;


