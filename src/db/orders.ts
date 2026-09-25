import type { MediaBoxProps } from "@/components/MediaBox";
import { getDb } from "./client";
import { resolveMedia } from "./media";
import type { OrderStatus } from "./orderStatus";

export { ORDER_STATUSES, isOrderStatus, type OrderStatus } from "./orderStatus";

export const ORDER_RATE_LIMIT = 5;
export const ORDER_RATE_WINDOW_MS = 60 * 60 * 1000;

export interface OrderInput {
  name: string;
  phone: string;
  productId: string;
  productNameSnapshot: string;
  priceSnapshot: number;
  size: number;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  note: string | null;
  locale: "fa" | "en";
}

/** Whether `ip` already has ORDER_RATE_LIMIT accepted orders in the last hour. */
export async function isOrderRateLimited(ip: string, now = Date.now()): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM order_submissions WHERE ip = ? AND submitted_at > ?")
    .bind(ip, now - ORDER_RATE_WINDOW_MS)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= ORDER_RATE_LIMIT;
}

/**
 * Saves the order and counts it against the IP's hourly limit in one
 * atomic batch (plus pruning of day-old counter rows). Returns the id.
 */
export async function createOrder(input: OrderInput, ip: string, now = Date.now()) {
  const id = crypto.randomUUID();
  const db = await getDb();
  await db.batch([
    db
      .prepare(
        `INSERT INTO orders (id, name, phone, product_id, product_name_snapshot, price_snapshot,
           size, province, city, address, postal_code, note, locale)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.name,
        input.phone,
        input.productId,
        input.productNameSnapshot,
        input.priceSnapshot,
        input.size,
        input.province,
        input.city,
        input.address,
        input.postalCode,
        input.note,
        input.locale,
      ),
    db.prepare("INSERT INTO order_submissions (ip, submitted_at) VALUES (?, ?)").bind(ip, now),
    db
      .prepare("DELETE FROM order_submissions WHERE submitted_at < ?")
      .bind(now - 24 * 60 * 60 * 1000),
  ]);
  return id;
}

/** Price and Persian name straight from the DB — the form never supplies them. */
export async function getProductForOrder(
  slug: string,
): Promise<{ id: string; nameFa: string; price: number } | null> {
  if (!slug) return null;
  const db = await getDb();
  const row = await db
    .prepare("SELECT id, name_fa, name_en, price FROM products WHERE slug = ?")
    .bind(slug)
    .first<{ id: string; name_fa: string; name_en: string; price: number }>();
  return row ? { id: row.id, nameFa: row.name_fa || row.name_en, price: row.price } : null;
}

export interface OrderableProduct {
  slug: string;
  name: string;
  price: number;
  image: MediaBoxProps | null;
  collectionId: string | null;
  collectionName: string | null;
}

/** Every product with its localized name, price and first image, ordered for the grouped <select>. */
export async function listOrderableProducts(locale: string): Promise<OrderableProduct[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT p.slug, p.name_fa, p.name_en, p.price, c.id AS collection_id,
              c.name_fa AS collection_name_fa, c.name_en AS collection_name_en,
              m.id AS media_id, m.type AS media_type, m.focal_x, m.focal_y,
              m.alt_fa, m.alt_en
       FROM products p
       LEFT JOIN collections c ON c.id = p.collection_id
       LEFT JOIN (
         SELECT pm.product_id, pm.media_id,
           ROW_NUMBER() OVER (PARTITION BY pm.product_id ORDER BY pm.sort_order ASC) AS rn
         FROM product_media pm
       ) first_media ON first_media.product_id = p.id AND first_media.rn = 1
       LEFT JOIN media m ON m.id = first_media.media_id
       ORDER BY c.id IS NULL, c.sort_order, c.created_at, p.sort_order, p.created_at`,
    )
    .all<{
      slug: string;
      name_fa: string;
      name_en: string;
      price: number;
      collection_id: string | null;
      collection_name_fa: string | null;
      collection_name_en: string | null;
      media_id: string | null;
      media_type: "image" | "video" | null;
      focal_x: number | null;
      focal_y: number | null;
      alt_fa: string | null;
      alt_en: string | null;
    }>();
  const pick = (fa: string | null, en: string | null) =>
    (locale === "fa" ? fa : en) || fa || en || "";
  return results.map((row) => ({
    slug: row.slug,
    name: pick(row.name_fa, row.name_en),
    price: row.price,
    image: row.media_id
      ? resolveMedia(
          {
            id: row.media_id,
            type: row.media_type ?? "image",
            focal_x: row.focal_x ?? 0.5,
            focal_y: row.focal_y ?? 0.5,
            alt_fa: row.alt_fa ?? "",
            alt_en: row.alt_en ?? "",
          },
          locale,
        )
      : null,
    collectionId: row.collection_id,
    collectionName: row.collection_id ? pick(row.collection_name_fa, row.collection_name_en) : null,
  }));
}

// ---------- Admin ----------

export interface OrderAdminRow {
  id: string;
  name: string;
  phone: string;
  product_slug: string | null;
  product_name_snapshot: string;
  price_snapshot: number;
  size: number;
  province: string;
  city: string;
  address: string;
  postal_code: string;
  note: string | null;
  locale: string;
  status: OrderStatus;
  created_at: string;
}

export async function listOrdersAdmin(status: OrderStatus | null): Promise<OrderAdminRow[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT o.id, o.name, o.phone, p.slug AS product_slug, o.product_name_snapshot,
              o.price_snapshot, o.size, o.province, o.city, o.address, o.postal_code,
              o.note, o.locale, o.status, o.created_at
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE ?1 IS NULL OR o.status = ?1
       ORDER BY o.created_at DESC, o.rowid DESC`,
    )
    .bind(status)
    .all<OrderAdminRow>();
  return results;
}

export async function countNewOrders(): Promise<number> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'")
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .prepare("UPDATE orders SET status = ? WHERE id = ?")
    .bind(status, id)
    .run();
  return result.meta.changes > 0;
}

// ---------- Telegram chat id (site_settings) ----------

export async function getTelegramChatId(): Promise<string | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT telegram_chat_id FROM site_settings WHERE id = 1")
    .first<{ telegram_chat_id: string | null }>();
  return row?.telegram_chat_id ?? null;
}

export async function setTelegramChatId(chatId: string | null) {
  const db = await getDb();
  await db
    .prepare("UPDATE site_settings SET telegram_chat_id = ? WHERE id = 1")
    .bind(chatId)
    .run();
}
