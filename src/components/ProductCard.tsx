import { Link } from "@/i18n/navigation";
import MediaBox, { type MediaBoxProps } from "./MediaBox";
import { formatPrice } from "@/lib/formatPrice";

interface ProductCardProps {
  name: string;
  slug: string;
  price: number;
  currencyUnit: string;
  locale: string;
  mainImage: MediaBoxProps | null;
  inStock: boolean;
  outOfStockLabel: string;
  /** Above-the-fold cards (the first visible slide of a carousel, say)
   * should skip lazy-loading so they don't dominate LCP. */
  priority?: boolean;
}

export default function ProductCard({
  name,
  slug,
  price,
  currencyUnit,
  locale,
  mainImage,
  inStock,
  outOfStockLabel,
  priority = false,
}: ProductCardProps) {
  return (
    <Link href={`/products/${slug}`} className="group block">
      <div className="bg-matte-black/5 relative aspect-[3/4] overflow-hidden">
        {mainImage && (
          <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]">
            <MediaBox
              {...mainImage}
              zoom={false}
              priority={priority}
              // One card per slide; the carousel caps its width at
              // max-w-xs/sm/md/lg (320/384/448/512px) — see ProductCarousel.
              sizes="(min-width: 1024px) 512px, (min-width: 768px) 448px, (min-width: 640px) 384px, min(320px, calc(100vw - 48px))"
            />
          </div>
        )}
        {!inStock && (
          <span className="bg-pearl-white/90 text-matte-black absolute start-3 top-3 px-2 py-1 text-[10px] tracking-widest uppercase">
            {outOfStockLabel}
          </span>
        )}
      </div>
      <div className="mt-3 text-center">
        <h3 className="font-heading text-lg">{name}</h3>
        <p className="text-matte-black/70 mt-1 text-sm">
          {formatPrice(price, locale, currencyUnit)}
        </p>
      </div>
    </Link>
  );
}
