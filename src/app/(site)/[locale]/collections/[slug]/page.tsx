import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function CollectionDetailPage({
  params,
}: PageProps<"/[locale]/collections/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("collectionDetail");

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-heading text-4xl">{t("title", { slug })}</h1>
      <p className="text-matte-black/70 mt-4">{t("body", { slug })}</p>
    </div>
  );
}
