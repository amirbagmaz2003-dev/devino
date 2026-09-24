import { getDb } from "./client";

import type { BookingStatus } from "./bookingStatus";

export {
  BOOKING_STATUSES,
  isBookingStatus,
  type BookingStatus,
} from "./bookingStatus";

export const BOOKING_RATE_LIMIT = 5;
export const BOOKING_RATE_WINDOW_MS = 60 * 60 * 1000;

export interface BookingInput {
  name: string;
  phone: string;
  productId: string | null;
  preferredDate: string;
  note: string | null;
  locale: "fa" | "en";
}

/** Whether `ip` already has BOOKING_RATE_LIMIT accepted submissions in the last hour. */
export async function isBookingRateLimited(
  ip: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM booking_submissions WHERE ip = ? AND submitted_at > ?",
    )
    .bind(ip, now - BOOKING_RATE_WINDOW_MS)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= BOOKING_RATE_LIMIT;
}

/**
 * Saves the booking and counts it against the IP's hourly limit in one
 * atomic batch (plus pruning of day-old counter rows). Returns the id.
 */
export async function createBooking(
  input: BookingInput,
  ip: string,
  now = Date.now(),
) {
  const id = crypto.randomUUID();
  const db = await getDb();
  await db.batch([
    db
      .prepare(
        `INSERT INTO bookings (id, name, phone, product_id, preferred_date, note, locale)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.name,
        input.phone,
        input.productId,
        input.preferredDate,
        input.note,
        input.locale,
      ),
    db
      .prepare(
        "INSERT INTO booking_submissions (ip, submitted_at) VALUES (?, ?)",
      )
      .bind(ip, now),
    db
      .prepare("DELETE FROM booking_submissions WHERE submitted_at < ?")
      .bind(now - 24 * 60 * 60 * 1000),
  ]);
  return id;
}

export interface BookableProduct {
  id: string;
  slug: string;
  name: string;
  collectionId: string | null;
  collectionName: string | null;
}

/** Every product with its localized name, ordered for the grouped <select>. */
export async function listBookableProducts(
  locale: string,
): Promise<BookableProduct[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT p.id, p.slug, p.name_fa, p.name_en, c.id AS collection_id,
              c.name_fa AS collection_name_fa, c.name_en AS collection_name_en
       FROM products p
       LEFT JOIN collections c ON c.id = p.collection_id
       ORDER BY c.id IS NULL, c.sort_order, c.created_at, p.sort_order, p.created_at`,
    )
    .all<{
      id: string;
      slug: string;
      name_fa: string;
      name_en: string;
      collection_id: string | null;
      collection_name_fa: string | null;
      collection_name_en: string | null;
    }>();
  const pick = (fa: string | null, en: string | null) =>
    (locale === "fa" ? fa : en) || fa || en || "";
  return results.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: pick(row.name_fa, row.name_en),
    collectionId: row.collection_id,
    collectionName: row.collection_id
      ? pick(row.collection_name_fa, row.collection_name_en)
      : null,
  }));
}

export async function getProductNameFa(id: string): Promise<string | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT name_fa, name_en FROM products WHERE id = ?")
    .bind(id)
    .first<{ name_fa: string; name_en: string }>();
  return row ? row.name_fa || row.name_en : null;
}

// ---------- Admin ----------

export interface BookingAdminRow {
  id: string;
  name: string;
  phone: string;
  product_id: string | null;
  product_slug: string | null;
  product_name_fa: string | null;
  preferred_date: string;
  note: string | null;
  locale: string;
  status: BookingStatus;
  created_at: string;
}

export async function listBookingsAdmin(
  status: BookingStatus | null,
): Promise<BookingAdminRow[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT b.id, b.name, b.phone, b.product_id, p.slug AS product_slug,
              COALESCE(NULLIF(p.name_fa, ''), p.name_en) AS product_name_fa,
              b.preferred_date, b.note, b.locale, b.status, b.created_at
       FROM bookings b
       LEFT JOIN products p ON p.id = b.product_id
       WHERE ?1 IS NULL OR b.status = ?1
       ORDER BY b.created_at DESC, b.rowid DESC`,
    )
    .bind(status)
    .all<BookingAdminRow>();
  return results;
}

export async function countNewBookings(): Promise<number> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM bookings WHERE status = 'new'")
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .prepare("UPDATE bookings SET status = ? WHERE id = ?")
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
