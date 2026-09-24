import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { getCollections } from "@/db/queries";
import CollectionPosterCarousel from "@/components/carousel/CollectionPosterCarousel";

// D1 data changes via /admin at any time — always read it fresh rather
// than baking an empty result in at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/collections">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: "/collections",
    title: t("collectionsTitle"),
    description: t("collectionsDescription"),
  });
}

export default async function CollectionsPage({
  params,
}: PageProps<"/[locale]/collections">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("collections");
  const tCarousel = await getTranslations("carousel");
  const collections = await getCollections(locale);

  if (collections.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-6 pt-[calc(var(--header-h)+2rem)] pb-24">
        <h1 className="font-heading text-center text-4xl">{t("title")}</h1>
        <p className="text-matte-black/70 mt-10 text-center">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "var(--header-h)" }}>
      <h1 className="sr-only">{t("title")}</h1>
      <CollectionPosterCarousel
        collections={collections.map((collection) => ({
          slug: collection.slug,
          name: collection.name,
          description: collection.description,
          coverImage: collection.coverImage,
        }))}
        carouselLabel={t("title")}
        viewCollectionLabel={t("viewCollection")}
        prevLabel={tCarousel("previous")}
        nextLabel={tCarousel("next")}
      />
    </div>
  );
}
