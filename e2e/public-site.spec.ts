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
import { test, expect, type Browser } from "@playwright/test";

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

// ---------- admin ----------

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

test("home tagline uses site settings when set, translation otherwise", async ({
  page,
}) => {
  const before = sql<{ tagline_fa: string | null; tagline_en: string | null }>(
    "SELECT tagline_fa, tagline_en FROM site_settings WHERE id = 1",
  )[0];
  sql(
    `UPDATE site_settings SET tagline_fa = 'شبی به یاد ماندنی', tagline_en = NULL WHERE id = 1`,
  );
  // Brief 04: the tagline lives in the collections teaser, not the hero.
  await page.goto("/fa");
  await expect(page.getByTestId("home-tagline")).toHaveText(
    "شبی به یاد ماندنی",
  );
  await page.goto("/en");
  await expect(page.getByTestId("home-tagline")).toHaveText(
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
  await expect(page).toHaveTitle("Contact | deVino");
  expect(await meta('meta[name="description"]')).toContain(
    "For questions about our pieces",
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

test("product page links to the order form with the product preselected", async ({
  page,
}) => {
  await page.goto("/fa/products/merlot");
  await page.getByRole("link", { name: "ثبت سفارش" }).click();
  await page.waitForURL(/\/fa\/order\?product=merlot$/);
  await expect(page.locator("#order-product")).toHaveValue("merlot");
  await page.goto("/en/products/merlot");
  await expect(
    page.getByRole("link", { name: "Place an order" }),
  ).toHaveAttribute("href", "/en/order?product=merlot");
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
