import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatNumber";

interface CarouselCounterProps {
  /** 0-based selected slide. */
  current: number;
  total: number;
  /** "overlay" = pearl-white over a photo; "plain" = on the pearl-white page. */
  variant?: "overlay" | "plain";
  className?: string;
}

/**
 * Small typographic "2 / 5" position indicator (Persian digits on /fa).
 * Always laid out LTR, like the carousel track itself: the next slide
 * enters from the right in both languages, so the count reads the same
 * way the slides move. Screen readers get the full "Slide 2 of 5" from a
 * polite live region instead of the bare digits.
 */
export default function CarouselCounter({
  current,
  total,
  variant = "plain",
  className = "",
}: CarouselCounterProps) {
  const t = useTranslations("carousel");
  const locale = useLocale();
  const digits = (n: number) => formatNumber(n, locale, { grouping: false });
  const color =
    variant === "overlay" ? "text-pearl-white/85" : "text-matte-black/60";

  return (
    <p
      data-carousel-counter
      aria-live="polite"
      aria-atomic="true"
      className={`font-body text-xs tracking-[0.2em] tabular-nums ${color} ${className}`}
    >
      <span aria-hidden="true" dir="ltr">
        {digits(current + 1)} / {digits(total)}
      </span>
      <span className="sr-only">
        {t("slideStatus", {
          current: digits(current + 1),
          total: digits(total),
        })}
      </span>
    </p>
  );
}
