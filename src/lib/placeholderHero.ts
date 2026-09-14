/**
 * Stand-in for a real evening-wear campaign photo (CLAUDE.md —
 * "محتوای موقت"). This should be a licensed Unsplash/Pexels photo, but
 * this environment's network policy blocks every image-hosting domain
 * (Unsplash, Pexels, even Wikimedia) — there's no way to fetch or verify
 * one from here without risking a broken hero image on the live site.
 *
 * A generated gradient still exercises the real MediaBox/Ken-Burns path
 * with zero external dependency. Swap this for a real photo URL (or a
 * Sanity asset) whenever one is available — nothing else needs to change.
 */
const HERO_PLACEHOLDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2000" viewBox="0 0 1600 2000">
  <defs>
    <radialGradient id="g" cx="50%" cy="35%" r="80%">
      <stop offset="0%" stop-color="#2b2b2b" />
      <stop offset="55%" stop-color="#0d0d0d" />
      <stop offset="100%" stop-color="#000000" />
    </radialGradient>
  </defs>
  <rect width="1600" height="2000" fill="url(#g)" />
</svg>
`.trim();

export const heroPlaceholderUrl = `data:image/svg+xml,${encodeURIComponent(HERO_PLACEHOLDER_SVG)}`;

export const heroPlaceholderFocalPoint = { x: 0.5, y: 0.35 };
