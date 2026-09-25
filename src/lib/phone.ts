import { toAsciiDigits } from "./adminForm";

/**
 * Normalizes an Iranian mobile number to "09xxxxxxxxx", or null if it
 * isn't one. Accepts Persian/Arabic digits, spaces, dashes, dots and
 * parentheses, and the forms 09…, 9…, +989…, 989… and 00989….
 */
export function normalizeIranianMobile(raw: string): string | null {
  const compact = toAsciiDigits(raw).replace(/[\s\-.()‌‎‏]/g, "");
  const match = /^(?:\+98|0098|98|0)?(9\d{9})$/.exec(compact);
  return match ? `0${match[1]}` : null;
}

/** Iranian postal code: Persian/Arabic digits, spaces and dashes allowed; 10 ASCII digits out, else null. */
export function normalizePostalCode(raw: string): string | null {
  const compact = toAsciiDigits(raw).replace(/[\s\-‌]/g, "");
  return /^\d{10}$/.test(compact) ? compact : null;
}
