/** Order form options — import-free, shared by the form, the action and the admin. */

export const ORDER_SIZES = [36, 38, 40] as const;

export const CONTACT_METHODS = ["phone", "whatsapp", "telegram"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export function isContactMethod(value: unknown): value is ContactMethod {
  return typeof value === "string" && (CONTACT_METHODS as readonly string[]).includes(value);
}

/** Persian labels (admin panel and the Telegram notification). */
export const CONTACT_METHOD_LABELS_FA: Record<ContactMethod, string> = {
  phone: "تماس تلفنی",
  whatsapp: "واتس‌اپ",
  telegram: "تلگرام",
};

/** "@Some_User" or "Some_User" -> "Some_User"; null unless it is a valid Telegram username. */
export function normalizeTelegramUsername(raw: string): string | null {
  const username = raw.trim().replace(/^@/, "");
  return /^[A-Za-z0-9_]{5,32}$/.test(username) ? username : null;
}
