/**
 * Brief 04, Part A (order requests) against the local OpenNext/wrangler
 * preview, fa and en. D1 is inspected through wrangler; the Telegram Bot
 * API is a local mock (preview started with TELEGRAM_API_BASE=
 * http://127.0.0.1:9911 in .dev.vars and NO_PROXY=127.0.0.1).
 */
import { execFileSync } from "node:child_process";
import http from "node:http";
import { test, expect, type Browser, type Page } from "@playwright/test";

const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const RUN = Date.now().toString(36);
let ipCounter = 0;

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

// ---------- Telegram mock ----------

const telegram = {
  calls: [] as { method: string; body: Record<string, unknown> }[],
  server: null as http.Server | null,
};

test.beforeAll(async () => {
  if (!PASSWORD)
    throw new Error("Set ADMIN_PASSWORD (same value as in .dev.vars).");
  telegram.server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      telegram.calls.push({
        method: (req.url ?? "").split("/").pop() ?? "",
        body: raw ? JSON.parse(raw) : {},
      });
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, result: {} }));
    });
  });
  await new Promise<void>((resolve) =>
    telegram.server!.listen(9911, "127.0.0.1", resolve),
  );
});
test.afterAll(async () => {
  await new Promise((resolve) => telegram.server?.close(resolve));
});

// ---------- helpers ----------

async function visitor(
  browser: Browser,
  ip = `192.0.2.${(++ipCounter % 250) + 1}-${RUN}`,
) {
  const context = await browser.newContext({
    extraHTTPHeaders: { "cf-connecting-ip": ip },
  });
  return { context, page: await context.newPage() };
}

async function adminPage(browser: Browser) {
  const context = await browser.newContext();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin$/);
  return { context, page };
}

interface OrderFields {
  name: string;
  phone: string;
  size?: string;
  province?: string;
  city: string;
  address: string;
  postalCode: string;
  note?: string;
}

async function fillOrder(page: Page, f: OrderFields) {
  await page.fill("#order-name", f.name);
  await page.fill("#order-phone", f.phone);
  await page.selectOption("#order-size", f.size ?? "40");
  await page.selectOption("#order-province", f.province ?? "تهران");
  await page.fill("#order-city", f.city);
  await page.fill("#order-address", f.address);
  await page.fill("#order-postalCode", f.postalCode);
  if (f.note) await page.fill("#order-note", f.note);
}

function order(name: string) {
  return sql<Record<string, string | number | null>>(
    `SELECT * FROM orders WHERE name = ${q(name)}`,
  );
}

const merlot = () =>
  sql<{ id: string; price: number; name_fa: string }>(
    "SELECT id, price, name_fa FROM products WHERE slug='merlot'",
  )[0];

const TEXT = {
  fa: {
    submit: "ثبت سفارش",
    success:
      "سفارش شما ثبت شد. به‌زودی برای تأیید جزئیات با شما تماس می‌گیریم.",
    errors: {
      name: "لطفاً نام را وارد کنید.",
      phone: "شماره‌ی موبایل معتبر نیست.",
      product: "لطفاً یک لباس انتخاب کنید.",
      size: "لطفاً سایز را انتخاب کنید.",
      province: "لطفاً استان را انتخاب کنید.",
      city: "لطفاً شهر را وارد کنید.",
      address: "لطفاً نشانی کامل را وارد کنید.",
      postalCode: "کد پستی باید ۱۰ رقم باشد.",
    },
  },
  en: {
    submit: "Send order",
    success:
      "Your order has been received. We'll call you shortly to confirm the details.",
    errors: {
      name: "Please enter your name.",
      phone: "Please enter a valid mobile number.",
      product: "Please choose a piece.",
      size: "Please choose a size.",
      province: "Please choose a province.",
      city: "Please enter your city.",
      address: "Please enter your full address.",
      postalCode: "The postal code must be 10 digits.",
    },
  },
} as const;

// ---------- order page ----------

