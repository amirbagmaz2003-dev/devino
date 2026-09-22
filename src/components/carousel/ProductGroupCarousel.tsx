"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useTranslations } from "next-intl";
import useEmblaCarousel from "embla-carousel-react";
import ProductCard from "@/components/ProductCard";
import CarouselArrows from "./CarouselArrows";
import { useCarouselKeyboardNav } from "./useCarouselKeyboardNav";
import { useDragClickGuard } from "./useDragClickGuard";
import type { MediaBoxProps } from "@/components/MediaBox";

export interface ProductSlideData {
  id: string;
  name: string;
  slug: string;
  price: number;
  inStock: boolean;
  mainImage: MediaBoxProps | null;
}

interface ProductGroupCarouselProps {
  products: ProductSlideData[];
  itemsPerSlide: number;
  /** Tailwind responsive visibility classes — this component is rendered
   * three times (1/2/4 items per slide), each visible at a different
   * breakpoint, so item grouping never has to change client-side (no
   * resize-driven reflow/hydration mismatch — see brief's "ریسپانسیو"
   * note, handled entirely in CSS instead of JS). */
  visibilityClassName: string;
  locale: string;
  currencyUnit: string;
  outOfStockLabel: string;
  carouselLabel: string;
  prevLabel: string;
  nextLabel: string;
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

export default function ProductGroupCarousel({
  products,
  itemsPerSlide,
  visibilityClassName,
  locale,
  currencyUnit,
  outOfStockLabel,
  carouselLabel,
  prevLabel,
  nextLabel,
}: ProductGroupCarouselProps) {
  const tCarousel = useTranslations("carousel");
  const isRtl = locale === "fa";
  const groups = chunk(products, itemsPerSlide);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: isRtl ? "rtl" : "ltr",
    loop: false,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const clickGuard = useDragClickGuard();

  // See CollectionPosterCarousel for why this is a re-render trigger
  // rather than state mirroring emblaApi's own values.
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

  const canScrollPrev = emblaApi?.canScrollPrev() ?? false;
  const canScrollNext = emblaApi?.canScrollNext() ?? false;

  useCarouselKeyboardNav(emblaApi, containerRef, isRtl);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const gridClassName =
    itemsPerSlide >= 4
      ? "grid grid-cols-2 grid-rows-2 gap-x-6 gap-y-8"
      : itemsPerSlide === 2
        ? "grid grid-cols-2 gap-x-6 gap-y-6"
        : "mx-auto max-w-xs";

  return (
    <div className={visibilityClassName}>
      <div
        ref={containerRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={carouselLabel}
        className="relative px-10 focus:outline-none sm:px-14"
      >
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {groups.map((group, index) => (
              <div
                key={index}
                role="group"
                aria-roledescription="slide"
                aria-label={tCarousel("slideStatus", {
                  current: index + 1,
                  total: groups.length,
                })}
                className="min-w-0 flex-[0_0_100%]"
              >
                {/* Guards the drag-vs-click distinction for every card's
                    Link in this slide at once (see useDragClickGuard). */}
                <div
                  className={gridClassName}
                  onPointerDown={clickGuard.onPointerDown}
                  onPointerMove={clickGuard.onPointerMove}
                  onClickCapture={clickGuard.onClickCapture}
                >
                  {group.map((product) => (
                    <ProductCard
                      key={product.id}
                      priority={index === 0}
                      name={product.name}
                      slug={product.slug}
                      price={product.price}
                      currencyUnit={currencyUnit}
                      locale={locale}
                      mainImage={product.mainImage}
                      inStock={product.inStock}
                      outOfStockLabel={outOfStockLabel}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {groups.length > 1 && (
          <CarouselArrows
            onPrev={scrollPrev}
            onNext={scrollNext}
            canScrollPrev={canScrollPrev}
            canScrollNext={canScrollNext}
            isRtl={isRtl}
            prevLabel={prevLabel}
            nextLabel={nextLabel}
            variant="plain"
          />
        )}
      </div>
    </div>
  );
}
