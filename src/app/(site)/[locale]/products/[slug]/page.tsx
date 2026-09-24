import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductBySlug, getSiteSettings } from "@/db/queries";
import { excerpt, pageMetadata } from "@/lib/seo";
import { formatPrice } from "@/lib/formatPrice";
import ProductGallery from "@/components/ProductGallery";
import ContactChannels from "@/components/ContactChannels";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug, locale);
  if (!product) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const cover = product.images.find((image) => image.type === "image") ?? null;
  return pageMetadata({
    locale,
    path: `/products/${product.slug}`,
    title: product.name,
    description:
      excerpt(product.description) ??
      (product.collection
        ? `${product.name} — ${product.collection.name}`
        : t("collectionsDescription")),
    imageUrl: cover?.asset.url,
    imageAlt: cover?.alt || product.name,
  });
}

export default async function ProductDetailPage({
  params,
}: PageProps<"/[locale]/products/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [product, siteSettings, t] = await Promise.all([
    getProductBySlug(slug, locale),
    getSiteSettings(),
    getTranslations("productDetail"),
  ]);
  if (!product) notFound();

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

          <Link
            href={{ pathname: "/contact", query: { product: product.slug } }}
            className="bg-matte-black text-pearl-white hover:bg-matte-black/85 focus-visible:outline-olive-accent mt-8 inline-flex min-h-12 items-center justify-center px-8 text-sm tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("bookFitting")}
          </Link>

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