test("fa: order from a product page — preselected, summary, DB price snapshot, Persian digits, Telegram", async ({
  browser,
}) => {
  const before = sql<{ telegram_chat_id: string | null }>(
    "SELECT telegram_chat_id FROM site_settings WHERE id = 1",
  )[0].telegram_chat_id;
  sql("UPDATE site_settings SET telegram_chat_id = '424242' WHERE id = 1");
  const product = merlot();
  const { context, page } = await visitor(browser);

  await page.goto("/fa/products/merlot");
  await page.getByRole("link", { name: "ثبت سفارش" }).click();
  await page.waitForURL(/\/fa\/order\?product=merlot$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ثبت سفارش");
  await expect(page.locator("#order-product")).toHaveValue("merlot");
  const summary = page.getByTestId("order-summary");
  await expect(summary).toContainText("مرلو");
  await expect(summary).toContainText("تومان");
  await expect(summary.locator("img")).toHaveCount(1);
  // Changing the piece updates the summary.
  await page.selectOption("#order-product", "syrah");
  await expect(summary).toContainText("سیرا");
  await page.selectOption("#order-product", "merlot");
  await expect(summary).toContainText("مرلو");
  // No date field anymore.
  await expect(page.locator('input[name="preferredDate"]')).toHaveCount(0);

  const name = `مریم ${RUN}`;
  await fillOrder(page, {
    name,
    phone: "۰۹۱۲ ۳۴۵ ۶۷۸۹",
    size: "42",
    province: "اصفهان",
    city: "کاشان",
    address: "خیابان امیرکبیر، کوچه‌ی ۱۲، پلاک ۴",
    postalCode: "۸۷۱۵۹-۱۲۳۴۵",
    note: "ترجیحاً عصر تماس بگیرید",
  });
  // Tampering: extra fields claiming a price/name never reach the order.
  await page.evaluate(() => {
    const form = document.querySelector("form")!;
    for (const [n, v] of [
      ["price", "1"],
      ["price_snapshot", "1"],
      ["product_name_snapshot", "Fake"],
    ]) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = n;
      input.value = v;
      form.appendChild(input);
    }
  });
  telegram.calls = [];
  await page.getByRole("button", { name: TEXT.fa.submit }).click();
  await expect(page.getByRole("status")).toHaveText(TEXT.fa.success);
  await expect(page.locator("form")).toHaveCount(0);

  expect(order(name)[0]).toMatchObject({
    phone: "09123456789",
    product_id: product.id,
    product_name_snapshot: product.name_fa,
    price_snapshot: product.price,
    size: 42,
    province: "اصفهان",
    city: "کاشان",
    address: "خیابان امیرکبیر، کوچه‌ی ۱۲، پلاک ۴",
    postal_code: "8715912345",
    note: "ترجیحاً عصر تماس بگیرید",
    locale: "fa",
    status: "new",
  });

  await expect
    .poll(() => telegram.calls.filter((c) => c.method === "sendMessage").length)
    .toBe(1);
  const text = String(
    telegram.calls.find((c) => c.method === "sendMessage")!.body.text,
  );
  const lines = text.split("\n");
  expect(lines[0]).toBe("سفارش جدید");
  for (const expected of [
    `نام: ${name}`,
    "موبایل: 09123456789",
    `لباس: ${product.name_fa}`,
    "سایز: 42",
    `قیمت: ${product.price.toLocaleString("fa-IR")} تومان`,
    "استان/شهر: اصفهان / کاشان",
    "نشانی: خیابان امیرکبیر، کوچه‌ی ۱۲، پلاک ۴",
    "کد پستی: 8715912345",
    "توضیحات: ترجیحاً عصر تماس بگیرید",
  ]) {
    expect(lines).toContain(expected);
  }
  expect(lines.at(-1)).toMatch(/\/admin\/orders$/);

  sql(`UPDATE site_settings SET telegram_chat_id = ${q(before)} WHERE id = 1`);
  await context.close();
});

