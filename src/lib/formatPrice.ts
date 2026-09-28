import { formatNumber } from "./formatNumber";

/** Groups digits per-locale (Persian numerals and ٬ for fa) and appends the currency unit label. */
export function formatPrice(price: number, locale: string, unit: string) {
  return `${formatNumber(price, locale)} ${unit}`;
}
