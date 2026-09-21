import { getDb, getMediaKv } from "./client";

/** Slugify a name for the auto-suggested slug field in the admin forms. */
export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- Media ----------

export interface MediaAdminRow {
  id: string;
  type: "image" | "video";
  /** Despite the column name (unchanged from the R2 version of this
   * schema), this now holds a Workers KV key ("media:{id}"), not an R2
   * object key — see wrangler.jsonc. */
  r2_key: string;
  content_type: string;
  focal_x: number;
  focal_y: number;
  alt_fa: string;
  alt_en: string;
}

export async function uploadMedia(params: {
  type: "image" | "video";
  file: File;
  focalX?: number;
  focalY?: number;
  altFa: string;
  altEn: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const kvKey = `media:${id}`;
  const kv = await getMediaKv();
  // Raw bytes, not base64 — KV accepts an ArrayBuffer directly, and
  // base64 would just inflate size ~33% for no benefit here.
  await kv.put(kvKey, await params.file.arrayBuffer());

  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO media (id, type, r2_key, content_type, focal_x, focal_y, alt_fa, alt_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      params.type,
      kvKey,
      params.file.type || "application/octet-stream",
      params.focalX ?? 0.5,
      params.focalY ?? 0.5,
      params.altFa,
      params.altEn,
    )
    .run();

  return id;
}

export async function updateMediaFocalPoint(id: string, focalX: number, focalY: number) {
  const db = await getDb();
  await db
    .prepare("UPDATE media SET focal_x = ?, focal_y = ? WHERE id = ?")
    .bind(focalX, focalY, id)
    .run();
}

export async function deleteMedia(id: string) {
  const db = await getDb();
  const row = await db
    .prepare("SELECT r2_key FROM media WHERE id = ?")
    .bind(id)
    .first<{ r2_key: string }>();
  if (row) {
    const kv = await getMediaKv();
    await kv.delete(row.r2_key);
  }
  await db.prepare("DELETE FROM media WHERE id = ?").bind(id).run();
}

// ---------- Collections ----------

export interface CollectionAdminRow {
  id: string;
  slug: string;
  name_fa: string;
  name_en: string;
  description_fa: string | null;
  description_en: string | null;
  cover_media_id: string | null;
  sort_order: number;
}

export async function listCollectionsAdmin(): Promise<CollectionAdminRow[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT id, slug, name_fa, name_en, description_fa, description_en, cover_media_id, sort_order
       FROM collections ORDER BY sort_order ASC, created_at ASC`,
    )
    .all<CollectionAdminRow>();
  return results;
}

export async function getCollectionAdmin(id: string): Promise<CollectionAdminRow | null> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT id, slug, name_fa, name_en, description_fa, description_en, cover_media_id, sort_order
       FROM collections WHERE id = ?`,
    )
    .bind(id)
    .first<CollectionAdminRow>();
  return row ?? null;
}

export interface CollectionInput {
  slug: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  descriptionEn: string;
  coverMediaId: string | null;
  sortOrder: number;
}

export async function createCollection(input: CollectionInput): Promise<string> {
  const id = crypto.randomUUID();
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO collections (id, slug, name_fa, name_en, description_fa, description_en, cover_media_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.slug,
      input.nameFa,
      input.nameEn,
      input.descriptionFa || null,
      input.descriptionEn || null,
      input.coverMediaId,
      input.sortOrder,
    )
    .run();
  return id;
}

export async function updateCollection(id: string, input: CollectionInput) {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE collections
       SET slug = ?, name_fa = ?, name_en = ?, description_fa = ?, description_en = ?,
           cover_media_id = ?, sort_order = ?
       WHERE id = ?`,
    )
    .bind(
      input.slug,
      input.nameFa,
      input.nameEn,
      input.descriptionFa || null,
      input.descriptionEn || null,
      input.coverMediaId,
      input.sortOrder,
      id,
    )
    .run();
}

export async function deleteCollection(id: string) {
  const db = await getDb();
  await db.prepare("DELETE FROM collections WHERE id = ?").bind(id).run();
}

// ---------- Products ----------

export interface ProductAdminRow {
  id: string;
  slug: string;
  name_fa: string;
  name_en: string;
  description_fa: string | null;
  description_en: string | null;
  price: number;
  in_stock: number;
  stock_count: number | null;
  collection_id: string | null;
  sort_order: number;
}

export async function listProductsAdmin(): Promise<ProductAdminRow[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT id, slug, name_fa, name_en, description_fa, description_en, price, in_stock,
              stock_count, collection_id, sort_order
       FROM products ORDER BY sort_order ASC, created_at ASC`,
    )
    .all<ProductAdminRow>();
  return results;
}

