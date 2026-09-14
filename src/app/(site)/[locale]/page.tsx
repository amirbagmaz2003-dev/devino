import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-heading text-5xl">{t("title")}</h1>
      <p className="font-heading mt-4 text-xl italic">{t("tagline")}</p>
      <p className="text-matte-black/70 mt-8">{t("body")}</p>
    </div>
  );
}
