import type { Config } from "tailwindcss";

/**
 * deVino design tokens (see CLAUDE.md — "پالت رنگی").
 *
 * The full brandbook palette (bnafsh-angoori, zard-limooei, blue, dark
 * burgundy) is intentionally NOT included here — the website only ever
 * uses these three colors. Do not add more colors to this palette.
 * (`error-red` below is a functional validation color, not a palette one.)
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "matte-black": "#000000",
        "pearl-white": "#F8F6F0",
        // Accent color — brand rule: never use as a section/background color
        // or as the dominant color of any area. Small, rare touches only
        // (an icon, a thin rule, a single detail). See CLAUDE.md.
        "olive-accent": "#556B2F",
        // NOT a brand color — a functional "system" color, the one deliberate
        // exception to the three-color rule above (owner's decision, QA
        // pass). Form/input validation errors ONLY: an invalid field's
        // border and its inline error message. Never decorative, never
        // anywhere outside error states. Muted, desaturated red (6:1 on
        // pearl-white) so it reads as "error" without clashing.
        "error-red": "#B3261E",
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
