import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteSettings } from "@/db/queries";
import { pageMetadata } from "@/lib/seo";
import ContactChannels from "@/components/ContactChannels";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return pageMetadata({ locale, path: "/contact", title: t("title"), description: t("intro") });
}

/** Contact channels only (brief 04) — orders go through /order from each piece's page. */
export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tProduct, settings] = await Promise.all([
    getTranslations("contact"),
    getTranslations("productDetail"),
    getSiteSettings(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 pt-[calc(var(--header-h)+3rem)] pb-24">
      <h1 className="font-heading text-4xl sm:text-5xl">{t("title")}</h1>
      <span aria-hidden className="bg-olive-accent mt-6 block h-px w-10" />
      <p className="font-heading text-matte-black/70 mt-6 text-lg italic">{t("lead")}</p>
      <p className="text-matte-black/70 mt-4 leading-relaxed">{t("intro")}</p>

      <ContactChannels
        prominent
        phone={settings?.contactPhone}
        telegramUrl={settings?.telegramUrl}
        instagramUrl={settings?.instagramUrl}
        phoneLabel={tProduct("phoneLabel")}
        telegramLabel={tProduct("telegramLabel")}
        instagramLabel={tProduct("instagramLabel")}
      />

      <p className="text-matte-black/70 mt-12 text-sm">
        <Link href="/collections" className="hover:text-olive-accent underline underline-offset-4">
          {t("orderHint")}
        </Link>
      </p>
    </div>
  );
}
