"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import {
  MESSAGES,
  normalizeSocialUrl,
  type AdminFormState,
} from "@/lib/adminForm";
import { updateSiteSettings } from "@/db/admin";

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
  revalidatePath("/[locale]/products/[slug]", "page");
  return {};
}