export async function getProductAdmin(id: string): Promise<ProductAdminRow | null> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT id, slug, name_fa, name_en, description_fa, description_en, price, in_stock,
              stock_count, collection_id, sort_order
       FROM products WHERE id = ?`,
    )
    .bind(id)
    .first<ProductAdminRow>();
  return row ?? null;
}

export interface ProductMediaAdminRow extends MediaAdminRow {
  sort_order: number;
}

export async function getProductMedia(productId: string): Promise<ProductMediaAdminRow[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT m.id, m.type, m.r2_key, m.content_type, m.focal_x, m.focal_y, m.alt_fa, m.alt_en,
              pm.sort_order
       FROM product_media pm
       JOIN media m ON m.id = pm.media_id
       WHERE pm.product_id = ?
       ORDER BY pm.sort_order ASC`,
    )
    .bind(productId)
    .all<ProductMediaAdminRow>();
  return results;
}

export interface ProductInput {
  slug: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  descriptionEn: string;
  price: number;
  inStock: boolean;
  stockCount: number | null;
  collectionId: string | null;
  sortOrder: number;
}

export async function createProduct(input: ProductInput): Promise<string> {
  const id = crypto.randomUUID();
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO products
        (id, slug, name_fa, name_en, description_fa, description_en, price, in_stock,
         stock_count, collection_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.slug,
      input.nameFa,
      input.nameEn,
      input.descriptionFa || null,
      input.descriptionEn || null,
      input.price,
      input.inStock ? 1 : 0,
      input.stockCount,
      input.collectionId,
      input.sortOrder,
    )
    .run();
  return id;
}

export async function updateProduct(id: string, input: ProductInput) {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE products
       SET slug = ?, name_fa = ?, name_en = ?, description_fa = ?, description_en = ?,
           price = ?, in_stock = ?, stock_count = ?, collection_id = ?, sort_order = ?
       WHERE id = ?`,
    )
    .bind(
      input.slug,
      input.nameFa,
      input.nameEn,
      input.descriptionFa || null,
      input.descriptionEn || null,
      input.price,
      input.inStock ? 1 : 0,
      input.stockCount,
      input.collectionId,
      input.sortOrder,
      id,
    )
    .run();
}

export async function deleteProduct(id: string) {
  const db = await getDb();
  await db.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
}

export async function addProductMedia(productId: string, mediaId: string, sortOrder: number) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO product_media (product_id, media_id, sort_order) VALUES (?, ?, ?)
       ON CONFLICT (product_id, media_id) DO UPDATE SET sort_order = excluded.sort_order`,
    )
    .bind(productId, mediaId, sortOrder)
    .run();
}

export async function removeProductMedia(productId: string, mediaId: string) {
  const db = await getDb();
  await db
    .prepare("DELETE FROM product_media WHERE product_id = ? AND media_id = ?")
    .bind(productId, mediaId)
    .run();
}

// ---------- Site settings ----------

export interface SiteSettingsAdminRow {
  brand_name: string;
  tagline_fa: string | null;
  tagline_en: string | null;
  contact_phone: string | null;
  telegram_url: string | null;
  instagram_url: string | null;
}

export async function getSiteSettingsAdmin(): Promise<SiteSettingsAdminRow> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT brand_name, tagline_fa, tagline_en, contact_phone, telegram_url, instagram_url
       FROM site_settings WHERE id = 1`,
    )
    .first<SiteSettingsAdminRow>();
  return (
    row ?? {
      brand_name: "deVino",
      tagline_fa: null,
      tagline_en: null,
      contact_phone: null,
      telegram_url: null,
      instagram_url: null,
    }
  );
}

export async function updateSiteSettings(input: SiteSettingsAdminRow) {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE site_settings
       SET brand_name = ?, tagline_fa = ?, tagline_en = ?, contact_phone = ?,
           telegram_url = ?, instagram_url = ?
       WHERE id = 1`,
    )
    .bind(
      input.brand_name,
      input.tagline_fa,
      input.tagline_en,
      input.contact_phone,
      input.telegram_url,
      input.instagram_url,
    )
    .run();
}
