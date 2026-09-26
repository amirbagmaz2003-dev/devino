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
  method?: "phone" | "whatsapp" | "telegram";
  telegramUsername?: string;
  note?: string;
}

const METHOD_LABEL = {
  fa: { phone: "تماس تلفنی", whatsapp: "واتس‌اپ", telegram: "تلگرام" },
  en: { phone: "Phone call", whatsapp: "WhatsApp", telegram: "Telegram" },
} as const;

async function fillOrder(
  page: Page,
  f: OrderFields,
  locale: "fa" | "en" = "fa",
) {
  await page.fill("#order-name", f.name);
  await page.fill("#order-phone", f.phone);
  await page.selectOption("#order-size", f.size ?? "38");
  if (f.method)
    await page
      .getByRole("radio", { name: METHOD_LABEL[locale][f.method] })
      .check();
  if (f.telegramUsername !== undefined)
    await page.fill("#order-telegramUsername", f.telegramUsername);
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
    intro:
      "برای ثبت سفارش، فرم زیر را پر کنید. پس از ثبت، برای نهایی کردن سفارش از راهی که انتخاب می‌کنید با شما تماس می‌گیریم.",
    methodLegend: "راه تماس را مشخص کنید",
    telegramLabel: "آیدی تلگرام",
    success: (m: string) =>
      `سفارش شما ثبت شد. برای نهایی کردن آن، به‌زودی از طریق ${m} با شما در ارتباط خواهیم بود.`,
    successMethod: {
      phone: "تماس تلفنی",
      whatsapp: "واتس‌اپ",
      telegram: "تلگرام",
    },
    errors: {
      name: "لطفاً نام را وارد کنید.",
      phone: "شماره‌ی موبایل معتبر نیست.",
      product: "لطفاً یک لباس انتخاب کنید.",
      size: "لطفاً سایز را انتخاب کنید.",
      telegramUsername: "لطفاً آیدی تلگرام را درست وارد کنید.",
    },
  },
  en: {
    submit: "Send order",
    intro:
      "Fill in the form below to place your order. Once it's received, we'll contact you through the channel you choose to finalize it.",
    methodLegend: "Choose how we should contact you",
    telegramLabel: "Telegram username",
    success: (m: string) =>
      `Your order has been received. We'll be in touch shortly via ${m} to finalize it.`,
    successMethod: {
      phone: "a phone call",
      whatsapp: "WhatsApp",
      telegram: "Telegram",
    },
    errors: {
      name: "Please enter your name.",
      phone: "Please enter a valid mobile number.",
      product: "Please choose a piece.",
      size: "Please choose a size.",
      telegramUsername: "Please enter a valid Telegram username.",
    },
  },
} as const;

// ---------- order page ----------

