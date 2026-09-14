import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function ProductDetailPage({
  params,
}: PageProps<"/[locale]/products/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("productDetail");

  return (
    <div className="mx-auto max-w-5xl px-6 pt-[calc(var(--header-h)+2rem)] pb-16">
      <h1 className="font-heading text-4xl">{t("title", { slug })}</h1>
      <p className="text-matte-black/70 mt-4">{t("body", { slug })}</p>
    </div>
  );
}