test("en: shipping note, English province names stored in Persian, success", async ({
  browser,
}) => {
  const { context, page } = await visitor(browser);
  await page.goto("/en/order?product=syrah");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Place an Order",
  );
  await expect(
    page.getByText("We currently ship within Iran only."),
  ).toBeVisible();
  await expect(page.locator("#order-product")).toHaveValue("syrah");
  await expect(page.locator("#order-size option").first()).toHaveText(
    "Choose a size",
  );
  await expect(
    page.getByText("Between two sizes? Mention it in the notes."),
  ).toBeVisible();
  await expect(
    page.locator('#order-province option[value="اصفهان"]'),
  ).toHaveText("Isfahan");
  await expect(page.locator("#order-province option")).toHaveCount(32); // placeholder + 31

  const name = `Sara ${RUN}`;
  await fillOrder(page, {
    name,
    phone: "+98 912-345-6789",
    size: "38",
    province: "فارس",
    city: "Shiraz",
    address: "Zand Blvd, No. 7",
    postalCode: "71 345 67890",
  });
  await page.getByRole("button", { name: TEXT.en.submit }).click();
  await expect(page.getByRole("status")).toHaveText(TEXT.en.success);
  expect(order(name)[0]).toMatchObject({
    phone: "09123456789",
    size: 38,
    province: "فارس",
    postal_code: "7134567890",
    note: null,
    locale: "en",
  });
  await context.close();
});

