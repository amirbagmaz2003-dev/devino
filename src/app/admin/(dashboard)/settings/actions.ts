"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import {
  MESSAGES,
  normalizeSocialUrl,
  type AdminFormState,
} from "@/lib/adminForm";
import { updateSiteSettings } from "@/db/admin";
import { getTelegramChatId, setTelegramChatId } from "@/db/bookings";
import { findLatestPrivateChatId, isTelegramBotConfigured, sendTelegramMessage } from "@/lib/telegram";

export async function updateSiteSettingsAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  try {
    await updateSiteSettings({
      brand_name: String(formData.get("brandName") ?? "").trim() || "deVino",
      tagline_fa: String(formData.get("taglineFa") ?? "") || null,
      tagline_en: String(formData.get("taglineEn") ?? "") || null,
      contact_phone: String(formData.get("contactPhone") ?? "") || null,
      // A bare handle ("devinomaison" / "@devinomaison") would render as a
      // broken relative link on the product page — store a full URL.
      telegram_url: normalizeSocialUrl(
        String(formData.get("telegramUrl") ?? ""),
        "telegram",
      ),
      instagram_url: normalizeSocialUrl(
        String(formData.get("instagramUrl") ?? ""),
        "instagram",
      ),
    });
  } catch (error) {
    console.error("[admin] saving site settings failed", error);
    return { error: MESSAGES.saveFailed };
  }
  revalidatePath("/admin/settings");
  // Footer links, contact page and hero tagline read these on every page.
  revalidatePath("/", "layout");
  return {};
}

const TELEGRAM_MESSAGES = {
  noBot: "ربات تلگرام هنوز روی سرور تنظیم نشده است.",
  noMessage: "پیامی از طرف شما پیدا نشد. ابتدا در تلگرام به ربات پیام /start بدهید.",
  connected: "اتصال برقرار شد.",
  notConnected: "ابتدا تلگرام را متصل کنید.",
  testText: "پیام آزمایشی از پنل مدیریت deVino — اتصال برقرار است.",
  testSent: "پیام آزمایشی ارسال شد.",
} as const;

/** «اتصال»: takes the chat id of the latest private message to the bot and saves it. */
export async function connectTelegramAction(
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  void _formData;
  try {
    if (!(await isTelegramBotConfigured())) return { error: TELEGRAM_MESSAGES.noBot };
    const chatId = await findLatestPrivateChatId();
    if (!chatId) return { error: TELEGRAM_MESSAGES.noMessage };
    await setTelegramChatId(chatId);
  } catch (error) {
    console.error("[admin] connecting Telegram failed", error);
    return { error: MESSAGES.saveFailed };
  }
  revalidatePath("/admin/settings");
  return { success: TELEGRAM_MESSAGES.connected };
}

/** «ارسال پیام آزمایشی». */
export async function sendTelegramTestAction(
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  void _formData;
  try {
    if (!(await isTelegramBotConfigured())) return { error: TELEGRAM_MESSAGES.noBot };
    const chatId = await getTelegramChatId();
    if (!chatId) return { error: TELEGRAM_MESSAGES.notConnected };
    if (!(await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.testText))) {
      return { error: MESSAGES.saveFailed };
    }
  } catch (error) {
    console.error("[admin] Telegram test message failed", error);
    return { error: MESSAGES.saveFailed };
  }
  return { success: TELEGRAM_MESSAGES.testSent };
}
