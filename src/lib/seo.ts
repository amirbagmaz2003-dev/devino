import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

export const BRAND_NAME = "deVino";

const OG_LOCALE: Record<string, string> = { fa: "fa_IR", en: "en_US" };

/**
 * canonical + hreflang alternates for a locale-less path ("/collections/x"),
 * with x-default pointing at the Persian (default-locale) version. Relative
 * URLs — metadataBase (SITE_URL) makes them absolute.
 */
export function localeAlternates(
  locale: string,
  path: string,
): Metadata["alternates"] {
  const suffix = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${suffix}`;
  languages["x-default"] = `/${routing.defaultLocale}${suffix}`;
  return { canonical: `/${locale}${suffix}`, languages };
}

interface PageMetadataInput {
  locale: string;
  /** Locale-less path, e.g. "/collections/first-harvest". */
  path: string;
  /** Page title (goes through the "%s | deVino" template); omit for the home page. */
  title?: string;
  description: string;
  /** Share image path (a collection cover / first product photo), e.g. "/media/<id>". */
  imageUrl?: string | null;
  imageAlt?: string;
}

/** Localized per-page metadata with hreflang alternates, Open Graph and Twitter card. */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  imageUrl,
  imageAlt,
}: PageMetadataInput): Metadata {
  const url = `/${locale}${path === "/" ? "" : path}`;
  const images = imageUrl
    ? [{ url: imageUrl, alt: imageAlt || title || BRAND_NAME }]
    : undefined;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: localeAlternates(locale, path),
    openGraph: {
      type: "website",
      siteName: BRAND_NAME,
      locale: OG_LOCALE[locale] ?? locale,
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => OG_LOCALE[l] ?? l),
      url,
      title: title ?? BRAND_NAME,
      description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: title ?? BRAND_NAME,
      description,
      ...(images ? { images: images.map((image) => image.url) } : {}),
    },
  };
}

/** Plain-text excerpt for meta descriptions (≈160 chars, whitespace collapsed). */
export function excerpt(
  text: string | null | undefined,
  max = 160,
): string | null {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (!flat) return null;
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}