test("fa: from the product page (old block gone) — default phone, DB price snapshot, Telegram message format", async ({
  browser,
}) => {
  const before = sql<{ telegram_chat_id: string | null }>(
    "SELECT telegram_chat_id FROM site_settings WHERE id = 1",
  )[0].telegram_chat_id;
  sql("UPDATE site_settings SET telegram_chat_id = '424242' WHERE id = 1");
  const product = merlot();
  const { context, page } = await visitor(browser);

  await page.goto("/fa/products/merlot");
  // The old order/contact block is gone; only the button remains.
  await expect(page.getByText("برای ثبت سفارش", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText(/این سایت صرفاً نمایشگر مجموعه است/)).toHaveCount(
    0,
  );
  await expect(
    page.locator(
      "main a[href^='tel:'], main a[href*='t.me'], main a[href*='instagram.com']",
    ),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "ثبت سفارش" }).click();
  await page.waitForURL(/\/fa\/order\?product=merlot$/);
  await expect(page.getByText(TEXT.fa.intro, { exact: true })).toBeVisible();
  await expect(page.getByTestId("order-summary")).toContainText("مرلو");
  for (const gone of [
    "#order-province",
    "#order-city",
    "#order-address",
    "#order-postalCode",
  ]) {
    await expect(page.locator(gone)).toHaveCount(0);
  }
  // Field order: name, mobile, piece, size, contact method, (Telegram), notes.
  const order_ = await page.locator("form label, form legend").allInnerTexts();
  expect(
    order_
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(1),
  ).toEqual([
    "نام و نام خانوادگی",
    "شماره‌ی موبایل",
    "لباس",
    "سایز",
    TEXT.fa.methodLegend,
    "تماس تلفنی",
    "واتس‌اپ",
    "تلگرام",
    "توضیحات (اختیاری)",
  ]);
  // Default method: phone; no Telegram field.
  await expect(page.getByRole("radio", { name: "تماس تلفنی" })).toBeChecked();
  await expect(page.locator("#order-telegramUsername")).toHaveCount(0);

  const name = `مریم ${RUN}`;
  await fillOrder(page, {
    name,
    phone: "۰۹۱۲ ۳۴۵ ۶۷۸۹",
    size: "40",
    note: "ترجیحاً عصر",
  });
  // Tampering with price/name fields never reaches the order.
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
  await expect(page.getByRole("status")).toHaveText(
    TEXT.fa.success("تماس تلفنی"),
  );

  expect(order(name)[0]).toMatchObject({
    phone: "09123456789",
    product_id: product.id,
    product_name_snapshot: product.name_fa,
    price_snapshot: product.price,
    size: 40,
    contact_method: "phone",
    telegram_username: null,
    note: "ترجیحاً عصر",
    locale: "fa",
    status: "new",
  });

  await expect
    .poll(() => telegram.calls.filter((c) => c.method === "sendMessage").length)
    .toBe(1);
  const lines = String(
    telegram.calls.find((c) => c.method === "sendMessage")!.body.text,
  ).split("\n");
  expect(lines[0]).toBe("سفارش جدید");
  for (const expected of [
    `نام: ${name}`,
    "موبایل: 09123456789",
    `لباس: ${product.name_fa}`,
    "سایز: 40",
    `قیمت: ${product.price.toLocaleString("fa-IR")} تومان`,
    "راه تماس: تماس تلفنی",
    "توضیحات: ترجیحاً عصر",
  ]) {
    expect(lines).toContain(expected);
  }
  expect(
    lines.some((l) => /^(آیدی تلگرام|استان\/شهر|نشانی|کد پستی):/.test(l)),
  ).toBe(false);
  expect(lines.at(-1)).toMatch(/\/admin\/orders$/);

  sql(`UPDATE site_settings SET telegram_chat_id = ${q(before)} WHERE id = 1`);
  await context.close();
});

