"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localeDirection, type Locale } from "@/i18n/routing";
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

interface ProductCarouselProps {
  products: ProductSlideData[];
  locale: string;
  currencyUnit: string;
  outOfStockLabel: string;
  carouselLabel: string;
  prevLabel: string;
  nextLabel: string;
}

/**
 * One product per slide at every breakpoint (the old 1/2/4-per-slide grid
 * variants looked cluttered on desktop and mis-centered the arrows across
 * multiple rows). The card itself grows via `max-w-*` breakpoints so
 * desktop gets a bigger image and more surrounding whitespace, without
 * ever switching the underlying "one item per slide" logic.
 *
 * The arrow layer is a separate absolutely-positioned sibling, sized by
 * `aspect-[3/4]` to match ProductCard's own image ratio exactly — so the
 * buttons center on the photo regardless of the caption's height below
 * it, instead of centering across the whole card (the old bug). It's
 * `pointer-events-none` except for the two buttons themselves, so
 * clicking/dragging the image still works underneath.
 */
export default function ProductCarousel({
  products,
  locale,
  currencyUnit,
  outOfStockLabel,
  carouselLabel,
  prevLabel,
  nextLabel,
}: ProductCarouselProps) {
  const tCarousel = useTranslations("carousel");
  // See CollectionPosterCarousel for why Embla gets the page direction.
  const direction = localeDirection[useLocale() as Locale];
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    direction,
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
      className="relative mx-auto max-w-xs focus:outline-none sm:max-w-sm md:max-w-md lg:max-w-lg"
    >
      <div ref={emblaRef} dir={direction} className="overflow-hidden">
        <div
          className="flex"
          onPointerDown={clickGuard.onPointerDown}
          onPointerMove={clickGuard.onPointerMove}
          onClickCapture={clickGuard.onClickCapture}
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              role="group"
              aria-roledescription="slide"
              aria-label={tCarousel("slideStatus", {
                current: index + 1,
                total: products.length,
              })}
              className="min-w-0 flex-[0_0_100%]"
            >
              <ProductCard
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
            </div>
          ))}
        </div>
      </div>

      {products.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[3/4] [&>button]:pointer-events-auto">
          <CarouselArrows
            onPrev={scrollPrev}
            onNext={scrollNext}
            canScrollPrev={canScrollPrev}
            canScrollNext={canScrollNext}
            prevLabel={prevLabel}
            nextLabel={nextLabel}
            variant="overlay"
          />
        </div>
      )}
    </div>
  );
}
