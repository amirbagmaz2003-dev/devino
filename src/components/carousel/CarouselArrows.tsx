interface CarouselArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  prevLabel: string;
  nextLabel: string;
  /** "overlay" = pearl-white icon on a dark scrim, for a poster sitting
   * over a photo. "plain" = matte-black icon in a bordered circle, for a
   * carousel on the site's pearl-white background. */
  variant?: "overlay" | "plain";
}

/**
 * Fixed physical layout in both languages: the left button always calls
 * scrollPrev and points left, the right button always calls scrollNext
 * and points right — no RTL-driven flip; the carousel track itself is
 * always LTR (see CollectionPosterCarousel / ProductCarousel). Positioning uses literal `left-*`/`right-*`, not the logical
 * `start-*`/`end-*` utilities, so it stays put regardless of the page's
 * own `dir` attribute.
 */
export default function CarouselArrows({
  onPrev,
  onNext,
  canScrollPrev,
  canScrollNext,
  prevLabel,
  nextLabel,
  variant = "plain",
}: CarouselArrowsProps) {
  const base =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-[opacity,background-color,border-color] disabled:pointer-events-none disabled:opacity-0";
  // 44×44px at every width (WCAG 2.5.5 tap target, same as the header).
  // Understated: a thin outline over a faint scrim, never a solid button.
  const theme =
    variant === "overlay"
      ? "border border-pearl-white/40 bg-matte-black/20 text-pearl-white backdrop-blur-sm hover:border-pearl-white/80 hover:bg-matte-black/40"
      : "border border-matte-black/20 text-matte-black hover:border-matte-black/60";

  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        disabled={!canScrollPrev}
        aria-label={prevLabel}
        className={`${base} ${theme} left-2 sm:left-4`}
      >
        <ArrowIcon direction="left" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canScrollNext}
        aria-label={nextLabel}
        className={`${base} ${theme} right-2 sm:right-4`}
      >
        <ArrowIcon direction="right" />
      </button>
    </>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
      className="h-5 w-5"
    >
      {direction === "left" ? (
        <path
          d="M15 18l-6-6 6-6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
