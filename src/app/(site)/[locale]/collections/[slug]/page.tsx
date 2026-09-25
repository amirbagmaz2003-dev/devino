import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCollectionBySlug } from "@/db/queries";
import { excerpt, pageMetadata } from "@/lib/seo";
import ProductCarousel from "@/components/carousel/ProductCarousel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/collections/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const collection = await getCollectionBySlug(slug, locale);
  if (!collection) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: `/collections/${collection.slug}`,
    title: collection.name,
    description: excerpt(collection.description) ?? t("collectionsDescription"),
    imageUrl: collection.coverImage?.asset.url,
    imageAlt: collection.coverImage?.alt || collection.name,
  });
}

export default async function CollectionDetailPage({
  params,
}: PageProps<"/[locale]/collections/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const collection = await getCollectionBySlug(slug, locale);
  if (!collection) notFound();
  const [t, tProduct, tCarousel] = await Promise.all([
    getTranslations("collectionDetail"),
    getTranslations("productDetail"),
    getTranslations("carousel"),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 pt-[calc(var(--header-h)+2rem)] pb-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-4xl">{collection.name}</h1>
        {collection.description && (
          <p className="text-matte-black/70 mt-4">{collection.description}</p>
        )}
        <p className="font-heading text-matte-black/60 mt-6 text-base italic">
          {t("presenceLine")}
        </p>
      </div>

      {collection.products.length === 0 ? (
        <p className="text-matte-black/70 mt-14 text-center">{t("empty")}</p>
      ) : (
        <div className="mt-14">
          <ProductCarousel
            products={collection.products}
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
