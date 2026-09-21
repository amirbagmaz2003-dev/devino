import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCollectionBySlug } from "@/sanity/lib/queries";
import ProductCard from "@/components/ProductCard";

export default async function CollectionDetailPage({
  params,
}: PageProps<"/[locale]/collections/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("collectionDetail");
  const tProduct = await getTranslations("productDetail");
  const collection = await getCollectionBySlug(slug);

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
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 sm:gap-x-8 lg:grid-cols-4">
          {collection.products.map((product) => (
            <ProductCard
              key={product.id}
              name={product.name}
              slug={product.slug}
              price={product.price}
              currencyUnit={tProduct("currencyUnit")}
              locale={locale}
              mainImage={product.mainImage}
              inStock={product.inStock}
              outOfStockLabel={tProduct("outOfStock")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
