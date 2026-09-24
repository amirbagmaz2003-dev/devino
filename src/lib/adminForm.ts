/**
 * Shared between admin server actions and admin client components (no
 * server-only imports here). All Persian strings are final UI copy from
 * brief-01-admin-hardening.md — keep them verbatim.
 */

export type AdminFieldName = "slug" | "price" | "stockCount" | "file";

/** Returned by every admin form action (useActionState). null = idle. */
export type AdminFormState = {
  error?: string;
  fieldErrors?: Partial<Record<AdminFieldName, string>>;
} | null;

export const MESSAGES = {
  saveFailed: "ذخیره انجام نشد. لطفاً دوباره تلاش کنید.",
  saving: "در حال ذخیره…",
  duplicateSlug:
    "این آدرس (اسلاگ) قبلاً برای یک مورد دیگر استفاده شده. لطفاً یک آدرس دیگر وارد کنید.",
  invalidPrice: "قیمت را فقط به‌صورت عدد وارد کنید.",
  fileTooLarge: "حجم فایل بیش از حد مجاز است (حداکثر ۱۵ مگابایت).",
  confirmDeleteProduct: "این محصول و عکس‌هایش برای همیشه حذف می‌شوند. مطمئنید؟",
  confirmDeleteCollection: "این کالکشن برای همیشه حذف می‌شود. مطمئنید؟",
  collectionHasProducts:
    "این کالکشن هنوز محصول دارد. اول محصولاتش را به کالکشن دیگری منتقل یا حذف کنید.",
} as const;

/** Hard cap on an uploaded file before (client) or instead of (server) resizing. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Persian (۰–۹) and Arabic-Indic (٠–٩) digits -> ASCII 0–9. */
export function toAsciiDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Parses an integer typed in the admin panel: accepts Persian/Arabic
 * digits and thousands separators (",", "٬", "،", spaces). Returns null
 * for anything that isn't a plain non-negative integer.
 */
export function parseAdminInteger(raw: string): number | null {
  const cleaned = toAsciiDigits(raw).replace(/[,٬،\s‌]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : null;
}

/** Digits only (after normalizing), grouped in threes: "26000000" -> "26,000,000". */
export function formatAdminInteger(raw: string): string {
  const digits = toAsciiDigits(raw)
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const SOCIAL_BASE = {
  instagram: "https://instagram.com/",
  telegram: "https://t.me/",
} as const;

/**
 * Turns whatever was typed into a usable absolute URL: full URLs are kept
 * as-is, scheme-less URLs ("instagram.com/x", "t.me/x") get https://, and a
 * bare handle or "@handle" becomes the network's profile URL. Empty -> null.
 */
export function normalizeSocialUrl(
  raw: string,
  network: keyof typeof SOCIAL_BASE,
): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(www\.)?(instagram\.com|t\.me|telegram\.me)\//i.test(value))
    return `https://${value}`;
  const handle = value.replace(/^@+/, "");
  return `${SOCIAL_BASE[network]}${handle}`;
}
