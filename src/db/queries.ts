import { cache } from "react";
import type { MediaBoxProps } from "@/components/MediaBox";
import { getDb } from "./client";
import { resolveMedia } from "./media";

/**
 * Every read here is wrapped so a D1 failure (missing binding, a bad
 * migration, a transient outage) degrades to an empty result instead of
 * crashing the page — pages render their own empty state rather than
 * fabricated content. Each catch logs the real error via console.error so
 * failures are visible in `wrangler tail` / the Cloudflare dashboard
 * instead of silently looking like "no data yet".
 */

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImage: MediaBoxProps | null;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  price: number;
  inStock: boolean;
  stockCount: number | null;
  mainImage: MediaBoxProps | null;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  inStock: boolean;
  stockCount: number | null;
  images: MediaBoxProps[];
  collection: { name: string; slug: string } | null;
}

export interface CollectionDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImage: MediaBoxProps | null;
  products: ProductSummary[];
}

export interface SiteSettingsData {
  brandName: string | null;
  tagline: { fa?: string; en?: string } | null;
  contactPhone: string | null;
  telegramUrl: string | null;
  instagramUrl: string | null;
}

function pickLocale(fa: string, en: string, locale: string) {
  return (locale === "fa" ? fa : en) || fa || en || "";
}

interface CollectionRow {
  id: string;
  slug: string;
  name_fa: string;
  name_en: string;
  description_fa: string | null;
  description_en: string | null;
  media_id: string | null;
  media_type: "image" | "video" | null;
  focal_x: number | null;
  focal_y: number | null;
  media_alt_fa: string | null;
  media_alt_en: string | null;
}

function toCollectionSummary(row: CollectionRow, locale: string): CollectionSummary {
  return {
    id: row.id,
    name: pickLocale(row.name_fa, row.name_en, locale),
    slug: row.slug,
    description: pickLocale(row.description_fa ?? "", row.description_en ?? "", locale) || null,
    coverImage: row.media_id
      ? resolveMedia(
          {
            id: row.media_id,
            type: row.media_type ?? "image",
            focal_x: row.focal_x ?? 0.5,
            focal_y: row.focal_y ?? 0.5,
            alt_fa: row.media_alt_fa ?? "",
            alt_en: row.media_alt_en ?? "",
          },
          locale,
        )
      : null,
  };
}

const COLLECTION_SELECT = /* sql */ `
  SELECT
    c.id, c.slug, c.name_fa, c.name_en, c.description_fa, c.description_en,
    m.id AS media_id, m.type AS media_type, m.focal_x, m.focal_y,
    m.alt_fa AS media_alt_fa, m.alt_en AS media_alt_en
  FROM collections c
  LEFT JOIN media m ON m.id = c.cover_media_id
`;

export async function getCollections(locale: string): Promise<CollectionSummary[]> {
  try {
    const db = await getDb();
    const { results } = await db
      .prepare(`${COLLECTION_SELECT} ORDER BY c.sort_order ASC, c.created_at ASC`)
      .all<CollectionRow>();
    return results.map((row) => toCollectionSummary(row, locale));
  } catch (error) {
    console.error("[getCollections] D1 query failed:", error);
    return [];
  }
}

interface ProductRow {
  id: string;
  slug: string;
  name_fa: string;
  name_en: string;
  price: number;
  in_stock: number;
  stock_count: number | null;
  media_id: string | null;
  media_type: "image" | "video" | null;
  focal_x: number | null;
  focal_y: number | null;
  media_alt_fa: string | null;
  media_alt_en: string | null;
}

function toProductSummary(row: ProductRow, locale: string): ProductSummary {
  return {
    id: row.id,
    name: pickLocale(row.name_fa, row.name_en, locale),
    slug: row.slug,
    price: row.price,
    inStock: row.in_stock === 1,
    stockCount: row.stock_count,
    mainImage: row.media_id
      ? resolveMedia(
          {
            id: row.media_id,
            type: row.media_type ?? "image",
            focal_x: row.focal_x ?? 0.5,
            focal_y: row.focal_y ?? 0.5,
            alt_fa: row.media_alt_fa ?? "",
            alt_en: row.media_alt_en ?? "",
          },
          locale,
        )
      : null,
  };
}

const PRODUCT_SUMMARY_SELECT = /* sql */ `
  SELECT
    p.id, p.slug, p.name_fa, p.name_en, p.price, p.in_stock, p.stock_count,
    m.id AS media_id, m.type AS media_type, m.focal_x, m.focal_y,
    m.alt_fa AS media_alt_fa, m.alt_en AS media_alt_en
  FROM products p
  LEFT JOIN (
    SELECT pm.product_id, pm.media_id,
      ROW_NUMBER() OVER (PARTITION BY pm.product_id ORDER BY pm.sort_order ASC) AS rn
    FROM product_media pm
  ) first_media ON first_media.product_id = p.id AND first_media.rn = 1
  LEFT JOIN media m ON m.id = first_media.media_id
`;

