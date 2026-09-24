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
 * and points right — no RTL-driven flip, even though Embla itself runs
 * with `direction: "rtl"` on /fa (so its slide layout matches the page).
 * Positioning uses literal `left-*`/`right-*`, not the logical
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
    "absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition-opacity disabled:pointer-events-none disabled:opacity-0 sm:h-11 sm:w-11";
  const theme =
    variant === "overlay"
      ? "bg-matte-black/30 text-pearl-white backdrop-blur-sm hover:bg-matte-black/50"
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
