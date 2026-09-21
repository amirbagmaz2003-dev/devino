"use server";

import { revalidatePath } from "next/cache";
import { updateSiteSettings } from "@/db/admin";

export async function updateSiteSettingsAction(formData: FormData) {
  await updateSiteSettings({
    brand_name: String(formData.get("brandName") ?? "deVino"),
    tagline_fa: String(formData.get("taglineFa") ?? "") || null,
    tagline_en: String(formData.get("taglineEn") ?? "") || null,
    contact_phone: String(formData.get("contactPhone") ?? "") || null,
    telegram_url: String(formData.get("telegramUrl") ?? "") || null,
    instagram_url: String(formData.get("instagramUrl") ?? "") || null,
  });
  revalidatePath("/admin/settings");
  revalidatePath("/[locale]/products/[slug]", "page");
}
