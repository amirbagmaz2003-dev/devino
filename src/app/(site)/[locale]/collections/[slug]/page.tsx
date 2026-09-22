import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCollectionBySlug } from "@/db/queries";
import ProductGroupCarousel from "@/components/carousel/ProductGroupCarousel";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
  params,
}: PageProps<"/[locale]/collections/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("collectionDetail");
  const tProduct = await getTranslations("productDetail");
  const tCarousel = await getTranslations("carousel");
  const collection = await getCollectionBySlug(slug, locale);

  if (!collection) {
    return (
      <div className="mx-auto max-w-6xl px-6 pt-[calc(var(--header-h)+2rem)] pb-24 text-center">
        <p className="text-matte-black/70">{t("notFound")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pt-[calc(var(--header-h)+2rem)] pb-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-4xl">{collection.name}</h1>
        {collection.description && (
          <p className="text-matte-black/70 mt-4">{collection.description}</p>
        )}
      </div>

      {collection.products.length === 0 ? (
        <p className="text-matte-black/70 mt-14 text-center">{t("empty")}</p>
      ) : (
        <div className="mt-14">
          <ProductGroupCarousel
            products={collection.products}
            itemsPerSlide={1}
            visibilityClassName="block sm:hidden"
            locale={locale}
            currencyUnit={tProduct("currencyUnit")}
            outOfStockLabel={tProduct("outOfStock")}
            carouselLabel={collection.name}
            prevLabel={tCarousel("previous")}
            nextLabel={tCarousel("next")}
          />
          <ProductGroupCarousel
            products={collection.products}
            itemsPerSlide={2}
            visibilityClassName="hidden sm:block lg:hidden"
            locale={locale}
            currencyUnit={tProduct("currencyUnit")}
            outOfStockLabel={tProduct("outOfStock")}
            carouselLabel={collection.name}
            prevLabel={tCarousel("previous")}
            nextLabel={tCarousel("next")}
          />
          <ProductGroupCarousel
            products={collection.products}
            itemsPerSlide={4}
            visibilityClassName="hidden lg:block"
            locale={locale}
            currencyUnit={tProduct("currencyUnit")}
            outOfStockLabel={tProduct("outOfStock")}
            carouselLabel={collection.name}
            prevLabel={tCarousel("previous")}
            nextLabel={tCarousel("next")}
          />
        </div>
      )}
    </div>
  );
}
