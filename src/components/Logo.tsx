/**
 * Text-based wordmark standing in for the two real transparent PNG logo
 * files (CLAUDE.md — "لوگو") — still not available as readable files in
 * this environment (only seen inline in chat, not as an attachment). It
 * reads `color: inherit`, so `.site-header`'s dark/light crossfade (see
 * globals.css) drives it for free, and in the footer it just picks up
 * that section's own (matte-black) text color — no extra prop needed.
 *
 * Migration path once the real files land in `public/`: replace the
 * `<span>` below with two absolutely-positioned `<Image>`s (white/black
 * logo) whose opacity is toggled by the same `.is-light` class this file
 * currently uses for text color, instead of a CSS color transition.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-heading text-2xl tracking-[0.2em] uppercase ${className}`}
    >
      DEVINO
    </span>
  );
}
