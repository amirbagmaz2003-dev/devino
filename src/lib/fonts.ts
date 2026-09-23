import {
  Cormorant_Garamond,
  Inter,
  Markazi_Text,
  Vazirmatn,
} from "next/font/google";

/**
 * English typefaces. Neither has Persian/Arabic glyphs, so these are only
 * ever applied on the `en` locale (see the Farsi pairing below, applied
 * on `fa` instead) — never both at once.
 */
export const headingFont = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Farsi pairing (CLAUDE.md — locale-specific typefaces). Both are declared
 * with the same CSS variable names as their English counterparts above —
 * the locale layout applies exactly one pairing's `.variable` class to
 * `<html>`, so `font-heading`/`font-body` resolve to the right typeface
 * per locale without any extra Tailwind/CSS plumbing.
 */
export const headingFontFa = Markazi_Text({
  variable: "--font-heading",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const bodyFontFa = Vazirmatn({
  variable: "--font-body",
  subsets: ["arabic"],
  display: "swap",
});
