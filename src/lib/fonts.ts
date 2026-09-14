import { Cormorant_Garamond, Inter } from "next/font/google";

/**
 * Heading typeface. Cormorant Garamond has no Persian/Arabic glyphs, so
 * Farsi headings fall back to the browser's default serif automatically.
 * A dedicated Farsi heading pairing is a visual-design-phase decision,
 * not part of this skeleton.
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
