import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCollections } from "@/db/queries";
import CollectionCard from "@/components/CollectionCard";

// D1 data changes via /admin at any time — always read it fresh rather
// than baking an empty result in at build time.
export const dynamic = "force-dynamic";

export default async function CollectionsPage({
  params,
}: PageProps<"/[locale]/collections">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("collections");
  const collections = await getCollections(locale);

  return (
    <div className="mx-auto max-w-6xl px-6 pt-[calc(var(--header-h)+2rem)] pb-24">
      <h1 className="font-heading text-center text-4xl">{t("title")}</h1>

      {collections.length === 0 ? (
        <p className="text-matte-black/70 mt-10 text-center">{t("empty")}</p>
      ) : (
        <div
          className={`mt-14 grid gap-x-8 gap-y-16 sm:gap-x-10 ${
            collections.length === 1
              ? "grid-cols-1"
              : "grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              name={collection.name}
              slug={collection.slug}
              coverImage={collection.coverImage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
