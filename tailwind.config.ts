import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2dd9ac",
          dark: "#22b891",
          light: "rgba(45, 217, 172, 0.14)",
        },
        ink: "#f2f4f7",
        // Palette "slate" redéfinie pour le thème sombre verre dépoli : tout
        // le site utilisait déjà systématiquement border-slate-*/text-slate-*
        // (~180 occurrences), donc redéfinir ces teintes ici retexture
        // automatiquement chaque page sans avoir à toucher chaque fichier.
        // Convention : plus le nombre est élevé, plus la teinte est claire
        // (symétrique de l'échelle claire d'origine où un nombre élevé = plus
        // foncé).
        slate: {
          50: "rgba(255, 255, 255, 0.035)",
          100: "rgba(255, 255, 255, 0.06)",
          200: "rgba(255, 255, 255, 0.12)",
          300: "rgba(255, 255, 255, 0.18)",
          400: "#7d8590",
          500: "#969daa",
          600: "#b3bac4",
          700: "#d2d6dd",
          900: "#f2f4f7",
        },
      },
    },
  },
  plugins: [],
};
export default config;
