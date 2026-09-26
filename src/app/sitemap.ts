import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getSitemapSlugs } from "@/db/queries";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const STATIC_PATHS = ["/", "/collections", "/about", "/contact", "/terms"];

/** Every public page in both locales, each entry listing its hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [siteUrl, slugs] = await Promise.all([getSiteUrl(), getSitemapSlugs()]);
  const paths = [
    ...STATIC_PATHS,
    ...slugs.collections.map(
      (slug) => `/collections/${encodeURIComponent(slug)}`,
    ),
    ...slugs.products.map((slug) => `/products/${encodeURIComponent(slug)}`),
  ];
  const url = (locale: string, path: string) =>
    `${siteUrl}/${locale}${path === "/" ? "" : path}`;

  return paths.flatMap((path) => {
    const languages = Object.fromEntries([
      ...routing.locales.map((locale) => [locale, url(locale, path)]),
      ["x-default", url(routing.defaultLocale, path)],
    ]);
    return routing.locales.map((locale) => ({
      url: url(locale, path),
      alternates: { languages },
    }));
  });
}
