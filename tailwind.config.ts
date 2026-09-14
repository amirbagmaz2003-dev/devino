import type { Config } from "tailwindcss";

/**
 * deVino design tokens (see CLAUDE.md — "پالت رنگی").
 *
 * The full brandbook palette (bnafsh-angoori, zard-limooei, blue, dark
 * burgundy) is intentionally NOT included here — the website only ever
 * uses these three colors. Do not add more colors to this palette.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./sanity/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "matte-black": "#000000",
        "pearl-white": "#F8F6F0",
        // Accent color — brand rule: never use as a section/background color
        // or as the dominant color of any area. Small, rare touches only
        // (an icon, a thin rule, a single detail). See CLAUDE.md.
        "olive-accent": "#556B2F",
      },
      fontFamily: {
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};

export default config;