/** Per-request memoized: generateMetadata and the page share one lookup. */
export const getCollectionBySlug = cache(async (
  slug: string,
  locale: string,
): Promise<CollectionDetail | null> => {
  try {
    const db = await getDb();
    const collection = await db
      .prepare(`${COLLECTION_SELECT} WHERE c.slug = ?`)
      .bind(slug)
      .first<CollectionRow>();
    if (!collection) return null;

    const { results: productRows } = await db
      .prepare(
        `${PRODUCT_SUMMARY_SELECT}
         WHERE p.collection_id = ?
         ORDER BY p.sort_order ASC, p.created_at ASC`,
      )
      .bind(collection.id)
      .all<ProductRow>();

    return {
      id: collection.id,
      name: pickLocale(collection.name_fa, collection.name_en, locale),
      slug: collection.slug,
      description:
        pickLocale(collection.description_fa ?? "", collection.description_en ?? "", locale) ||
        null,
      coverImage: toCollectionSummary(collection, locale).coverImage,
      products: productRows.map((row) => toProductSummary(row, locale)),
    };
  } catch (error) {
    console.error("[getCollectionBySlug] D1 query failed:", error);
    return null;
  }
});

interface ProductDetailRow {
  id: string;
  slug: string;
  name_fa: string;
  name_en: string;
  description_fa: string | null;
  description_en: string | null;
  price: number;
  in_stock: number;
  stock_count: number | null;
  collection_slug: string | null;
  collection_name_fa: string | null;
  collection_name_en: string | null;
}

interface ProductMediaRow {
  id: string;
  type: "image" | "video";
  focal_x: number;
  focal_y: number;
  alt_fa: string;
  alt_en: string;
}

/** Per-request memoized: generateMetadata and the page share one lookup. */
export const getProductBySlug = cache(async (
  slug: string,
  locale: string,
): Promise<ProductDetail | null> => {
  try {
    const db = await getDb();
    const product = await db
      .prepare(
        /* sql */ `
        SELECT
          p.id, p.slug, p.name_fa, p.name_en, p.description_fa, p.description_en,
          p.price, p.in_stock, p.stock_count,
          col.slug AS collection_slug, col.name_fa AS collection_name_fa,
          col.name_en AS collection_name_en
        FROM products p
        LEFT JOIN collections col ON col.id = p.collection_id
        WHERE p.slug = ?
      `,
      )
      .bind(slug)
      .first<ProductDetailRow>();
    if (!product) return null;

    const { results: imageRows } = await db
      .prepare(
        /* sql */ `
        SELECT m.id, m.type, m.focal_x, m.focal_y, m.alt_fa, m.alt_en
        FROM product_media pm
        JOIN media m ON m.id = pm.media_id
        WHERE pm.product_id = ?
        ORDER BY pm.sort_order ASC
      `,
      )
      .bind(product.id)
      .all<ProductMediaRow>();

    return {
      id: product.id,
      name: pickLocale(product.name_fa, product.name_en, locale),
      slug: product.slug,
      description:
        pickLocale(product.description_fa ?? "", product.description_en ?? "", locale) || null,
      price: product.price,
      inStock: product.in_stock === 1,
      stockCount: product.stock_count,
      images: imageRows.map((row) => resolveMedia(row, locale)),
      collection:
        product.collection_slug && (product.collection_name_fa || product.collection_name_en)
          ? {
              slug: product.collection_slug,
              name: pickLocale(
                product.collection_name_fa ?? "",
                product.collection_name_en ?? "",
                locale,
              ),
            }
          : null,
    };
  } catch (error) {
    console.error("[getProductBySlug] D1 query failed:", error);
    return null;
  }
});

interface SiteSettingsRow {
  brand_name: string;
  tagline_fa: string | null;
  tagline_en: string | null;
  contact_phone: string | null;
  telegram_url: string | null;
  instagram_url: string | null;
}

/**
 * Per-request memoized (React cache): the layout's metadata, the header
 * tagline, the footer and the page itself can all ask for it and D1 is
 * queried once.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettingsData | null> => {
  try {
    const db = await getDb();
    const row = await db
      .prepare(
        `SELECT brand_name, tagline_fa, tagline_en, contact_phone, telegram_url, instagram_url
         FROM site_settings WHERE id = 1`,
      )
      .first<SiteSettingsRow>();
    if (!row) return null;
    return {
      brandName: row.brand_name,
      tagline: { fa: row.tagline_fa ?? undefined, en: row.tagline_en ?? undefined },
      contactPhone: row.contact_phone,
      telegramUrl: row.telegram_url,
      instagramUrl: row.instagram_url,
    };
  } catch (error) {
    console.error("[getSiteSettings] D1 query failed:", error);
    return null;
  }
});

/** Slugs for sitemap.xml (collections and products, all public). */
export async function getSitemapSlugs(): Promise<{
  collections: string[];
  products: string[];
}> {
  try {
    const db = await getDb();
    const [collections, products] = await Promise.all([
      db.prepare("SELECT slug FROM collections ORDER BY sort_order, created_at").all<{ slug: string }>(),
      db.prepare("SELECT slug FROM products ORDER BY sort_order, created_at").all<{ slug: string }>(),
    ]);
    return {
      collections: collections.results.map((row) => row.slug),
      products: products.results.map((row) => row.slug),
    };
  } catch (error) {
    console.error("[getSitemapSlugs] D1 query failed:", error);
    return { collections: [], products: [] };
  }
}
