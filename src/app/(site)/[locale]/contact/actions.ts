"use server";

import { getDb } from "@/db/client";
import {
  createBooking,
  getProductNameFa,
  getTelegramChatId,
  isBookingRateLimited,
} from "@/db/bookings";
import { formatJalali, parseIsoDate, todayInTehran } from "@/lib/jalali";
import { normalizeIranianMobile } from "@/lib/phone";
import { getClientIp } from "@/lib/requestIp";
import { getSiteUrl } from "@/lib/site";
import { runInBackground, sendTelegramMessage } from "@/lib/telegram";
import type { BookingFieldError, BookingFormState } from "./bookingForm";

const MAX_NAME = 120;
const MAX_NOTE = 1000;

function readLocale(value: FormDataEntryValue | null): "fa" | "en" {
  return value === "en" ? "en" : "fa";
}

async function findProductId(slug: string): Promise<string | null> {
  if (!slug) return null;
  const db = await getDb();
  const row = await db
    .prepare("SELECT id FROM products WHERE slug = ?")
    .bind(slug)
    .first<{ id: string }>();
  return row?.id ?? null;
}

async function notifyTelegram(booking: {
  name: string;
  phone: string;
  productId: string | null;
  preferredDate: string;
  note: string | null;
}) {
  try {
    const chatId = await getTelegramChatId();
    if (!chatId) {
      console.warn("[booking] Telegram chat id not set — notification skipped");
      return;
    }
    const [productName, siteUrl] = await Promise.all([
      booking.productId
        ? getProductNameFa(booking.productId)
        : Promise.resolve(null),
      getSiteUrl(),
    ]);
    const text = [
      "درخواست پرو جدید",
      "",
      `نام: ${booking.name}`,
      `موبایل: ${booking.phone}`,
      `لباس: ${productName ?? "—"}`,
      `تاریخ پیشنهادی: ${formatJalali(booking.preferredDate)}`,
      `توضیحات: ${booking.note ?? "—"}`,
      "",
      `${siteUrl}/admin/bookings`,
    ].join("\n");
    await sendTelegramMessage(chatId, text);
  } catch (error) {
    console.error("[booking] Telegram notification failed", error);
  }
}

/**
 * Public "book a private fitting" action. Order: honeypot -> validation ->
 * per-IP rate limit -> save -> Telegram in the background. The booking is
 * saved before any notification is attempted, and nothing about the
 * notification can fail the submission.
 */
export async function submitBookingAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const locale = readLocale(formData.get("locale"));

  // Honeypot: invisible to people, irresistible to bots. Pretend it worked.
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "success" };
  }

  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, MAX_NAME);
  const phone = normalizeIranianMobile(String(formData.get("phone") ?? ""));
  const preferredDate = String(formData.get("preferredDate") ?? "").trim();
  const note =
    String(formData.get("note") ?? "")
      .trim()
      .slice(0, MAX_NOTE) || null;
  const productSlug = String(formData.get("product") ?? "").trim();

  const fieldErrors: BookingFieldError[] = [];
  if (!name) fieldErrors.push("name");
  if (!phone) fieldErrors.push("phone");
  if (!parseIsoDate(preferredDate) || preferredDate < todayInTehran())
    fieldErrors.push("date");
  if (fieldErrors.length > 0) return { status: "error", fieldErrors };

  try {
    const ip = await getClientIp();
    if (await isBookingRateLimited(ip)) {
      console.warn("[booking] rate limit hit for", ip);
      return { status: "error", generic: true };
    }
    const productId = await findProductId(productSlug);
    await createBooking(
      { name, phone: phone!, productId, preferredDate, note, locale },
      ip,
    );
    await runInBackground(
      notifyTelegram({ name, phone: phone!, productId, preferredDate, note }),
    );
  } catch (error) {
    console.error("[booking] saving failed", error);
    return { status: "error", generic: true };
  }

  return { status: "success" };
}