for (const locale of ["fa", "en"] as const) {
  test(`${locale}: Telegram username only for Telegram, required, normalized; message names the method`, async ({
    browser,
  }) => {
    const before = sql<{ telegram_chat_id: string | null }>(
      "SELECT telegram_chat_id FROM site_settings WHERE id = 1",
    )[0].telegram_chat_id;
    sql("UPDATE site_settings SET telegram_chat_id = '424242' WHERE id = 1");
    const { context, page } = await visitor(browser);
    await page.goto(`/${locale}/order?product=syrah`);
    await expect(
      page.getByRole("radio", { name: METHOD_LABEL[locale].phone }),
    ).toBeChecked();
    await expect(page.locator("#order-telegramUsername")).toHaveCount(0);

    // Telegram: the field appears with its label and placeholder, and is required.
    await page
      .getByRole("radio", { name: METHOD_LABEL[locale].telegram })
      .check();
    const username = page.locator("#order-telegramUsername");
    await expect(username).toBeVisible();
    await expect(page.getByLabel(TEXT[locale].telegramLabel)).toBeVisible();
    await expect(username).toHaveAttribute("placeholder", "@username");
    const name = `TG ${locale} ${RUN}`;
    await fillOrder(
      page,
      { name, phone: "09121234567", size: "36", telegramUsername: "" },
      locale,
    );
    await page.getByRole("button", { name: TEXT[locale].submit }).click();
    await expect(
      page.getByText(TEXT[locale].errors.telegramUsername, { exact: true }),
    ).toBeVisible();
    await expect(username).toBeFocused();
    for (const invalid of ["abc", "bad name", "@x-y-z-w-v", "a".repeat(33)]) {
      await username.fill(invalid);
      await page.getByRole("button", { name: TEXT[locale].submit }).click();
      await expect(
        page.getByText(TEXT[locale].errors.telegramUsername, { exact: true }),
      ).toBeVisible();
    }
    expect(order(name)).toHaveLength(0);

    // Switching away hides it; switching back keeps working. "@" is stripped.
    await page
      .getByRole("radio", { name: METHOD_LABEL[locale].whatsapp })
      .check();
    await expect(username).toHaveCount(0);
    await page
      .getByRole("radio", { name: METHOD_LABEL[locale].telegram })
      .check();
    await page.fill("#order-telegramUsername", "@Devino_Client1");
    telegram.calls = [];
    await page.getByRole("button", { name: TEXT[locale].submit }).click();
    await expect(page.getByRole("status")).toHaveText(
      TEXT[locale].success(TEXT[locale].successMethod.telegram),
    );
    expect(order(name)[0]).toMatchObject({
      size: 36,
      contact_method: "telegram",
      telegram_username: "Devino_Client1",
      locale,
    });
    await expect
      .poll(() => telegram.calls.some((c) => c.method === "sendMessage"))
      .toBe(true);
    const lines = String(
      telegram.calls.find((c) => c.method === "sendMessage")!.body.text,
    ).split("\n");
    expect(lines).toContain("راه تماس: تلگرام");
    expect(lines).toContain("آیدی تلگرام: @Devino_Client1");

    // WhatsApp: the success message names it; a stray username is ignored.
    const wa = await visitor(browser);
    await wa.page.goto(`/${locale}/order?product=merlot`);
    const waName = `WA ${locale} ${RUN}`;
    await fillOrder(
      wa.page,
      { name: waName, phone: "09121234567", method: "whatsapp" },
      locale,
    );
    await wa.page.evaluate(() => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "telegramUsername";
      input.value = "someone_else";
      document.querySelector("form")!.appendChild(input);
    });
    await wa.page.getByRole("button", { name: TEXT[locale].submit }).click();
    await expect(wa.page.getByRole("status")).toHaveText(
      TEXT[locale].success(TEXT[locale].successMethod.whatsapp),
    );
    expect(order(waName)[0]).toMatchObject({
      contact_method: "whatsapp",
      telegram_username: null,
    });
    await wa.context.close();

    sql(
      `UPDATE site_settings SET telegram_chat_id = ${q(before)} WHERE id = 1`,
    );
    await context.close();
  });

  test(`${locale}: validation errors; only sizes 36/38/40, also server-side`, async ({
    browser,
  }) => {
    const { context, page } = await visitor(browser);
    await page.goto(`/${locale}/order`);
    await expect(page.locator("#order-size option")).toHaveText([
      locale === "fa" ? "انتخاب سایز" : "Choose a size",
      ...(locale === "fa" ? ["۳۶", "۳۸", "۴۰"] : ["36", "38", "40"]),
    ]);
    await expect(
      page.getByText(
        locale === "fa"
          ? "اگر بین دو سایز مردد هستید، در توضیحات بنویسید."
          : "Between two sizes? Mention it in the notes.",
      ),
    ).toBeVisible();
    const submit = page.getByRole("button", { name: TEXT[locale].submit });
    await submit.click();
    for (const field of ["name", "phone", "product", "size"] as const) {
      await expect(
        page.getByText(TEXT[locale].errors[field], { exact: true }),
      ).toBeVisible();
    }
    await expect(page.locator("#order-name")).toBeFocused();

    // A tampered size (42) is refused by the server.
    await page.selectOption("#order-product", "merlot");
    const name = `Size ${locale} ${RUN}`;
    await fillOrder(page, { name, phone: "09121112233" }, locale);
    await page.locator("#order-size").evaluate((select: HTMLSelectElement) => {
      const option = document.createElement("option");
      option.value = "42";
      select.appendChild(option);
      select.value = "42";
    });
    await submit.click();
    await expect(
      page.getByText(TEXT[locale].errors.size, { exact: true }),
    ).toBeVisible();
    await expect(page.locator("#order-name")).toHaveValue(name);
    expect(order(name)).toHaveLength(0);
    await context.close();
  });
}

