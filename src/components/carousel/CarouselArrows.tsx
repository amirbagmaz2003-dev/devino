interface CarouselArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  isRtl: boolean;
  prevLabel: string;
  nextLabel: string;
  /** "overlay" = pearl-white icon on a dark scrim, for a poster sitting
   * over a photo. "plain" = matte-black icon in a bordered circle, for a
   * carousel on the site's pearl-white background. */
  variant?: "overlay" | "plain";
}

/**
 * Prev/next buttons always call the same semantic action (scrollPrev /
 * scrollNext) — Embla itself handles which visual direction that pans in
 * RTL mode (see CollectionPosterCarousel / ProductCarousel, where
 * Embla is initialized with `direction: "rtl"`). Only the arrow glyph and
 * the physical corner (via CSS logical start/end, which auto-mirrors with
 * `dir`) need to flip here — per the brief: "دکمه‌های فلش هم باید جهتشان
 * در حالت فارسی معکوس شود".
 */
export default function CarouselArrows({
  onPrev,
  onNext,
  canScrollPrev,
  canScrollNext,
  isRtl,
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
        className={`${base} ${theme} start-2 sm:start-4`}
      >
        <ArrowIcon direction={isRtl ? "right" : "left"} />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canScrollNext}
        aria-label={nextLabel}
        className={`${base} ${theme} end-2 sm:end-4`}
      >
        <ArrowIcon direction={isRtl ? "left" : "right"} />
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
