import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Rendered (with a real HTTP 404) for any notFound() under [locale] — a
 * missing collection or product — and for unknown paths via the
 * [...rest] catch-all. Inherits the locale layout, so it's bilingual and
 * RTL/LTR like every other page.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center px-6 pt-[calc(var(--header-h)+2rem)] pb-24 text-center">
      <p aria-hidden className="font-heading text-matte-black/20 text-7xl">
        404
      </p>
      <span aria-hidden className="bg-olive-accent mt-6 block h-px w-10" />
      <h1 className="font-heading mt-6 text-3xl sm:text-4xl">{t("title")}</h1>
      <p className="text-matte-black/70 mt-4">{t("body")}</p>
      <Link
        href="/collections"
        className="border-matte-black hover:bg-matte-black hover:text-pearl-white mt-10 inline-flex min-h-12 items-center border px-8 text-sm tracking-wide transition-colors"
      >
        {t("back")}
      </Link>
    </div>
  );
}
