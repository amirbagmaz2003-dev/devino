import { useEffect, type RefObject } from "react";
import type { EmblaCarouselType } from "embla-carousel";

/**
 * Wires ArrowLeft/ArrowRight to slide navigation (brief: "کلیدهای
 * جهت‌نما ... باید اسلاید را جابه‌جا کنند"). Mirrors the mapping the
 * whole carousel already uses in RTL: pressing the key that points
 * toward where content visually advances (left in RTL, right in LTR)
 * always calls scrollNext — matching how arrow-key navigation already
 * behaves in RTL text/UI — rather than a fixed left=prev/right=next that
 * would feel backwards once the whole carousel is mirrored.
 */
export function useCarouselKeyboardNav(
  emblaApi: EmblaCarouselType | undefined,
  containerRef: RefObject<HTMLElement | null>,
  isRtl: boolean,
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !emblaApi) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const goNext = isRtl ? event.key === "ArrowLeft" : event.key === "ArrowRight";
      event.preventDefault();
      if (goNext) {
        emblaApi?.scrollNext();
      } else {
        emblaApi?.scrollPrev();
      }
    }

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [emblaApi, containerRef, isRtl]);
}
