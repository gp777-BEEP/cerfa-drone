import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0f6e56",
          dark: "#085041",
          light: "#e1f5ee",
        },
        ink: "#1a1d21",
      },
    },
  },
  plugins: [],
};
export default config;
