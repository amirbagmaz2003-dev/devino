/** Groups digits per-locale (Persian numerals for fa) and appends the currency unit label. */
export function formatPrice(price: number, locale: string, unit: string) {
  const formatted = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(price);
  return `${formatted} ${unit}`;
}