for (const locale of ["fa", "en"] as const) {
  test(`${locale}: every validation error, without a product; typed values survive`, async ({
    browser,
  }) => {
    const { context, page } = await visitor(browser);
    await page.goto(`/${locale}/order`);
    await expect(page.getByTestId("order-summary")).toHaveCount(0);
    await expect(page.locator("#order-product")).toHaveValue("");
    const submit = page.getByRole("button", { name: TEXT[locale].submit });

    await submit.click();
    for (const message of Object.values(TEXT[locale].errors)) {
      await expect(page.getByText(message, { exact: true })).toBeVisible();
    }
    await expect(page.locator("#order-name")).toBeFocused();
    await expect(page.locator("#order-postalCode")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.locator("#order-postalCode")).toHaveAttribute(
      "aria-describedby",
      "order-postalCode-error",
    );

    // Everything valid except a 9-digit postal code.
    await page.selectOption("#order-product", "merlot");
    await fillOrder(page, {
      name: `Invalid ${RUN}`,
      phone: "09121112233",
      city: "Tehran",
      address: "Somewhere 1",
      postalCode: "۱۲۳۴۵۶۷۸۹",
    });
    await submit.click();
    await expect(
      page.getByText(TEXT[locale].errors.postalCode, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(TEXT[locale].errors.name, { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("#order-postalCode")).toBeFocused();
    await expect(page.locator("#order-city")).toHaveValue("Tehran");
    expect(order(`Invalid ${RUN}`)).toHaveLength(0);
    await context.close();
  });
}

test("honeypot saves nothing; an IP is limited to 5 orders per hour", async ({
  browser,
}) => {
  const bot = await visitor(browser);
  await bot.page.goto("/fa/order?product=merlot");
  await fillOrder(bot.page, {
    name: `Bot ${RUN}`,
    phone: "09120000000",
    city: "x",
    address: "x",
    postalCode: "1234567890",
  });
  await bot.page
    .locator("input[name=website]")
    .evaluate((el: HTMLInputElement) => (el.value = "spam"));
  await bot.page.getByRole("button", { name: TEXT.fa.submit }).click();
  await expect(bot.page.getByRole("status")).toHaveText(TEXT.fa.success);
  expect(order(`Bot ${RUN}`)).toHaveLength(0);
  await bot.context.close();

  const ip = `192.0.2.250-${RUN}`;
  const name = `Limit ${RUN}`;
  for (let i = 1; i <= 6; i++) {
    const { context, page } = await visitor(browser, ip);
    await page.goto("/fa/order?product=merlot");
    await fillOrder(page, {
      name,
      phone: "09125556677",
      city: "x",
      address: "x",
      postalCode: "1234567890",
    });
    await page.getByRole("button", { name: TEXT.fa.submit }).click();
    if (i <= 5)
      await expect(page.getByRole("status")).toHaveText(TEXT.fa.success);
    else
      await expect(
        page.getByText("ارسال انجام نشد. لطفاً دوباره تلاش کنید."),
      ).toBeVisible();
    await context.close();
  }
  expect(order(name)).toHaveLength(5);
});

test("the order page is noindex and not in the sitemap", async ({
  page,
  request,
}) => {
  for (const locale of ["fa", "en"]) {
    await page.goto(`/${locale}/order`);
    expect(
      await page.locator('meta[name="robots"]').getAttribute("content"),
    ).toMatch(/noindex/);
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/order");
});

// ---------- admin ----------

test("admin: order with all fields, «کپی نشانی», status change, badge, filter; /admin/bookings redirects", async ({
  browser,
}) => {
  const product = merlot();
  const name = `Admin ${RUN}`;
  sql(
    `INSERT INTO orders (id, name, phone, product_id, product_name_snapshot, price_snapshot, size,
       province, city, address, postal_code, note, locale)
     VALUES ('ord-${RUN}', ${q(name)}, '09127778899', '${product.id}', ${q(product.name_fa)}, 26000000, 40,
       'تهران', 'تهران', 'خیابان ولیعصر، پلاک ۱۰', '1234567890', 'یادداشت', 'fa')`,
  );
  const newCount = sql<{ n: number }>(
    "SELECT COUNT(*) AS n FROM orders WHERE status='new'",
  )[0].n;

  const { context, page } = await adminPage(browser);
  await page.goto("/admin/bookings");
  await expect(page).toHaveURL(/\/admin\/orders$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("سفارش‌ها");
  const nav = page.getByRole("link", { name: /سفارش‌ها/ });
  await expect(nav).toHaveAttribute("href", "/admin/orders");
  await expect(page.getByTestId("new-orders-badge")).toHaveText(
    newCount.toLocaleString("fa-IR"),
  );

  const card = page.locator("li", { hasText: name });
  await expect(card.getByRole("link", { name: "09127778899" })).toHaveAttribute(
    "href",
    "tel:09127778899",
  );
  await expect(
    card.getByRole("link", { name: product.name_fa }),
  ).toHaveAttribute("href", "/fa/products/merlot");
  await expect(card).toContainText("سایز: ۴۰");
  await expect(card).toContainText("۲۶٬۰۰۰٬۰۰۰ تومان");
  await expect(card).toContainText("تهران / تهران");
  await expect(card).toContainText("خیابان ولیعصر، پلاک ۱۰");
  await expect(card).toContainText("1234567890");
  await expect(card).toContainText("یادداشت");
  await expect(card).toContainText(
    /ثبت: [۰-۹]+ (فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند) [۰-۹]{4}/,
  );

  await card.getByRole("button", { name: "کپی نشانی" }).click();
  await expect(card.getByRole("button", { name: "کپی شد" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    [
      name,
      "09127778899",
      "تهران، تهران",
      "خیابان ولیعصر، پلاک ۱۰",
      "کد پستی: 1234567890",
    ].join("\n"),
  );

  const select = card.getByRole("combobox");
  await expect(select.locator("option")).toHaveText([
    "جدید",
    "تماس گرفته شد",
    "تأیید شد",
    "ارسال شد",
    "لغو شد",
  ]);
  await select.selectOption("confirmed");
  await expect
    .poll(
      () =>
        sql<{ status: string }>(
          `SELECT status FROM orders WHERE id='ord-${RUN}'`,
        )[0].status,
    )
    .toBe("confirmed");
  await page.reload();
  if (newCount - 1 > 0) {
    await expect(page.getByTestId("new-orders-badge")).toHaveText(
      (newCount - 1).toLocaleString("fa-IR"),
    );
  } else {
    await expect(page.getByTestId("new-orders-badge")).toHaveCount(0);
  }
  await page.getByRole("link", { name: "تأیید شد" }).click();
  await page.waitForURL(/status=confirmed/);
  await expect(page.locator("li", { hasText: name })).toBeVisible();
  await context.close();
});

// ---------- contact page & wording ----------

test("contact page: no form, prominent channels, order hint links to the collections", async ({
  page,
}) => {
  const before = sql<{
    contact_phone: string | null;
    telegram_url: string | null;
    instagram_url: string | null;
  }>(
    "SELECT contact_phone, telegram_url, instagram_url FROM site_settings WHERE id = 1",
  )[0];
  sql(
    "UPDATE site_settings SET contact_phone = '+98 912 000 0000', telegram_url = 'https://t.me/devino', instagram_url = 'https://instagram.com/devinomaison' WHERE id = 1",
  );
  for (const [locale, title, intro, hint, labels] of [
    [
      "fa",
      "تماس با ما",
      "برای پرسش درباره‌ی لباس‌ها، سایز یا سفارش‌های قبلی، از یکی از راه‌های زیر با ما در ارتباط باشید.",
      "برای ثبت سفارش، در صفحه‌ی هر لباس دکمه‌ی «ثبت سفارش» را بزنید.",
      ["تماس تلفنی", "تلگرام", "اینستاگرام"],
    ],
    [
      "en",
      "Contact",
      "For questions about our pieces, sizing or an existing order, reach us through any of the channels below.",
      'To place an order, use the "Place an order" button on any piece\'s page.',
      ["Call", "Telegram", "Instagram"],
    ],
  ] as const) {
    await page.goto(`/${locale}/contact`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText(intro, { exact: true })).toBeVisible();
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(
      page.locator("main input, main select, main textarea"),
    ).toHaveCount(0);
    const phone = page.locator("main").getByRole("link", { name: labels[0] });
    await expect(phone).toHaveAttribute("href", "tel:+98 912 000 0000");
    await expect(
      page.locator("main").getByRole("link", { name: labels[1] }),
    ).toHaveAttribute("href", "https://t.me/devino");
    await expect(
      page.locator("main").getByRole("link", { name: labels[2] }),
    ).toHaveAttribute("href", "https://instagram.com/devinomaison");
    expect(
      Number.parseFloat(
        await phone.evaluate((el) => getComputedStyle(el).fontSize),
      ),
    ).toBeGreaterThanOrEqual(24);
    await expect(page.getByRole("link", { name: hint })).toHaveAttribute(
      "href",
      `/${locale}/collections`,
    );
  }
  sql(
    `UPDATE site_settings SET contact_phone = ${q(before.contact_phone)}, telegram_url = ${q(before.telegram_url)}, instagram_url = ${q(before.instagram_url)} WHERE id = 1`,
  );
});

test("no fitting/booking wording remains in pages, titles or the admin nav", async ({
  browser,
}) => {
  const banned = /وقت پرو|پرو\s|رزرو|fitting|booking/i;
  const page = await browser.newPage();
  for (const locale of ["fa", "en"]) {
    for (const path of [
      "",
      "/collections",
      "/collections/first-harvest",
      "/products/merlot",
      "/about",
      "/contact",
      "/order",
    ]) {
      await page.goto(`/${locale}${path}`);
      const text = await page.evaluate(
        () =>
          document.body.innerText +
          document.title +
          [...document.querySelectorAll("meta[content]")]
            .map((m) => m.getAttribute("content"))
            .join(" "),
      );
      expect(text, `${locale}${path}`).not.toMatch(banned);
    }
  }
  await page.close();
  const { context, page: admin } = await adminPage(browser);
  await admin.goto("/admin/orders");
  expect(await admin.locator("header").innerText()).not.toMatch(banned);
  await context.close();
});
