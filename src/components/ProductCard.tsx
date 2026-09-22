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
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
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
