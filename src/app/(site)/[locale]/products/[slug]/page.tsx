import { getTranslations, setRequestLocale } from "next-intl/server";
import { getProductBySlug, getSiteSettings } from "@/db/queries";
import { formatPrice } from "@/lib/formatPrice";
import ProductGallery from "@/components/ProductGallery";
import ContactChannels from "@/components/ContactChannels";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: PageProps<"/[locale]/products/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("productDetail");
  const [product, siteSettings] = await Promise.all([
    getProductBySlug(slug, locale),
    getSiteSettings(),
  ]);

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-6 pt-[calc(var(--header-h)+2rem)] pb-24 text-center">
        <p className="text-matte-black/70">{t("notFound")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pt-[calc(var(--header-h)+2rem)] pb-24">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} />

        <div>
          <h1 className="font-heading text-3xl sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-lg">
            {formatPrice(product.price, locale, t("currencyUnit"))}
          </p>
          <p className="text-matte-black/70 mt-2 text-sm">
            {product.inStock ? t("inStock") : t("outOfStock")}
          </p>
          {product.description && (
            <p className="text-matte-black/80 mt-6 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          <ContactChannels
            heading={t("orderHeading")}
            description={t("orderDescription")}
            phone={siteSettings?.contactPhone}
            telegramUrl={siteSettings?.telegramUrl}
            instagramUrl={siteSettings?.instagramUrl}
            phoneLabel={t("phoneLabel")}
            telegramLabel={t("telegramLabel")}
            instagramLabel={t("instagramLabel")}
          />
        </div>
      </div>
    </div>
  );
}
