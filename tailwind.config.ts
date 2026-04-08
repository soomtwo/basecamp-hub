import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: "#fdf8f0",
          100: "#f9edd9",
          200: "#f2d9b0",
          300: "#e8bf7e",
          400: "#dc9f4a",
          500: "#c8832a",
          600: "#a8651f",
          700: "#864e1b",
          800: "#6b3e1c",
          900: "#58341b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
