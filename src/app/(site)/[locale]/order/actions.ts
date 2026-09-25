"use server";

import { createOrder, getProductForOrder, getTelegramChatId, isOrderRateLimited } from "@/db/orders";
import { normalizeIranianMobile } from "@/lib/phone";
import {
  CONTACT_METHOD_LABELS_FA,
  ORDER_SIZES,
  isContactMethod,
  normalizeTelegramUsername,
  type ContactMethod,
} from "@/lib/orderOptions";
import { getClientIp } from "@/lib/requestIp";
import { getSiteUrl } from "@/lib/site";
import { runInBackground, sendTelegramMessage } from "@/lib/telegram";
import type { OrderFieldError, OrderFormState } from "./orderForm";

const MAX_NAME = 120;
const MAX_NOTE = 1000;

function readLocale(value: FormDataEntryValue | null): "fa" | "en" {
  return value === "en" ? "en" : "fa";
}

const text = (formData: FormData, name: string, max: number) =>
  String(formData.get(name) ?? "")
    .trim()
    .slice(0, max);

async function notifyTelegram(order: {
  name: string;
  phone: string;
  productName: string;
  size: number;
  price: number;
  contactMethod: ContactMethod;
  telegramUsername: string | null;
  note: string | null;
}) {
  try {
    const chatId = await getTelegramChatId();
    if (!chatId) {
      console.warn("[order] Telegram chat id not set — notification skipped");
      return;
    }
    const siteUrl = await getSiteUrl();
    const message = [
      "سفارش جدید",
      "",
      `نام: ${order.name}`,
      `موبایل: ${order.phone}`,
      `لباس: ${order.productName}`,
      `سایز: ${order.size}`,
      `قیمت: ${order.price.toLocaleString("fa-IR")} تومان`,
      `راه تماس: ${CONTACT_METHOD_LABELS_FA[order.contactMethod]}`,
      ...(order.telegramUsername ? [`آیدی تلگرام: @${order.telegramUsername}`] : []),
      `توضیحات: ${order.note ?? "—"}`,
      "",
      `${siteUrl}/admin/orders`,
    ].join("\n");
    await sendTelegramMessage(chatId, message);
  } catch (error) {
    console.error("[order] Telegram notification failed", error);
  }
}

/**
 * Public order request. Order: honeypot -> validation -> per-IP rate
 * limit -> save -> Telegram in the background. The product name and
 * price are snapshotted from the DB, never taken from the form, and
 * nothing about the notification can fail the submission.
 */
export async function submitOrderAction(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const locale = readLocale(formData.get("locale"));

  const rawMethod = formData.get("contactMethod");
  const contactMethod: ContactMethod | null = isContactMethod(rawMethod) ? rawMethod : null;

  // Honeypot: invisible to people, irresistible to bots. Pretend it worked.
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "success", method: contactMethod ?? "phone" };
  }

  const name = text(formData, "name", MAX_NAME);
  const phone = normalizeIranianMobile(String(formData.get("phone") ?? ""));
  const productSlug = text(formData, "product", 200);
  const size = Number(formData.get("size"));
  // Only meaningful with Telegram; ignored for any other method.
  const telegramUsername =
    contactMethod === "telegram"
      ? normalizeTelegramUsername(String(formData.get("telegramUsername") ?? ""))
      : null;
  const note = text(formData, "note", MAX_NOTE) || null;

  const fieldErrors: OrderFieldError[] = [];
  if (!name) fieldErrors.push("name");
  if (!phone) fieldErrors.push("phone");

  let product: Awaited<ReturnType<typeof getProductForOrder>> = null;
  try {
    product = await getProductForOrder(productSlug);
  } catch (error) {
    console.error("[order] product lookup failed", error);
    return { status: "error", generic: true };
  }
  if (!product) fieldErrors.push("product");
  if (!(ORDER_SIZES as readonly number[]).includes(size)) fieldErrors.push("size");
  // The form always sends a method (a preselected radio group); a missing
  // or unknown one means a tampered request, not a user mistake.
  if (!contactMethod) return { status: "error", generic: true };
  if (contactMethod === "telegram" && !telegramUsername) fieldErrors.push("telegramUsername");
  if (fieldErrors.length > 0 || !product) return { status: "error", fieldErrors };

  try {
    const ip = await getClientIp();
    if (await isOrderRateLimited(ip)) {
      console.warn("[order] rate limit hit for", ip);
      return { status: "error", generic: true };
    }
    await createOrder(
      {
        name,
        phone: phone!,
        productId: product.id,
        productNameSnapshot: product.nameFa,
        priceSnapshot: product.price,
        size,
        contactMethod,
        telegramUsername,
        note,
        locale,
      },
      ip,
    );
    await runInBackground(
      notifyTelegram({
        name,
        phone: phone!,
        productName: product.nameFa,
        size,
        price: product.price,
        contactMethod,
        telegramUsername,
        note,
      }),
    );
  } catch (error) {
    console.error("[order] saving failed", error);
    return { status: "error", generic: true };
  }

  return { status: "success", method: contactMethod };
}
