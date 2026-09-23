import { useEffect, type RefObject } from "react";
import type { EmblaCarouselType } from "embla-carousel";

/**
 * Wires ArrowLeft/ArrowRight to slide navigation (brief: "کلیدهای
 * جهت‌نما ... باید اسلاید را جابه‌جا کنند"). Fixed mapping in both
 * languages — ArrowLeft always calls scrollPrev, ArrowRight always calls
 * scrollNext — matching CarouselArrows' own fixed left=prev/right=next
 * layout (no RTL-driven flip).
 */
export function useCarouselKeyboardNav(
  emblaApi: EmblaCarouselType | undefined,
  containerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !emblaApi) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      if (event.key === "ArrowRight") {
        emblaApi?.scrollNext();
      } else {
        emblaApi?.scrollPrev();
      }
    }

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [emblaApi, containerRef]);
}
