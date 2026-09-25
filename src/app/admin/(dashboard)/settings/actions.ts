"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import {
  MAX_UPLOAD_BYTES,
  MESSAGES,
  normalizeSocialUrl,
  type AdminFormState,
} from "@/lib/adminForm";
import {
  deleteMedia,
  deleteMediaIfUnreferenced,
  getHeroMediaAdmin,
  getImageMediaKey,
  listImagesMissingVariants,
  putMediaVariants,
  setHeroMediaId,
  updateMediaFocalPoint,
  updateSiteSettings,
  uploadMedia,
} from "@/db/admin";
import { VARIANT_WIDTHS, type VariantWidth } from "@/lib/mediaVariants";
import { readUploadedFile } from "../upload";
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

// ---------- Home hero (brief 03, §3) ----------

/**
 * Saves the hero: a new image/video replaces the current one (whose media
 * — KV value, variants and row — is then deleted); with no new file, an
 * image hero's focal point is updated in place.
 */
export async function saveHeroAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const upload = readUploadedFile(formData, "heroFile", { allowVideo: true });
  if (upload.error) return { fieldErrors: { file: upload.error } };
  const focal = {
    x: Number(formData.get("heroFocalX") ?? 0.5),
    y: Number(formData.get("heroFocalY") ?? 0.5),
  };

  try {
    const current = await getHeroMediaAdmin();
    if (!upload.file) {
      if (!current) return { fieldErrors: { file: "لطفاً یک عکس انتخاب کنید." } };
      if (current.type === "image") await updateMediaFocalPoint(current.id, focal.x, focal.y);
    } else {
      const mediaId = await uploadMedia({
        type: upload.type,
        file: upload.file,
        variants: upload.variants,
        focalX: focal.x,
        focalY: focal.y,
        altFa: "",
        altEn: "",
      });
      try {
        await setHeroMediaId(mediaId);
      } catch (error) {
        await deleteMedia(mediaId);
        throw error;
      }
      if (current) await deleteMediaIfUnreferenced(current.id);
    }
  } catch (error) {
    console.error("[admin] saving hero failed", error);
    return { error: MESSAGES.saveFailed };
  }
  revalidatePath("/", "layout");
  return {};
}

/** «بازگشت به تصویر پیش‌فرض»: clears the hero and deletes its media. */
export async function resetHeroAction(
  _prev: AdminFormState,
  _formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  void _formData;
  try {
    const current = await getHeroMediaAdmin();
    await setHeroMediaId(null);
    if (current) await deleteMediaIfUnreferenced(current.id);
  } catch (error) {
    console.error("[admin] resetting hero failed", error);
    return { error: MESSAGES.saveFailed };
  }
  revalidatePath("/", "layout");
  return {};
}

// ---------- Variant backfill (brief 03, §8) ----------

/** Ids of images uploaded before 800/1600 variants existed. */
export async function listImagesMissingVariantsAction(): Promise<string[]> {
  await requireAdmin();
  return (await listImagesMissingVariants()).map((row) => row.id);
}

/** Stores browser-generated variants for one existing image. */
export async function uploadVariantsAction(id: string, formData: FormData): Promise<boolean> {
  await requireAdmin();
  try {
    const key = await getImageMediaKey(id);
    if (!key) return false;
    const variants: Partial<Record<VariantWidth, File>> = {};
    for (const width of VARIANT_WIDTHS) {
      const file = formData.get(`w${width}`);
      if (!(file instanceof File) || file.type !== "image/jpeg" || file.size === 0) return false;
      if (file.size > MAX_UPLOAD_BYTES) return false;
      variants[width] = file;
    }
    await putMediaVariants(key, variants);
    return true;
  } catch (error) {
    console.error("[admin] storing variants failed", error);
    return false;
  }
}
