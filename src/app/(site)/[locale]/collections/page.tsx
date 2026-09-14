import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function CollectionsPage({
  params,
}: PageProps<"/[locale]/collections">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("collections");

  return (
    <div className="mx-auto max-w-5xl px-6 pt-[calc(var(--header-h)+2rem)] pb-16">
      <h1 className="font-heading text-4xl">{t("title")}</h1>
      <p className="text-matte-black/70 mt-4">{t("body")}</p>
    </div>
  );
}
