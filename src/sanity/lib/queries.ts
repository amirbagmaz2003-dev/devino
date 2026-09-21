import { client } from "./client";
import { resolveMediaBox, type RawMediaBoxValue } from "./mediaBox";
import type { MediaBoxProps } from "@/components/MediaBox";

/**
 * No real Sanity project is connected yet (see src/sanity/env.ts —
 * projectId defaults to "placeholder"). Every fetch below is wrapped so a
 * missing/misconfigured dataset degrades to an empty result instead of
 * breaking the build or the page — pages then render their own empty
 * state rather than showing fabricated data.
 */

const MEDIA_BOX_PROJECTION = /* groq */ `{
  type,
  image,
  "video": { "asset": { "url": video.asset->url } },
  alt
}`;

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
  products: ProductSummary[];
}

export interface SiteSettingsData {
  brandName: string | null;
  tagline: { fa?: string; en?: string } | null;
  contactEmail: string | null;
  contactPhone: string | null;
  telegramUrl: string | null;
  instagramUrl: string | null;
}

interface RawCollectionSummary {
  _id: string;
  name: string;
  slug: string | null;
  description: string | null;
  coverImage: RawMediaBoxValue | null;
}

interface RawProductSummary {
  _id: string;
  name: string;
  slug: string | null;
  price: number;
  inStock: boolean | null;
  stockCount: number | null;
  images: RawMediaBoxValue[] | null;
}

interface RawProductDetail extends RawProductSummary {
  description: string | null;
  collection: { name: string; slug: string | null } | null;
}

interface RawCollectionDetail extends RawCollectionSummary {
  products: RawProductSummary[] | null;
}

function toCollectionSummary(raw: RawCollectionSummary): CollectionSummary | null {
  if (!raw.slug) return null;
  return {
    id: raw._id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    coverImage: raw.coverImage ? resolveMediaBox(raw.coverImage) : null,
  };
}

function toProductSummary(raw: RawProductSummary): ProductSummary | null {
  if (!raw.slug) return null;
  return {
    id: raw._id,
    name: raw.name,
    slug: raw.slug,
    price: raw.price,
    inStock: raw.inStock ?? true,
    stockCount: raw.stockCount ?? null,
    mainImage: raw.images?.[0] ? resolveMediaBox(raw.images[0]) : null,
  };
}

export async function getCollections(): Promise<CollectionSummary[]> {
  try {
    const raw = await client.fetch<RawCollectionSummary[]>(
      /* groq */ `*[_type == "collection"] | order(name asc) {
        _id,
        name,
        "slug": slug.current,
        description,
        "coverImage": coverImage${MEDIA_BOX_PROJECTION}
      }`,
    );
    return raw.map(toCollectionSummary).filter((c): c is CollectionSummary => c !== null);
  } catch {
    return [];
  }
}

export async function getCollectionBySlug(
  slug: string,
): Promise<CollectionDetail | null> {
  try {
    const raw = await client.fetch<RawCollectionDetail | null>(
      /* groq */ `*[_type == "collection" && slug.current == $slug][0]{
        _id,
        name,
        "slug": slug.current,
        description,
        "products": products[]->{
          _id,
          name,
          "slug": slug.current,
          price,
          inStock,
          stockCount,
          "images": images[]${MEDIA_BOX_PROJECTION}
        }
      }`,
      { slug },
    );
    if (!raw || !raw.slug) return null;
    return {
      id: raw._id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      products: (raw.products ?? [])
        .map(toProductSummary)
        .filter((p): p is ProductSummary => p !== null),
    };
  } catch {
    return null;
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    const raw = await client.fetch<RawProductDetail | null>(
      /* groq */ `*[_type == "product" && slug.current == $slug][0]{
        _id,
        name,
        "slug": slug.current,
        description,
        price,
        inStock,
        stockCount,
        "images": images[]${MEDIA_BOX_PROJECTION},
        "collection": collection->{ name, "slug": slug.current }
      }`,
      { slug },
    );
    if (!raw || !raw.slug) return null;
    return {
      id: raw._id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      price: raw.price,
      inStock: raw.inStock ?? true,
      stockCount: raw.stockCount ?? null,
      images: (raw.images ?? []).map(resolveMediaBox),
      collection:
        raw.collection && raw.collection.slug
          ? { name: raw.collection.name, slug: raw.collection.slug }
          : null,
    };
  } catch {
    return null;
  }
}

export async function getSiteSettings(): Promise<SiteSettingsData | null> {
  try {
    const raw = await client.fetch<SiteSettingsData | null>(
      /* groq */ `*[_type == "siteSettings"][0]{
        brandName,
        tagline,
        contactEmail,
        contactPhone,
        telegramUrl,
        instagramUrl
      }`,
    );
    return raw ?? null;
  } catch {
    return null;
  }
}
