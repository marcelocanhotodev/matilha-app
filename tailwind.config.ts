import type { Config } from "tailwindcss";

// Paleta extraída do protótipo visual (verde-pinho + areia + dourado-mel).
// Ver o protótipo HTML entregue anteriormente para referência de uso.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pine: {
          900: "#16261f",
          800: "#1e3a32",
          700: "#284a40",
        },
        sage: {
          500: "#8aa891",
          300: "#c3d4c4",
        },
        sand: {
          100: "#f5f0e4",
          50: "#faf7ef",
        },
        gold: {
          500: "#e2a23f",
          600: "#c98a2c",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
