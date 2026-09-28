/**
 * The one way numbers are shown to visitors on public pages: Persian
 * digits (۰–۹) and the Persian thousands separator (٬) on /fa, Latin on
 * /en — via Intl.NumberFormat, so it is the same on the server (workerd)
 * and in the browser. Display only: URLs, tel:/wa.me links, stored
 * values, form input values, the Telegram message and the admin panel
 * keep their plain Latin digits.
 */

type Locale = "fa" | "en" | (string & {});

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: Locale, grouping: boolean) {
  const tag = locale === "fa" ? "fa-IR" : "en-US";
  const key = `${tag}:${grouping}`;
  let nf = formatters.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(tag, { useGrouping: grouping });
    formatters.set(key, nf);
  }
  return nf;
}

/** 27000000 -> "۲۷٬۰۰۰٬۰۰۰" (fa) / "27,000,000" (en). `grouping: false` for counts, years, "404". */
export function formatNumber(
  value: number,
  locale: Locale,
  { grouping = true }: { grouping?: boolean } = {},
) {
  return formatter(locale, grouping).format(value);
}

/** Localizes the digits inside an already-formatted string, e.g. a phone number "0912 489 6882". */
export function localizeDigits(text: string, locale: Locale) {
  if (locale !== "fa") return text;
  return text.replace(/\d/g, (d) =>
    formatNumber(Number(d), locale, { grouping: false }),
  );
}
