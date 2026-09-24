"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localeDirection, type Locale } from "@/i18n/routing";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "@/i18n/navigation";
import MediaBox, { type MediaBoxProps } from "@/components/MediaBox";
import CarouselArrows from "./CarouselArrows";
import { useCarouselKeyboardNav } from "./useCarouselKeyboardNav";
import { useDragClickGuard } from "./useDragClickGuard";

export interface PosterSlideData {
  slug: string;
  name: string;
  description: string | null;
  coverImage: MediaBoxProps | null;
}

interface CollectionPosterCarouselProps {
  collections: PosterSlideData[];
  carouselLabel: string;
  viewCollectionLabel: string;
  prevLabel: string;
  nextLabel: string;
}

/**
 * Full-bleed "poster" carousel — one collection per slide, static cover
 * image (no Ken Burns — the brief wants these to read like a magazine
 * cover, motion only from paging), overlaid name/description/CTA. Paging
 * is a fixed left=prev/right=next in both languages (no RTL flip), and
 * loops from the last collection back to the first and vice versa.
 */
export default function CollectionPosterCarousel({
  collections,
  carouselLabel,
  viewCollectionLabel,
  prevLabel,
  nextLabel,
}: CollectionPosterCarouselProps) {
  const tCarousel = useTranslations("carousel");
  // Carousel movement is identical in both languages: the track is always
  // LTR (Embla `direction: "ltr"` + `dir="ltr"` on its viewport), so the
  // next slide always enters from the right and left/right arrows, keys
  // and drags behave the same on /fa and /en. The track must be pinned
  // explicitly — inheriting <html dir="rtl"> would lay the slides out
  // right-to-left and push them off-screen under LTR positioning. Only
  // each slide's content follows the locale direction, so Persian text
  // still renders and aligns RTL.
  const contentDir = localeDirection[useLocale() as Locale];
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    direction: "ltr",
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const clickGuard = useDragClickGuard();

  // Embla's own state (selected snap, scroll limits) isn't React state, so
  // nothing re-renders this component when the user drags/pages — this
  // just forces a re-render on "select"/"reInit" so the derived values
  // below (read straight from the live emblaApi, not cached) pick up the
  // change. No setState in the effect body itself, only in the callback.
  const [, forceRerender] = useReducer((c: number) => c + 1, 0);
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", forceRerender);
    emblaApi.on("reInit", forceRerender);
    return () => {
      emblaApi.off("select", forceRerender);
      emblaApi.off("reInit", forceRerender);
    };
  }, [emblaApi]);

  const selectedIndex = emblaApi?.selectedScrollSnap() ?? 0;
  const canScrollPrev = emblaApi?.canScrollPrev() ?? false;
  const canScrollNext = emblaApi?.canScrollNext() ?? false;

  useCarouselKeyboardNav(emblaApi, containerRef);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={carouselLabel}
      className="relative overflow-hidden focus:outline-none"
      style={{ height: "calc(100dvh - var(--header-h))" }}
    >
      <div ref={emblaRef} dir="ltr" className="h-full overflow-hidden">
        <div className="flex h-full">
          {collections.map((collection, index) => {
            const isNeighbor = Math.abs(index - selectedIndex) <= 1;
            return (
              <div
                key={collection.slug}
                role="group"
                aria-roledescription="slide"
                aria-label={tCarousel("slideStatus", {
                  current: index + 1,
                  total: collections.length,
                })}
                className="relative h-full min-w-0 flex-[0_0_100%]"
              >
                <Link
                  href={`/collections/${collection.slug}`}
                  onClick={clickGuard.onClickCapture}
                  onPointerDown={clickGuard.onPointerDown}
                  onPointerMove={clickGuard.onPointerMove}
                  dir={contentDir}
                  className="group absolute inset-0 block"
                >
                  {collection.coverImage && (
                    <MediaBox
                      {...collection.coverImage}
                      zoom={false}
                      priority={isNeighbor}
                      sizes="100vw"
                    />
                  )}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                  />
                  <div className="text-pearl-white absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-16 text-center sm:pb-20">
                    <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl">
                      {collection.name}
                    </h2>
                    {collection.description && (
                      <p className="text-pearl-white/85 mt-3 max-w-md text-sm sm:text-base">
                        {collection.description}
                      </p>
                    )}
                    <span className="border-pearl-white/70 group-hover:bg-pearl-white group-hover:text-matte-black mt-6 border px-6 py-2 text-xs tracking-widest uppercase transition-colors sm:text-sm">
                      {viewCollectionLabel}
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {collections.length > 1 && (
        <CarouselArrows
          onPrev={scrollPrev}
          onNext={scrollNext}
          canScrollPrev={canScrollPrev}
          canScrollNext={canScrollNext}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
          variant="overlay"
        />
      )}
    </div>
  );
}
