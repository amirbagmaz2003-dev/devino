import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listOrderableProducts } from "@/db/orders";
import { pageMetadata } from "@/lib/seo";
import OrderForm, { type OrderProductGroup } from "@/components/order/OrderForm";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/order">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "order" });
  return {
    ...pageMetadata({ locale, path: "/order", title: t("title"), description: t("intro") }),
    // A form page, not content — kept out of search results (and the sitemap).
    robots: { index: false, follow: true },
  };
}

async function loadProductGroups(locale: string): Promise<OrderProductGroup[]> {
  try {
    const products = await listOrderableProducts(locale);
    const groups = new Map<string | null, OrderProductGroup>();
    for (const product of products) {
      const key = product.collectionId;
      if (!groups.has(key)) groups.set(key, { label: product.collectionName, products: [] });
      groups.get(key)!.products.push({
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
      });
    }
    return [...groups.values()];
  } catch (error) {
    console.error("[order] loading products failed", error);
    return [];
  }
}

/** Order request (brief 04): the team confirms size, shipping and delivery by phone. */
export default async function OrderPage({ params, searchParams }: PageProps<"/[locale]/order">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { product } = await searchParams;
  const [t, tProduct, groups] = await Promise.all([
    getTranslations("order"),
    getTranslations("productDetail"),
    loadProductGroups(locale),
  ]);

  const requested = typeof product === "string" ? product : "";
  const initialProduct = groups.some((group) => group.products.some((p) => p.slug === requested))
    ? requested
    : "";

  return (
    <div className="mx-auto max-w-2xl px-6 pt-[calc(var(--header-h)+3rem)] pb-24">
      <OrderForm
        locale={locale === "en" ? "en" : "fa"}
        productGroups={groups}
        initialProduct={initialProduct}
        currencyUnit={tProduct("currencyUnit")}
        header={
          <>
            <h1 className="font-heading text-4xl sm:text-5xl">{t("title")}</h1>
            <span aria-hidden className="bg-olive-accent mt-6 block h-px w-10" />
            <p className="text-matte-black/70 mt-6 leading-relaxed">{t("intro")}</p>
            {locale === "en" && (
              <p className="text-matte-black/70 mt-3 text-sm">{t("shippingNote")}</p>
            )}
          </>
        }
      />
    </div>
  );
}
