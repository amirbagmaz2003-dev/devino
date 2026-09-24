/**
 * Brief 02 (public site) end-to-end checks, in both locales, against the
 * local OpenNext/wrangler preview. D1 is inspected directly through
 * wrangler; the Telegram Bot API is replaced by a local mock server that
 * records every call (the preview must run with
 * TELEGRAM_API_BASE=http://127.0.0.1:9911 and a TELEGRAM_BOT_TOKEN in
 * .dev.vars, and NO_PROXY=127.0.0.1 so workerd reaches it directly).
 *
 * Needs the seed data used by e2e/admin-hardening.spec.ts: a collection
 * "first-harvest" with ≥ 3 products incl. "merlot" and "syrah".
 */
import { execFileSync } from "node:child_process";
import http from "node:http";
import { test, expect, type Browser, type Page } from "@playwright/test";

const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const RUN = Date.now().toString(36);
const MOCK_PORT = 9911;
let ipCounter = 0;

test.describe.configure({ mode: "default" });

// ---------- local D1 ----------

function sql<T = Record<string, unknown>>(command: string): T[] {
  const out = execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "devino-db",
      "--local",
      "--json",
      "--command",
      command,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return (JSON.parse(out) as { results: T[] }[])[0]?.results ?? [];
}

const q = (v: string | null) =>
  v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`;

// ---------- Telegram Bot API mock ----------

interface TelegramCall {
  method: string;
  body: Record<string, unknown>;
}
const telegram = {
  calls: [] as TelegramCall[],
  failing: false,
  server: null as http.Server | null,
};

test.beforeAll(async () => {
  if (!PASSWORD)
    throw new Error("Set ADMIN_PASSWORD (same value as in .dev.vars).");
  telegram.server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const method = (req.url ?? "").split("/").pop() ?? "";
      telegram.calls.push({ method, body: raw ? JSON.parse(raw) : {} });
      res.setHeader("content-type", "application/json");
      if (telegram.failing) {
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, description: "mock failure" }));
      } else if (method === "getUpdates") {
        res.end(
          JSON.stringify({
            ok: true,
            result: [
              {
                update_id: 1,
                message: { date: 1, chat: { id: -100, type: "group" } },
              },
              {
                update_id: 7,
                message: { date: 7, chat: { id: 424242, type: "private" } },
              },
              {
                update_id: 3,
                message: { date: 3, chat: { id: 111, type: "private" } },
              },
            ],
          }),
        );
      } else {
        res.end(JSON.stringify({ ok: true, result: {} }));
      }
    });
  });
  await new Promise<void>((resolve) =>
    telegram.server!.listen(MOCK_PORT, "127.0.0.1", resolve),
  );
});

test.afterAll(async () => {
  await new Promise((resolve) => telegram.server?.close(resolve));
});

test.beforeEach(() => {
  telegram.failing = false;
});

// ---------- helpers ----------

function nextIp() {
  return `198.51.100.${(++ipCounter % 250) + 1}-${RUN}`;
}

async function visitorPage(browser: Browser, ip = nextIp()) {
  const context = await browser.newContext({
    extraHTTPHeaders: { "cf-connecting-ip": ip },
  });
  return { context, page: await context.newPage() };
}

async function adminPage(browser: Browser) {
  const { context, page } = await visitorPage(browser);
  await page.goto("/admin/login");
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin$/);
  return { context, page };
}

function tehranToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Picks "tomorrow" with the keyboard: the grid opens on today; one step forward. */
async function pickTomorrow(page: Page, locale: "fa" | "en") {
  await page.click("#booking-date");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press(locale === "fa" ? "ArrowLeft" : "ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeHidden();
  return addDays(tehranToday(), 1);
}

async function fillBooking(
  page: Page,
  locale: "fa" | "en",
  { name, phone, note }: { name: string; phone: string; note?: string },
) {
  await page.fill("#booking-name", name);
  await page.fill("#booking-phone", phone);
  if (note) await page.fill("#booking-note", note);
  return pickTomorrow(page, locale);
}

function booking(name: string) {
  return sql<{
    id: string;
    phone: string;
    product_id: string | null;
    preferred_date: string;
    note: string | null;
    locale: string;
    status: string;
  }>(`SELECT * FROM bookings WHERE name = ${q(name)}`);
}

const TEXT = {
  fa: {
    success: "درخواست شما ثبت شد. به‌زودی برای هماهنگی با شما تماس می‌گیریم.",
    name: "لطفاً نام را وارد کنید.",
    phone: "شماره‌ی موبایل معتبر نیست.",
    date: "لطفاً یک تاریخ از امروز به بعد انتخاب کنید.",
    generic: "ارسال انجام نشد. لطفاً دوباره تلاش کنید.",
    submit: "ثبت درخواست",
  },
  en: {
    success:
      "Your request has been received. We'll be in touch shortly to confirm.",
    name: "Please enter your name.",
    phone: "Please enter a valid mobile number.",
    date: "Please choose today or a later date.",
    generic: "Something went wrong. Please try again.",
    submit: "Send request",
  },
} as const;

// ---------- booking ----------

test("fa: booking with Persian digits and the Jalali picker is saved and sent to Telegram", async ({
  browser,
}) => {
  const before = sql<{ telegram_chat_id: string | null }>(
    "SELECT telegram_chat_id FROM site_settings WHERE id = 1",
  )[0].telegram_chat_id;
  sql("UPDATE site_settings SET telegram_chat_id = '424242' WHERE id = 1");
  const { context, page } = await visitorPage(browser);
  await page.goto("/fa/contact");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "رزرو وقت پرو",
  );

  // Jalali calendar: Persian month name, Persian digits, Saturday-first week.
  await page.click("#booking-date");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(
    /(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند) [۰-۹]{4}/,
  );
  await expect(dialog.locator("th").first()).toHaveText("ش");
  await expect(dialog.locator("th").last()).toHaveText("ج");
  // Today is selectable; yesterday (when it's in this month's grid) is not.
  await expect(dialog.locator(`[data-iso="${tehranToday()}"]`)).toBeEnabled();
  const yesterday = dialog.locator(
    `[data-iso="${addDays(tehranToday(), -1)}"]`,
  );
  if (await yesterday.count()) await expect(yesterday).toBeDisabled();
  await page.keyboard.press("Escape");

  const name = `مریم ${RUN}`;
  const date = await fillBooking(page, "fa", {
    name,
    phone: "۰۹۱۲ ۳۴۵ ۶۷۸۹",
    note: "ترجیحاً عصر",
  });
  await page.selectOption("#booking-product", "merlot");
  telegram.calls = [];
  await page.getByRole("button", { name: TEXT.fa.submit }).click();
  await expect(page.getByRole("status")).toHaveText(TEXT.fa.success);
  await expect(page.locator("form")).toHaveCount(0);

  const [row] = booking(name);
  expect(row).toMatchObject({
    phone: "09123456789",
    preferred_date: date,
    note: "ترجیحاً عصر",
    locale: "fa",
    status: "new",
  });
  expect(row.product_id).toBe(
    sql<{ id: string }>("SELECT id FROM products WHERE slug='merlot'")[0].id,
  );

  await expect
    .poll(() => telegram.calls.filter((c) => c.method === "sendMessage").length)
    .toBe(1);
  const sent = telegram.calls.find((c) => c.method === "sendMessage")!.body;
  expect(sent.chat_id).toBe("424242");
  const text = String(sent.text);
  expect(text).toContain("درخواست پرو جدید");
  expect(text).toContain(name);
  expect(text).toContain("09123456789");
  expect(text).toContain("مرلو");
  expect(text).toMatch(
    /تاریخ پیشنهادی: [۰-۹]+ (مهر|آبان|آذر|دی|بهمن|اسفند|فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور) [۰-۹]{4}/,
  );
  expect(text).toContain("ترجیحاً عصر");
  expect(text).toMatch(/\/admin\/bookings$/);

  sql(`UPDATE site_settings SET telegram_chat_id = ${q(before)} WHERE id = 1`);
  await context.close();
});

test("en: ?product= preselects the dress, +98 number is normalized, Gregorian picker", async ({
  browser,
}) => {
  const { context, page } = await visitorPage(browser);
  await page.goto("/en/contact?product=syrah");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Book a Private Fitting",
  );
  await expect(page.locator("#booking-product")).toHaveValue("syrah");
  // Grouped by collection.
  await expect(
    page.locator("#booking-product optgroup").first(),
  ).toHaveAttribute("label", /.+/);

  await page.click("#booking-date");
  await expect(page.getByRole("dialog")).toContainText(
    /(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/,
  );
  await expect(page.getByRole("dialog").locator("th").first()).toHaveText("Su");
  await page.keyboard.press("Escape");

  const name = `Sara ${RUN}`;
  const date = await fillBooking(page, "en", {
    name,
    phone: "+98 912-345-6789",
  });
  await page.getByRole("button", { name: TEXT.en.submit }).click();
  await expect(page.getByRole("status")).toHaveText(TEXT.en.success);
  expect(booking(name)[0]).toMatchObject({
    phone: "09123456789",
    preferred_date: date,
    locale: "en",
  });
  expect(booking(name)[0].product_id).toBe(
    sql<{ id: string }>("SELECT id FROM products WHERE slug='syrah'")[0].id,
  );
  await context.close();
});

for (const locale of ["fa", "en"] as const) {
  test(`${locale}: each validation error is shown, announced and linked to its field`, async ({
    browser,
  }) => {
    const { context, page } = await visitorPage(browser);
    await page.goto(`/${locale}/contact`);
    const submit = page.getByRole("button", { name: TEXT[locale].submit });

    // Everything empty: name, phone and date errors at once; focus on name.
    await submit.click();
    await expect(page.getByText(TEXT[locale].name)).toBeVisible();
    await expect(page.getByText(TEXT[locale].phone)).toBeVisible();
    await expect(page.getByText(TEXT[locale].date)).toBeVisible();
    await expect(page.locator("#booking-name")).toBeFocused();
    await expect(page.locator("#booking-name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.locator("#booking-name")).toHaveAttribute(
      "aria-describedby",
      "booking-name-error",
    );
    await expect(page.locator("#booking-name-error")).toHaveAttribute(
      "role",
      "alert",
    );

    // Name fixed, bad phone (landline), date still missing.
    await page.fill("#booking-name", `Invalid ${RUN}`);
    await page.fill(
      "#booking-phone",
      locale === "fa" ? "۰۲۱۱۲۳۴۵۶۷۸" : "021 1234 5678",
    );
    await submit.click();
    await expect(page.getByText(TEXT[locale].name)).toHaveCount(0);
    await expect(page.getByText(TEXT[locale].phone)).toBeVisible();
    await expect(page.locator("#booking-phone")).toBeFocused();
    // Typed values survive the failed submission.
    await expect(page.locator("#booking-name")).toHaveValue(`Invalid ${RUN}`);

    // A past date is refused by the server even if the picker is bypassed.
    await page.fill("#booking-phone", "09121112233");
    await page
      .locator("input[name=preferredDate]")
      .evaluate(
        (el: HTMLInputElement, v) => (el.value = v),
        addDays(tehranToday(), -1),
      );
    await submit.click();
    await expect(page.getByText(TEXT[locale].date)).toBeVisible();
    await expect(page.getByText(TEXT[locale].phone)).toHaveCount(0);
    expect(booking(`Invalid ${RUN}`)).toHaveLength(0);
    await context.close();
  });
}

test("honeypot submissions look successful but save nothing", async ({
  browser,
}) => {
  const { context, page } = await visitorPage(browser);
  await page.goto("/en/contact");
  const name = `Bot ${RUN}`;
  await fillBooking(page, "en", { name, phone: "09120000000" });
  await page
    .locator("input[name=website]")
    .evaluate((el: HTMLInputElement) => (el.value = "http://spam.example"));
  await page.getByRole("button", { name: TEXT.en.submit }).click();
  await expect(page.getByRole("status")).toHaveText(TEXT.en.success);
  expect(booking(name)).toHaveLength(0);
  await context.close();
});

test("an IP is limited to 5 bookings per hour", async ({ browser }) => {
  const ip = nextIp();
  const name = `Limit ${RUN}`;
  for (let i = 1; i <= 6; i++) {
    const { context, page } = await visitorPage(browser, ip);
    await page.goto("/fa/contact");
    await fillBooking(page, "fa", { name, phone: "09125556677" });
    await page.getByRole("button", { name: TEXT.fa.submit }).click();
    if (i <= 5) {
      await expect(page.getByRole("status")).toHaveText(TEXT.fa.success);
    } else {
      await expect(
        page.getByRole("alert").filter({ hasText: TEXT.fa.generic }),
      ).toBeVisible();
      await expect(page.locator("#booking-name")).toHaveValue(name);
    }
    await context.close();
  }
  expect(booking(name)).toHaveLength(5);
  // A different IP is unaffected.
  const other = await visitorPage(browser);
  await other.page.goto("/fa/contact");
  await fillBooking(other.page, "fa", { name, phone: "09125556677" });
  await other.page.getByRole("button", { name: TEXT.fa.submit }).click();
  await expect(other.page.getByRole("status")).toHaveText(TEXT.fa.success);
  await other.context.close();
});

test("a failing Telegram API never fails the booking", async ({ browser }) => {
  const before = sql<{ telegram_chat_id: string | null }>(
    "SELECT telegram_chat_id FROM site_settings WHERE id = 1",
  )[0].telegram_chat_id;
  sql("UPDATE site_settings SET telegram_chat_id = '424242' WHERE id = 1");
  telegram.failing = true;
  telegram.calls = [];
  const { context, page } = await visitorPage(browser);
  await page.goto("/en/contact");
  const name = `Resilient ${RUN}`;
  await fillBooking(page, "en", { name, phone: "09121234567" });
  await page.getByRole("button", { name: TEXT.en.submit }).click();
  await expect(page.getByRole("status")).toHaveText(TEXT.en.success);
  expect(booking(name)).toHaveLength(1);
  await expect
    .poll(() => telegram.calls.some((c) => c.method === "sendMessage"))
    .toBe(true);
  sql(`UPDATE site_settings SET telegram_chat_id = ${q(before)} WHERE id = 1`);
  await context.close();
});

// ---------- admin ----------

test("admin: bookings list, Jalali dates, status change, filter and nav badge", async ({
  browser,
}) => {
  const name = `Admin view ${RUN}`;
  const date = addDays(tehranToday(), 3);
  const productId = sql<{ id: string }>(
    "SELECT id FROM products WHERE slug='merlot'",
  )[0].id;
  sql(
    `INSERT INTO bookings (id, name, phone, product_id, preferred_date, note, locale)
     VALUES ('adm-${RUN}', ${q(name)}, '09127778899', '${productId}', '${date}', 'یادداشت', 'fa')`,
  );
  const newCount = sql<{ n: number }>(
    "SELECT COUNT(*) AS n FROM bookings WHERE status='new'",
  )[0].n;

  const { context, page } = await adminPage(browser);
  await expect(page.getByTestId("new-bookings-badge")).toHaveText(
    newCount.toLocaleString("fa-IR"),
  );
  await page.getByRole("link", { name: /درخواست‌های پرو/ }).click();
  await page.waitForURL(/\/admin\/bookings$/);

  const card = page.locator("li", { hasText: name });
  await expect(card.getByRole("link", { name: "09127778899" })).toHaveAttribute(
    "href",
    "tel:09127778899",
  );
  await expect(card.getByRole("link", { name: "مرلو" })).toHaveAttribute(
    "href",
    "/fa/products/merlot",
  );
  await expect(card).toContainText(
    /[۰-۹]+ (فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند) [۰-۹]{4}/,
  );
  await expect(card).toContainText("یادداشت");

  const select = card.getByRole("combobox");
  await expect(select).toHaveValue("new");
  await select.selectOption("contacted");
  await expect
    .poll(
      () =>
        sql<{ status: string }>(
          `SELECT status FROM bookings WHERE id='adm-${RUN}'`,
        )[0].status,
    )
    .toBe("contacted");
  await page.reload();
  const badge = page.getByTestId("new-bookings-badge");
  if (newCount - 1 > 0) {
    await expect(badge).toHaveText((newCount - 1).toLocaleString("fa-IR"));
  } else {
    await expect(badge).toHaveCount(0);
  }

  await page.getByRole("link", { name: "تماس گرفته شد" }).click();
  await page.waitForURL(/status=contacted/);
  await expect(page.locator("li", { hasText: name })).toBeVisible();
  await page.getByRole("link", { name: "جدید", exact: true }).click();
  await page.waitForURL(/status=new/);
  await expect(page.locator("li", { hasText: name })).toHaveCount(0);
  await context.close();
});

test("admin: the bookings page requires a session", async ({ browser }) => {
  const { context, page } = await visitorPage(browser);
  await page.goto("/admin/bookings");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await context.close();
});

test("admin: «اتصال تلگرام» connects via getUpdates and sends a test message", async ({
  browser,
}) => {
  const before = sql<{ telegram_chat_id: string | null }>(
    "SELECT telegram_chat_id FROM site_settings WHERE id = 1",
  )[0].telegram_chat_id;
  sql("UPDATE site_settings SET telegram_chat_id = NULL WHERE id = 1");
  const { context, page } = await adminPage(browser);
  await page.goto("/admin/settings");
  await expect(page.getByTestId("telegram-status")).toHaveText("متصل نیست");
  await expect(
    page.getByText(
      "ابتدا در تلگرام به ربات خود پیام /start بدهید، سپس دکمه‌ی زیر را بزنید.",
    ),
  ).toBeVisible();

  telegram.calls = [];
  await page.getByRole("button", { name: "اتصال", exact: true }).click();
  await expect(page.getByTestId("telegram-status")).toHaveText("متصل است");
  expect(telegram.calls.some((c) => c.method === "getUpdates")).toBe(true);
  // Latest *private* chat (update 7), not the group or the older one.
  expect(
    sql("SELECT telegram_chat_id FROM site_settings WHERE id = 1")[0],
  ).toEqual({
    telegram_chat_id: "424242",
  });

  await page.getByRole("button", { name: "ارسال پیام آزمایشی" }).click();
  await expect(page.getByText("پیام آزمایشی ارسال شد.")).toBeVisible();
  expect(
    telegram.calls.find((c) => c.method === "sendMessage")?.body.chat_id,
  ).toBe("424242");

  sql(`UPDATE site_settings SET telegram_chat_id = ${q(before)} WHERE id = 1`);
  await context.close();
});

// ---------- footer, tagline, language switch ----------

test("footer links come from settings, hide when unset, and open safely", async ({
  browser,
}) => {
  const before = sql<{
    telegram_url: string | null;
    instagram_url: string | null;
  }>("SELECT telegram_url, instagram_url FROM site_settings WHERE id = 1")[0];
  const { context, page } = await adminPage(browser);
  await page.goto("/admin/settings");
  await page.fill("input[name=instagramUrl]", "devinomaison");
  await page.fill("input[name=telegramUrl]", "");
  await page.locator("main button[type=submit]").first().click();
  await expect(page.locator("input[name=instagramUrl]")).toHaveValue(
    "https://instagram.com/devinomaison",
  );

  for (const locale of ["fa", "en"] as const) {
    await page.goto(`/${locale}`);
    const footer = page.locator("footer");
    await expect(footer).toContainText(
      locale === "fa" ? "همراه ما بمانید" : "Stay Close",
    );
    await expect(footer).toContainText(
      locale === "fa"
        ? "تازه‌ترین کالکشن‌ها و لحظه‌های پشت صحنه را در تلگرام و اینستاگرام دنبال کنید."
        : "Follow new collections and behind-the-scenes moments on Telegram and Instagram.",
    );
    const instagram = footer.getByRole("link", {
      name: locale === "fa" ? "اینستاگرام" : "Instagram",
    });
    await expect(instagram.first()).toHaveAttribute(
      "href",
      "https://instagram.com/devinomaison",
    );
    await expect(instagram.first()).toHaveAttribute("target", "_blank");
    await expect(instagram.first()).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    await expect(
      footer.getByRole("link", { name: /Telegram|تلگرام/ }),
    ).toHaveCount(0);
    await expect(footer.getByText("Pinterest")).toHaveCount(0);
    await expect(footer.locator('a[href="#"]')).toHaveCount(0);
    await expect(footer.locator("input[type=email]")).toHaveCount(0);
  }

  sql(
    `UPDATE site_settings SET telegram_url = ${q(before.telegram_url)}, instagram_url = ${q(before.instagram_url)} WHERE id = 1`,
  );
  await context.close();
});

test("hero tagline uses site settings when set, translation otherwise", async ({
  page,
}) => {
  const before = sql<{ tagline_fa: string | null; tagline_en: string | null }>(
    "SELECT tagline_fa, tagline_en FROM site_settings WHERE id = 1",
  )[0];
  sql(
    `UPDATE site_settings SET tagline_fa = 'شبی به یاد ماندنی', tagline_en = NULL WHERE id = 1`,
  );
  await page.goto("/fa");
  await expect(page.locator("section").first()).toContainText(
    "شبی به یاد ماندنی",
  );
  await page.goto("/en");
  await expect(page.locator("section").first()).toContainText(
    "A Presence of Her Own.",
  );
  sql(
    `UPDATE site_settings SET tagline_fa = ${q(before.tagline_fa)}, tagline_en = ${q(before.tagline_en)} WHERE id = 1`,
  );
});

test("language switch has a 44×44 tap target and a localized aria-label", async ({
  page,
}) => {
  for (const [locale, label] of [
    ["fa", "تغییر زبان به انگلیسی"],
    ["en", "Switch language to Persian"],
  ] as const) {
    await page.goto(`/${locale}`);
    const toggle = page.getByRole("link", { name: label });
    const box = (await toggle.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

// ---------- SEO ----------

test("404 status and a styled bilingual not-found page for a missing product/collection", async ({
  page,
}) => {
  for (const [path, heading, back] of [
    ["/fa/products/does-not-exist", "صفحه پیدا نشد", "بازگشت به کالکشن‌ها"],
    [
      "/en/products/does-not-exist",
      "Page not found",
      "Back to the collections",
    ],
    [
      "/en/collections/does-not-exist",
      "Page not found",
      "Back to the collections",
    ],
    ["/fa/no-such-page", "صفحه پیدا نشد", "بازگشت به کالکشن‌ها"],
  ] as const) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.getByRole("link", { name: back })).toHaveAttribute(
      "href",
      new RegExp(`^/${path.split("/")[1]}/collections$`),
    );
  }
});

test("metadata, Open Graph and hreflang are present and localized", async ({
  page,
}) => {
  const meta = (selector: string) =>
    page.locator(selector).first().getAttribute("content");

  await page.goto("/fa");
  await expect(page).toHaveTitle("deVino");
  expect(await meta('meta[name="description"]')).toMatch(/[؀-ۿ]/);

  await page.goto("/fa/products/merlot");
  await expect(page).toHaveTitle("مرلو | deVino");
  const faDescription = (await meta('meta[name="description"]'))!;
  expect(faDescription).toMatch(/[؀-ۿ]/);
  expect(faDescription).not.toMatch(/[A-Za-z]{4,}/);
  expect(await meta('meta[property="og:image"]')).toMatch(
    /^https?:\/\/[^/]+\/media\/[\w-]+$/,
  );
  expect(await meta('meta[property="og:locale"]')).toBe("fa_IR");
  expect(await meta('meta[name="twitter:card"]')).toBe("summary_large_image");
  const hreflang = (lang: string) =>
    page
      .locator(`link[rel="alternate"][hreflang="${lang}"]`)
      .getAttribute("href");
  expect(await hreflang("fa")).toMatch(/\/fa\/products\/merlot$/);
  expect(await hreflang("en")).toMatch(/\/en\/products\/merlot$/);
  expect(await hreflang("x-default")).toMatch(/\/fa\/products\/merlot$/);
  expect(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
  ).toMatch(/^https?:\/\/.+\/fa\/products\/merlot$/);

  await page.goto("/en/products/merlot");
  await expect(page).toHaveTitle("Merlot | deVino");
  expect(await meta('meta[name="description"]')).not.toMatch(/[؀-ۿ]/);
  expect(await meta('meta[property="og:locale"]')).toBe("en_US");

  await page.goto("/en/collections/first-harvest");
  await expect(page).toHaveTitle("First Harvest | deVino");
  expect(await meta('meta[property="og:image"]')).toMatch(/\/media\/[\w-]+$/);

  await page.goto("/en/contact");
  await expect(page).toHaveTitle("Book a Private Fitting | deVino");
  expect(await meta('meta[name="description"]')).toContain(
    "book a private fitting",
  );
});

test("robots.txt disallows everything by default; sitemap lists both locales", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/User-Agent: \*/i);
  expect(robots).toMatch(/^Disallow: \/$/m);
  expect(robots).toMatch(/^Disallow: \/admin$/m);
  expect(robots).not.toMatch(/^Allow:/m);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of [
    "/fa",
    "/en",
    "/fa/contact",
    "/en/collections/first-harvest",
    "/fa/products/merlot",
  ]) {
    expect(sitemap).toContain(`${path}</loc>`);
  }
  expect(sitemap).toContain('hreflang="x-default"');
});

// ---------- small fixes ----------

test("product page links to the booking form with the product preselected", async ({
  page,
}) => {
  await page.goto("/fa/products/merlot");
  await page.getByRole("link", { name: "رزرو وقت پرو" }).click();
  await page.waitForURL(/\/fa\/contact\?product=merlot$/);
  await expect(page.locator("#booking-product")).toHaveValue("merlot");
  await page.goto("/en/products/merlot");
  await expect(
    page.getByRole("link", { name: "Book a fitting" }),
  ).toHaveAttribute("href", "/en/contact?product=merlot");
});

test("back from a product page restores the scroll position", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 640 },
  });
  const page = await context.newPage();
  await page.goto("/fa/collections/first-harvest");
  const card = page.locator('[aria-roledescription="slide"] a').first();
  await card.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 150);
  await page.waitForTimeout(300);
  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled).toBeGreaterThan(100);

  await card.click();
  await page.waitForURL(/\/fa\/products\//);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.goBack();
  await page.waitForURL(/\/fa\/collections\/first-harvest$/);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeGreaterThan(scrolled - 30);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(scrolled + 30);
  await context.close();
});
