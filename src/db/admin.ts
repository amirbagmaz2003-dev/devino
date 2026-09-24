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
  try {
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
  } catch (error) {
    // Never leave a KV value behind that no media row points to.
    await kv.delete(kvKey);
    throw error;
  }

  return id;
}

export async function updateMediaFocalPoint(
  id: string,
  focalX: number,
  focalY: number,
) {
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

/** Whether any product gallery or collection cover still points at this media. */
export async function isMediaReferenced(id: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT EXISTS (SELECT 1 FROM product_media WHERE media_id = ?1)
           OR EXISTS (SELECT 1 FROM collections WHERE cover_media_id = ?1) AS used`,
    )
    .bind(id)
    .first<{ used: number }>();
  return row?.used === 1;
}

/** Deletes the media (KV value + row) unless something still references it. */
export async function deleteMediaIfUnreferenced(id: string) {
  if (!(await isMediaReferenced(id))) {
    await deleteMedia(id);
  }
}

// ---------- Validation helpers ----------

/** Whether another row of `table` (other than `excludeId`) already uses `slug`. */
export async function isSlugTaken(
  table: "collections" | "products",
  slug: string,
  excludeId: string | null = null,
): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT 1 AS taken FROM ${table} WHERE slug = ? AND id IS NOT ? LIMIT 1`,
    )
    .bind(slug, excludeId)
    .first<{ taken: number }>();
  return row !== null;
}

/** D1 surfaces SQLite constraint violations as plain Errors with this text. */
export function isUniqueSlugViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    /UNIQUE constraint failed: \w+\.slug/.test(error.message)
  );
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

export interface CollectionListAdminRow extends CollectionAdminRow {
  product_count: number;
}

export async function listCollectionsAdmin(): Promise<
  CollectionListAdminRow[]
> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT c.id, c.slug, c.name_fa, c.name_en, c.description_fa, c.description_en,
              c.cover_media_id, c.sort_order,
              (SELECT COUNT(*) FROM products p WHERE p.collection_id = c.id) AS product_count
       FROM collections c ORDER BY c.sort_order ASC, c.created_at ASC`,
    )
    .all<CollectionListAdminRow>();
  return results;
}

export async function countProductsInCollection(id: string): Promise<number> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM products WHERE collection_id = ?")
    .bind(id)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getCollectionAdmin(
  id: string,
): Promise<CollectionAdminRow | null> {
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

export async function createCollection(
  input: CollectionInput,
): Promise<string> {
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

/**
 * Updates the collection row and, when given, the (unchanged) cover's
 * focal point in one atomic batch.
 */
export async function updateCollection(
  id: string,
  input: CollectionInput,
  coverFocal?: { mediaId: string; x: number; y: number },
) {
  const db = await getDb();
  const statements = [
    db
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
      ),
  ];
  if (coverFocal) {
    statements.push(
      db
        .prepare("UPDATE media SET focal_x = ?, focal_y = ? WHERE id = ?")
        .bind(coverFocal.x, coverFocal.y, coverFocal.mediaId),
    );
  }
  await db.batch(statements);
}

/**
 * Refuses (returns false) while any product still belongs to the
 * collection — the guard runs inside the DELETE itself, so a product
 * assigned concurrently can't slip through. Returns true when deleted.
 */
export async function deleteCollection(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .prepare(
      `DELETE FROM collections
       WHERE id = ?1 AND NOT EXISTS (SELECT 1 FROM products WHERE collection_id = ?1)`,
    )
    .bind(id)
    .run();
  return result.meta.changes > 0;
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

export interface ProductListAdminRow extends ProductAdminRow {
  image_count: number;
}

export async function listProductsAdmin(): Promise<ProductListAdminRow[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT p.id, p.slug, p.name_fa, p.name_en, p.description_fa, p.description_en, p.price,
              p.in_stock, p.stock_count, p.collection_id, p.sort_order,
              (SELECT COUNT(*) FROM product_media pm WHERE pm.product_id = p.id) AS image_count
       FROM products p ORDER BY p.sort_order ASC, p.created_at ASC`,
    )
    .all<ProductListAdminRow>();
  return results;
}

export async function getProductAdmin(
  id: string,
): Promise<ProductAdminRow | null> {
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

export async function getProductMedia(
  productId: string,
): Promise<ProductMediaAdminRow[]> {
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

/** Inserts the product and (optionally) links its first image, atomically. */
export async function createProduct(
  input: ProductInput,
  initialMediaId: string | null = null,
): Promise<string> {
  const id = crypto.randomUUID();
  const db = await getDb();
  const insert = db
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
    );
  await db.batch(
    initialMediaId
      ? [
          insert,
          db
            .prepare(
              "INSERT INTO product_media (product_id, media_id, sort_order) VALUES (?, ?, 0)",
            )
            .bind(id, initialMediaId),
        ]
      : [insert],
  );
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

/**
 * Deletes the product and its gallery links in one batch, then the media
 * files themselves (KV value + row) unless another product or a
 * collection cover still uses them.
 */
export async function deleteProduct(id: string) {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT media_id FROM product_media WHERE product_id = ?")
    .bind(id)
    .all<{ media_id: string }>();
  await db.batch([
    db.prepare("DELETE FROM product_media WHERE product_id = ?").bind(id),
    db.prepare("DELETE FROM products WHERE id = ?").bind(id),
  ]);
  for (const { media_id } of results) {
    await deleteMediaIfUnreferenced(media_id);
  }
}

export async function addProductMedia(
  productId: string,
  mediaId: string,
  sortOrder: number,
) {
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

// ---------- Login rate limiting ----------

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

/**
 * True while `ip` is locked out: its most recent failure is less than
 * LOGIN_LOCKOUT_MS old and, counting back LOGIN_WINDOW_MS from that
 * failure, there were at least LOGIN_MAX_FAILURES. Attempts made while
 * locked are rejected without being recorded, so the lock lasts exactly
 * 15 minutes from the failure that triggered it.
 */
export async function isLoginLocked(
  ip: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT attempted_at FROM login_attempts
       WHERE ip = ? AND attempted_at > ?
       ORDER BY attempted_at DESC`,
    )
    .bind(ip, now - LOGIN_LOCKOUT_MS - LOGIN_WINDOW_MS)
    .all<{ attempted_at: number }>();
  const latest = results[0]?.attempted_at;
  if (latest === undefined || now - latest >= LOGIN_LOCKOUT_MS) return false;
  const inWindow = results.filter(
    (r) => r.attempted_at > latest - LOGIN_WINDOW_MS,
  );
  return inWindow.length >= LOGIN_MAX_FAILURES;
}

export async function recordLoginFailure(ip: string, now = Date.now()) {
  const db = await getDb();
  await db.batch([
    db
      .prepare("INSERT INTO login_attempts (ip, attempted_at) VALUES (?, ?)")
      .bind(ip, now),
    // Opportunistic pruning keeps the table tiny without a cron job.
    db
      .prepare("DELETE FROM login_attempts WHERE attempted_at < ?")
      .bind(now - 24 * 60 * 60 * 1000),
  ]);
}

export async function clearLoginFailures(ip: string) {
  const db = await getDb();
  await db.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
}
