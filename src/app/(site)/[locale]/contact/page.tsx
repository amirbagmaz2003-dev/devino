import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listBookableProducts } from "@/db/bookings";
import { getSiteSettings } from "@/db/queries";
import { todayInTehran } from "@/lib/jalali";
import { pageMetadata } from "@/lib/seo";
import BookingForm, {
  type BookingProductGroup,
} from "@/components/booking/BookingForm";
import ContactChannels from "@/components/ContactChannels";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return pageMetadata({
    locale,
    path: "/contact",
    title: t("title"),
    description: t("intro"),
  });
}

async function loadProductGroups(
  locale: string,
): Promise<BookingProductGroup[]> {
  try {
    const products = await listBookableProducts(locale);
    const groups = new Map<string | null, BookingProductGroup>();
    for (const product of products) {
      const key = product.collectionId;
      if (!groups.has(key))
        groups.set(key, { label: product.collectionName, products: [] });
      groups
        .get(key)!
        .products.push({ slug: product.slug, name: product.name });
    }
    return [...groups.values()];
  } catch (error) {
    // The form still works without the optional dress list.
    console.error("[contact] loading products failed", error);
    return [];
  }
}

/** Private fitting booking (brief 02, §1) — replaces the old placeholder contact page. */
export default async function ContactPage({
  params,
  searchParams,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { product } = await searchParams;
  const [t, tProduct, groups, settings] = await Promise.all([
    getTranslations("contact"),
    getTranslations("productDetail"),
    loadProductGroups(locale),
    getSiteSettings(),
  ]);

  const requested = typeof product === "string" ? product : "";
  const initialProduct = groups.some((group) =>
    group.products.some((p) => p.slug === requested),
  )
    ? requested
    : "";

  return (
    <div className="mx-auto max-w-2xl px-6 pt-[calc(var(--header-h)+3rem)] pb-24">
      <h1 className="font-heading text-4xl sm:text-5xl">{t("title")}</h1>
      <span aria-hidden className="bg-olive-accent mt-6 block h-px w-10" />
      <p className="text-matte-black/70 mt-6 leading-relaxed">{t("intro")}</p>

      <div className="mt-12">
        <BookingForm
          locale={locale === "en" ? "en" : "fa"}
          productGroups={groups}
          initialProduct={initialProduct}
          today={todayInTehran()}
        />
      </div>

      <ContactChannels
        heading={t("channelsHeading")}
        phone={settings?.contactPhone}
        telegramUrl={settings?.telegramUrl}
        instagramUrl={settings?.instagramUrl}
        phoneLabel={tProduct("phoneLabel")}
        telegramLabel={tProduct("telegramLabel")}
        instagramLabel={tProduct("instagramLabel")}
      />
    </div>
  );
}
