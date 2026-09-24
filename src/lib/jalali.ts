/**
 * Jalali (Solar Hijri) <-> Gregorian conversion, after the well-known
 * jalaali-js algorithm (Borkowski's breaks table). Pure and dependency-
 * free so the booking date picker (client), the booking action and the
 * Telegram notification (server) all format dates identically, without
 * relying on the runtime's ICU calendar data.
 */

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192,
  2262, 2324, 2394, 2456, 3178,
];

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

function jalCal(jy: number) {
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  for (let i = 1; i < BREAKS.length; i++) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  const d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number) {
  const { gy } = d2g(jdn);
  let jy = gy - 621;
  const r = jalCal(jy);
  let k = jdn - g2d(gy, 3, r.march);
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export interface YMD {
  year: number;
  month: number; // 1–12
  day: number;
}

export function gregorianToJalali({ year, month, day }: YMD): YMD {
  const { jy, jm, jd } = d2j(g2d(year, month, day));
  return { year: jy, month: jm, day: jd };
}

export function jalaliToGregorian({ year, month, day }: YMD): YMD {
  const { gy, gm, gd } = d2g(j2d(year, month, day));
  return { year: gy, month: gm, day: gd };
}

export function isJalaliLeapYear(year: number): boolean {
  return jalCal(year).leap === 0;
}

export function jalaliMonthLength(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

export function gregorianMonthLength(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// ---------- ISO date helpers ----------

export function toIsoDate({ year, month, day }: YMD): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Strict YYYY-MM-DD that is also a real calendar date. */
export function parseIsoDate(value: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > gregorianMonthLength(year, month)
  )
    return null;
  return { year, month, day };
}

/** Adds whole days to an ISO date (UTC arithmetic, no DST surprises). */
export function addDays(iso: string, days: number): string {
  const ymd = parseIsoDate(iso)!;
  const date = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + days));
  return toIsoDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

/** Day of week, 0 = Sunday … 6 = Saturday. */
export function weekday(iso: string): number {
  const ymd = parseIsoDate(iso)!;
  return new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day)).getUTCDay();
}

/**
 * Today's date in Tehran — fittings happen there, so "today or later" is
 * judged on Tehran's calendar for every visitor, on client and server alike.
 */
export function todayInTehran(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// ---------- Display ----------

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export const GREGORIAN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/** "2026-09-27" -> "۵ مهر ۱۴۰۵". */
export function formatJalali(iso: string): string {
  const ymd = parseIsoDate(iso);
  if (!ymd) return iso;
  const j = gregorianToJalali(ymd);
  return `${toPersianDigits(j.day)} ${JALALI_MONTHS[j.month - 1]} ${toPersianDigits(j.year)}`;
}

/** "2026-09-27" -> "27 September 2026". */
export function formatGregorian(iso: string): string {
  const ymd = parseIsoDate(iso);
  if (!ymd) return iso;
  return `${ymd.day} ${GREGORIAN_MONTHS[ymd.month - 1]} ${ymd.year}`;
}

export function formatBookingDate(iso: string, locale: string): string {
  return locale === "fa" ? formatJalali(iso) : formatGregorian(iso);
}