test("honeypot saves nothing; an IP is limited to 5 orders per hour", async ({
  browser,
}) => {
  const bot = await visitor(browser);
  await bot.page.goto("/fa/order?product=merlot");
  await fillOrder(bot.page, { name: `Bot ${RUN}`, phone: "09120000000" });
  await bot.page
    .locator("input[name=website]")
    .evaluate((el: HTMLInputElement) => (el.value = "spam"));
  await bot.page.getByRole("button", { name: TEXT.fa.submit }).click();
  await expect(bot.page.getByRole("status")).toBeVisible();
  expect(order(`Bot ${RUN}`)).toHaveLength(0);
  await bot.context.close();

  const ip = `192.0.2.250-${RUN}`;
  const name = `Limit ${RUN}`;
  for (let i = 1; i <= 6; i++) {
    const { context, page } = await visitor(browser, ip);
    await page.goto("/fa/order?product=merlot");
    await fillOrder(page, { name, phone: "09125556677" });
    await page.getByRole("button", { name: TEXT.fa.submit }).click();
    if (i <= 5) await expect(page.getByRole("status")).toBeVisible();
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

test("admin: size and contact method, WhatsApp and Telegram links, no address; status, badge, filter", async ({
  browser,
}) => {
  const product = merlot();
  const rows = [
    { id: `ph-${RUN}`, name: `Admin phone ${RUN}`, method: "phone", tg: null },
    {
      id: `wa-${RUN}`,
      name: `Admin whatsapp ${RUN}`,
      method: "whatsapp",
      tg: null,
    },
    {
      id: `tg-${RUN}`,
      name: `Admin telegram ${RUN}`,
      method: "telegram",
      tg: "devino_client",
    },
  ];
  for (const r of rows) {
    sql(
      `INSERT INTO orders (id, name, phone, product_id, product_name_snapshot, price_snapshot, size,
         contact_method, telegram_username, note, locale)
       VALUES ('${r.id}', ${q(r.name)}, '09127778899', '${product.id}', ${q(product.name_fa)}, 26000000, 38,
         '${r.method}', ${q(r.tg)}, 'یادداشت', 'fa')`,
    );
  }
  const newCount = sql<{ n: number }>(
    "SELECT COUNT(*) AS n FROM orders WHERE status='new'",
  )[0].n;

  const { context, page } = await adminPage(browser);
  await page.goto("/admin/bookings");
  await expect(page).toHaveURL(/\/admin\/orders$/);
  await expect(page.getByTestId("new-orders-badge")).toHaveText(
    newCount.toLocaleString("fa-IR"),
  );
  await expect(page.getByRole("button", { name: "کپی نشانی" })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/استان|کد پستی|نشانی:/);

  const card = (name: string) => page.locator("li", { hasText: name });
  const phoneCard = card(rows[0].name);
  await expect(
    phoneCard.getByRole("link", { name: "09127778899" }),
  ).toHaveAttribute("href", "tel:09127778899");
  await expect(
    phoneCard.getByRole("link", { name: product.name_fa }),
  ).toHaveAttribute("href", "/fa/products/merlot");
  await expect(phoneCard).toContainText("سایز: ۳۸");
  await expect(phoneCard).toContainText("۲۶٬۰۰۰٬۰۰۰ تومان");
  await expect(phoneCard.getByTestId("contact-method")).toHaveText(
    "تماس تلفنی",
  );
  await expect(
    phoneCard.getByRole("link", { name: "باز کردن واتس‌اپ" }),
  ).toHaveCount(0);

  const waCard = card(rows[1].name);
  await expect(waCard.getByTestId("contact-method")).toHaveText("واتس‌اپ");
  await expect(
    waCard.getByRole("link", { name: "باز کردن واتس‌اپ" }),
  ).toHaveAttribute("href", "https://wa.me/989127778899");

  const tgCard = card(rows[2].name);
  await expect(tgCard.getByTestId("contact-method")).toHaveText("تلگرام");
  await expect(
    tgCard.getByRole("link", { name: "@devino_client" }),
  ).toHaveAttribute("href", "https://t.me/devino_client");

  const select = phoneCard.getByRole("combobox");
  await select.selectOption("contacted");
  await expect
    .poll(
      () =>
        sql<{ status: string }>(
          `SELECT status FROM orders WHERE id='${rows[0].id}'`,
        )[0].status,
    )
    .toBe("contacted");
  await page.reload();
  const badge = page.getByTestId("new-orders-badge");
  if (newCount - 1 > 0)
    await expect(badge).toHaveText((newCount - 1).toLocaleString("fa-IR"));
  else await expect(badge).toHaveCount(0);
  await page.getByRole("link", { name: "تماس گرفته شد" }).click();
  await page.waitForURL(/status=contacted/);
  await expect(card(rows[0].name)).toBeVisible();
  await expect(card(rows[1].name)).toHaveCount(0);
  await context.close();
});

// ---------- follow-up fixes ----------

for (const locale of ["fa", "en"] as const) {
  test(`${locale}: new contact-method label; after submit only the success message and the back link`, async ({
    browser,
  }) => {
    const { context, page } = await visitor(browser);
    await page.goto(`/${locale}/order?product=merlot`);
    await expect(page.locator("legend")).toHaveText(TEXT[locale].methodLegend);

    await fillOrder(
      page,
      { name: `Success ${locale} ${RUN}`, phone: "09121234567" },
      locale,
    );
    await page.getByRole("button", { name: TEXT[locale].submit }).click();
    const status = page.getByRole("status");
    await expect(status).toHaveText(
      TEXT[locale].success(TEXT[locale].successMethod.phone),
    );
    await expect(status).toBeFocused();
    await expect(status).toHaveCSS("text-align", "center");
    // Heading, intro, product summary and form are gone.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
    await expect(
      page.getByText(TEXT[locale].intro, { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByTestId("order-summary")).toHaveCount(0);
    await expect(page.locator("main form")).toHaveCount(0);
    const back = page.getByRole("link", {
      name: locale === "fa" ? "بازگشت به کالکشن‌ها" : "Back to collections",
    });
    await expect(back).toHaveAttribute("href", `/${locale}/collections`);
    // Nothing else visible in the page content.
    expect(
      (await page.locator("main").innerText()).replace(/\s+/g, " ").trim(),
    ).toBe(
      `${TEXT[locale].success(TEXT[locale].successMethod.phone)} ${locale === "fa" ? "بازگشت به کالکشن‌ها" : "Back to collections"}`,
    );
    await context.close();
  });

  test(`${locale}: the footer has no Follow column, Stay Close stays`, async ({
    page,
  }) => {
    const before = sql<{
      telegram_url: string | null;
      instagram_url: string | null;
    }>("SELECT telegram_url, instagram_url FROM site_settings WHERE id = 1")[0];
    sql(
      "UPDATE site_settings SET telegram_url = 'https://t.me/devino', instagram_url = 'https://instagram.com/devinomaison' WHERE id = 1",
    );
    await page.goto(`/${locale}`);
    const footer = page.locator("footer");
    await expect(footer.getByRole("heading")).toHaveText([
      locale === "fa" ? "همراه ما بمانید" : "Stay Close",
    ]);
    await expect(
      footer.getByText(locale === "fa" ? "دنبال کنید" : "Follow", {
        exact: true,
      }),
    ).toHaveCount(0);
    // Each channel appears once (in Stay Close), no longer twice.
    await expect(footer.locator('a[href="https://t.me/devino"]')).toHaveCount(
      1,
    );
    await expect(
      footer.locator('a[href="https://instagram.com/devinomaison"]'),
    ).toHaveCount(1);
    sql(
      `UPDATE site_settings SET telegram_url = ${q(before.telegram_url)}, instagram_url = ${q(before.instagram_url)} WHERE id = 1`,
    );
  });
}

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
