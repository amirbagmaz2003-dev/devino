/**
 * Brief 01 (admin hardening) end-to-end checks. Runs against the local
 * OpenNext/wrangler preview (`npm run preview`) and inspects the *local*
 * D1 database and KV namespace directly through wrangler, so every
 * "nothing changed / nothing orphaned" claim is checked at the source.
 *
 * Needs: `npm run db:migrate:local`, a .dev.vars with ADMIN_PASSWORD and
 * SESSION_SECRET, and at least one collection that has products (the
 * blocked-delete test uses it). Run with `npm run test:e2e`.
 */
import { execFileSync } from "node:child_process";
import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const RUN = Date.now().toString(36);
let ipCounter = 0;

test.describe.configure({ mode: "default" });
test.beforeAll(() => {
  if (!PASSWORD) throw new Error("Set ADMIN_PASSWORD (same value as in .dev.vars).");
});

// ---------- local D1 / KV helpers ----------

function wrangler(args: string[]): string {
  return execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function sql<T = Record<string, unknown>>(command: string): T[] {
  const out = wrangler(["d1", "execute", "devino-db", "--local", "--json", "--command", command]);
  const parsed = JSON.parse(out) as { results: T[] }[];
  return parsed[0]?.results ?? [];
}

function kvHas(key: string): boolean {
  try {
    const out = wrangler(["kv", "key", "get", "--local", "--binding", "MEDIA", key]);
    return !/Value not found/i.test(out);
  } catch {
    return false;
  }
}

/** Media rows nothing points at — the thing this brief is about eliminating. */
function orphanCount(): number {
  return sql<{ n: number }>(
    `SELECT COUNT(*) AS n FROM media
     WHERE id NOT IN (SELECT media_id FROM product_media)
       AND id NOT IN (SELECT cover_media_id FROM collections WHERE cover_media_id IS NOT NULL)`,
  )[0].n;
}

function mediaRow(id: string) {
  return sql<{ id: string; r2_key: string }>(`SELECT id, r2_key FROM media WHERE id = '${id}'`)[0];
}

// ---------- browser helpers ----------

/** Each context gets its own CF-Connecting-IP so rate-limit state never leaks between tests. */
function nextIp() {
  return `203.0.113.${(++ipCounter % 250) + 1}-${RUN}`;
}

async function newContext(browser: Browser, ip = nextIp()): Promise<BrowserContext> {
  return browser.newContext({ extraHTTPHeaders: { "cf-connecting-ip": ip } });
}

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin$/);
}

async function adminPage(browser: Browser) {
  const context = await newContext(browser);
  const page = await context.newPage();
  await login(page);
  return { context, page };
}

/** A small real JPEG, drawn in the browser. */
async function makeJpeg(page: Page, width: number, height: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "#000");
      gradient.addColorStop(1, "#f8f6f0");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      // Noise, so the JPEG is realistically large rather than a few KB.
      for (let i = 0; i < 4000; i++) {
        ctx.fillStyle = `hsl(${i % 360} 60% 50%)`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 40, 40);
      }
      const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/jpeg", 0.95));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(binary);
    },
    [width, height] as const,
  );
  return Buffer.from(base64, "base64");
}

async function chooseImage(page: Page, name: string, buffer: Buffer, fileInput = "input[type=file]") {
  await page.setInputFiles(fileInput, { name, mimeType: "image/jpeg", buffer });
  // The picker resizes asynchronously; its preview appears once done.
  await expect(page.locator('[aria-label="برای تعیین نقطه‌ی کانونی روی عکس کلیک کنید"]')).toBeVisible();
}

async function createCollection(page: Page, slug: string, cover: Buffer) {
  await page.goto("/admin/collections/new");
  await page.fill("input[name=nameFa]", `کالکشن ${slug}`);
  await page.fill("input[name=nameEn]", `Collection ${slug}`);
  await page.fill("input[name=slug]", slug);
  await chooseImage(page, `${slug}.jpg`, cover);
  await page.click("main button[type=submit]");
  await page.waitForURL(/\/admin\/collections$/);
  return sql<{ id: string; cover_media_id: string }>(
    `SELECT id, cover_media_id FROM collections WHERE slug = '${slug}'`,
  )[0];
}

/**
 * Deletes an (empty) collection through the admin UI, so the app's own
 * cleanup runs, and checks its cover media (row + KV value) went with it.
 */
async function deleteCollectionViaUi(page: Page, slug: string) {
  const row = sql<{ cover_media_id: string | null }>(
    `SELECT cover_media_id FROM collections WHERE slug = '${slug}'`,
  )[0];
  const cover = row.cover_media_id ? mediaRow(row.cover_media_id) : undefined;
  await page.goto("/admin/collections");
  page.once("dialog", (dialog) => void dialog.accept());
  const item = page.locator("li", { hasText: `/${slug}` });
  await item.getByRole("button", { name: "حذف" }).click();
  await expect(item).toHaveCount(0);
  expect(sql(`SELECT 1 FROM collections WHERE slug = '${slug}'`)).toHaveLength(0);
  if (cover) {
    expect(mediaRow(cover.id)).toBeUndefined();
    expect(kvHas(cover.r2_key)).toBe(false);
  }
}

// ---------- tests ----------

test("login is rate limited per IP after 5 failures, then unlocks after 15 minutes", async ({
  browser,
}) => {
  const ip = nextIp();
  const context = await newContext(browser, ip);
  const page = await context.newPage();
  await page.goto("/admin/login");

  for (let attempt = 1; attempt <= 5; attempt++) {
    await page.fill("#password", `wrong-${attempt}`);
    await page.click("button[type=submit]");
    const expected =
      attempt < 5
        ? "رمز عبور اشتباه است."
        : "تعداد تلاش‌های ناموفق زیاد بود. لطفاً ۱۵ دقیقه دیگر دوباره امتحان کنید.";
    await expect(page.locator("form [role=alert]")).toHaveText(expected);
  }

  // Locked: even the right password is refused and no session is issued.
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await expect(page.locator("form [role=alert]")).toHaveText(
    "تعداد تلاش‌های ناموفق زیاد بود. لطفاً ۱۵ دقیقه دیگر دوباره امتحان کنید.",
  );
  expect((await context.cookies()).some((c) => c.name === "devino_admin_session")).toBe(false);

  // Another IP is unaffected.
  const other = await adminPage(browser);
  await other.context.close();

  // Age this IP's failures by 16 minutes: the lock has expired.
  sql(`UPDATE login_attempts SET attempted_at = attempted_at - 960000 WHERE ip = '${ip}'`);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin$/);
  expect(sql(`SELECT 1 FROM login_attempts WHERE ip = '${ip}'`)).toHaveLength(0);
  await context.close();
});

test("an unauthenticated server-action call is rejected and changes nothing", async ({
  browser,
  playwright,
}) => {
  const { context, page } = await adminPage(browser);
  const slug = `auth-probe-${RUN}`;
  sql(
    `INSERT INTO products (id, slug, name_fa, name_en, price) VALUES ('${slug}', '${slug}', 'پروب', 'Probe', 1)`,
  );

  // Capture (and abort) the real delete request the logged-in UI would send.
  await page.goto("/admin/products");
  let captured: { headers: Record<string, string>; body: Buffer } | null = null;
  await page.route("**/admin/products", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      captured = { headers: request.headers(), body: request.postDataBuffer() ?? Buffer.alloc(0) };
      await route.abort();
    } else {
      await route.continue();
    }
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator("li", { hasText: "Probe" })
    .getByRole("button", { name: "حذف" })
    .click();
  await expect.poll(() => captured).not.toBeNull();
  expect(sql(`SELECT 1 FROM products WHERE id = '${slug}'`)).toHaveLength(1);

  // Replay it byte-for-byte, minus the session cookie.
  const anonymous = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL });
  const { cookie: _cookie, ...headers } = captured!.headers;
  void _cookie;
  const response = await anonymous.post("/admin/products", {
    headers,
    data: captured!.body,
    maxRedirects: 0,
  });
  expect(response.headers()["x-action-redirect"] ?? response.headers()["location"] ?? "").toContain(
    "/admin/login",
  );
  expect(sql(`SELECT 1 FROM products WHERE id = '${slug}'`)).toHaveLength(1);

  sql(`DELETE FROM products WHERE id = '${slug}'`);
  await anonymous.dispose();
  await context.close();
});

test("double-clicking create makes exactly one collection and no orphaned media", async ({
  browser,
}) => {
  const { context, page } = await adminPage(browser);
  const slug = `double-${RUN}`;
  const orphansBefore = orphanCount();

  await page.goto("/admin/collections/new");
  await page.fill("input[name=nameFa]", "دوبار");
  await page.fill("input[name=nameEn]", "Double");
  await page.fill("input[name=slug]", slug);
  await chooseImage(page, "double.jpg", await makeJpeg(page, 800, 1000));
  await page.locator("main button[type=submit]").dblclick();
  await page.waitForURL(/\/admin\/collections$/);

  const rows = sql<{ cover_media_id: string }>(
    `SELECT cover_media_id FROM collections WHERE slug = '${slug}'`,
  );
  expect(rows).toHaveLength(1);
  expect(orphanCount()).toBe(orphansBefore);

  // Server side too: two identical submissions racing each other (no
  // client guard at all) still leave one row and no orphan.
  const slug2 = `race-${RUN}`;
  await page.goto("/admin/collections/new");
  await page.fill("input[name=nameFa]", "مسابقه");
  await page.fill("input[name=nameEn]", "Race");
  await page.fill("input[name=slug]", slug2);
  await chooseImage(page, "race.jpg", await makeJpeg(page, 600, 800));
  const actionRequests: Promise<unknown>[] = [];
  await page.route("**/admin/collections/new", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      const replay = page.request.post(request.url(), {
        headers: request.headers(),
        data: request.postDataBuffer()!,
        maxRedirects: 0,
      });
      actionRequests.push(replay);
      await Promise.all([route.continue(), replay]);
    } else {
      await route.continue();
    }
  });
  await page.click("main button[type=submit]");
  await page.waitForURL(/\/admin\/collections$/);
  await Promise.all(actionRequests);
  expect(sql(`SELECT 1 FROM collections WHERE slug = '${slug2}'`)).toHaveLength(1);
  expect(orphanCount()).toBe(orphansBefore);

  await deleteCollectionViaUi(page, slug);
  await deleteCollectionViaUi(page, slug2);
  expect(orphanCount()).toBe(orphansBefore);
  await context.close();
});

test("duplicate slug shows the message under the field and keeps typed values", async ({
  browser,
}) => {
  const { context, page } = await adminPage(browser);
  const existing = sql<{ slug: string }>("SELECT slug FROM collections LIMIT 1")[0].slug;
  const orphansBefore = orphanCount();
  const mediaBefore = sql<{ n: number }>("SELECT COUNT(*) AS n FROM media")[0].n;

  await page.goto("/admin/collections/new");
  await page.fill("input[name=nameFa]", "تکراری");
  await page.fill("input[name=nameEn]", "Duplicate");
  await page.fill("input[name=slug]", existing);
  await page.fill("textarea[name=descriptionEn]", "kept text");
  await chooseImage(page, "dup.jpg", await makeJpeg(page, 600, 800));
  await page.click("main button[type=submit]");

  await expect(
    page.getByText(
      "این آدرس (اسلاگ) قبلاً برای یک مورد دیگر استفاده شده. لطفاً یک آدرس دیگر وارد کنید.",
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/collections\/new$/);
  await expect(page.locator("input[name=nameEn]")).toHaveValue("Duplicate");
  await expect(page.locator("textarea[name=descriptionEn]")).toHaveValue("kept text");
  expect(await page.locator("input[type=file]").evaluate((i: HTMLInputElement) => i.files?.length)).toBe(1);
  // Validation ran before the upload: no file was stored at all.
  expect(sql<{ n: number }>("SELECT COUNT(*) AS n FROM media")[0].n).toBe(mediaBefore);
  expect(orphanCount()).toBe(orphansBefore);
  await context.close();
});

test("a collection with products can't be deleted; an empty one asks first", async ({
  browser,
}) => {
  const { context, page } = await adminPage(browser);
  const withProducts = sql<{ id: string; name_fa: string }>(
    `SELECT c.id, c.name_fa FROM collections c
     WHERE EXISTS (SELECT 1 FROM products p WHERE p.collection_id = c.id) LIMIT 1`,
  )[0];
  expect(withProducts, "needs a collection that has products").toBeTruthy();

  await page.goto("/admin/collections");
  let dialogs = 0;
  page.on("dialog", (dialog) => {
    dialogs++;
    void dialog.dismiss();
  });
  const row = page.locator("li", { hasText: withProducts.name_fa }).first();
  await row.getByRole("button", { name: "حذف" }).click();
  await expect(
    row.getByText(
      "این کالکشن هنوز محصول دارد. اول محصولاتش را به کالکشن دیگری منتقل یا حذف کنید.",
    ),
  ).toBeVisible();
  expect(dialogs).toBe(0);
  expect(sql(`SELECT 1 FROM collections WHERE id = '${withProducts.id}'`)).toHaveLength(1);
  page.removeAllListeners("dialog");

  // Empty collection: confirm text, cancel keeps it, accept deletes it and its cover.
  const slug = `empty-${RUN}`;
  const created = await createCollection(page, slug, await makeJpeg(page, 600, 800));
  const cover = mediaRow(created.cover_media_id);
  const emptyRow = page.locator("li", { hasText: `Collection ${slug}` });
  let message = "";
  page.once("dialog", (dialog) => {
    message = dialog.message();
    void dialog.dismiss();
  });
  await emptyRow.getByRole("button", { name: "حذف" }).click();
  await expect.poll(() => message).toBe("این کالکشن برای همیشه حذف می‌شود. مطمئنید؟");
  expect(sql(`SELECT 1 FROM collections WHERE slug = '${slug}'`)).toHaveLength(1);

  page.once("dialog", (dialog) => void dialog.accept());
  await emptyRow.getByRole("button", { name: "حذف" }).click();
  await expect(emptyRow).toHaveCount(0);
  expect(sql(`SELECT 1 FROM collections WHERE slug = '${slug}'`)).toHaveLength(0);
  expect(mediaRow(cover.id)).toBeUndefined();
  expect(kvHas(cover.r2_key)).toBe(false);
  await context.close();
});

test("price/stock accept Persian and Arabic digits, show separators, ignore the wheel", async ({
  browser,
}) => {
  const { context, page } = await adminPage(browser);
  const slug = `price-${RUN}`;
  await page.goto("/admin/products/new");
  await page.fill("input[name=nameFa]", "قیمت");
  await page.fill("input[name=nameEn]", "Price");
  await page.fill("input[name=slug]", slug);

  const price = page.locator("input[name=price]");
  await price.fill("");
  await price.pressSequentially("۲۶۰۰۰۰۰۰");
  await expect(price).toHaveValue("26,000,000");
  await expect(price).toHaveAttribute("inputmode", "numeric");
  await price.hover();
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 120);
  await price.focus();
  await page.mouse.wheel(0, -120);
  await expect(price).toHaveValue("26,000,000");

  const stock = page.locator("input[name=stockCount]");
  await stock.pressSequentially("٣٥");
  await expect(stock).toHaveValue("35");

  await page.click("main button[type=submit]");
  await page.waitForURL(/\/admin\/products\/.+\/edit$/);
  const row = sql<{ price: number; stock_count: number }>(
    `SELECT price, stock_count FROM products WHERE slug = '${slug}'`,
  )[0];
  expect(row).toEqual({ price: 26000000, stock_count: 35 });

  // Empty price is refused with the brief's message, nothing saved.
  await page.goto("/admin/products/new");
  await page.fill("input[name=nameFa]", "بی‌قیمت");
  await page.fill("input[name=nameEn]", "No price");
  await page.fill("input[name=slug]", `noprice-${RUN}`);
  await page.locator("input[name=price]").evaluate((i: HTMLInputElement) => i.removeAttribute("required"));
  await page.locator("input[name=price]").fill("");
  await page.click("main button[type=submit]");
  await expect(page.getByText("قیمت را فقط به‌صورت عدد وارد کنید.")).toBeVisible();
  expect(sql(`SELECT 1 FROM products WHERE slug = 'noprice-${RUN}'`)).toHaveLength(0);

  sql(`DELETE FROM products WHERE slug = '${slug}'`);
  await context.close();
});

test("social handles are normalized to full URLs on save", async ({ browser }) => {
  const { context, page } = await adminPage(browser);
  const before = sql<{ telegram_url: string | null; instagram_url: string | null }>(
    "SELECT telegram_url, instagram_url FROM site_settings WHERE id = 1",
  )[0];
  const cases: [string, string, string, string][] = [
    ["devinomaison", "@devino_shop", "https://instagram.com/devinomaison", "https://t.me/devino_shop"],
    ["@devinomaison", "devino_shop", "https://instagram.com/devinomaison", "https://t.me/devino_shop"],
    [
      "https://www.instagram.com/devinomaison/",
      "https://t.me/devino_shop",
      "https://www.instagram.com/devinomaison/",
      "https://t.me/devino_shop",
    ],
  ];
  for (const [instagram, telegram, wantInstagram, wantTelegram] of cases) {
    await page.goto("/admin/settings");
    await page.fill("input[name=instagramUrl]", instagram);
    await page.fill("input[name=telegramUrl]", telegram);
    await page.click("main button[type=submit]");
    // The form refreshes to the normalized, saved values.
    await expect(page.locator("input[name=instagramUrl]")).toHaveValue(wantInstagram);
    await expect(page.locator("input[name=telegramUrl]")).toHaveValue(wantTelegram);
    expect(
      sql("SELECT instagram_url, telegram_url FROM site_settings WHERE id = 1")[0],
    ).toEqual({ instagram_url: wantInstagram, telegram_url: wantTelegram });
  }
  const q = (v: string | null) => (v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`);
  sql(
    `UPDATE site_settings SET instagram_url = ${q(before.instagram_url)}, telegram_url = ${q(before.telegram_url)} WHERE id = 1`,
  );
  await context.close();
});

test("large images are resized in the browser; >15 MB is refused", async ({ browser }) => {
  const { context, page } = await adminPage(browser);
  await page.goto("/admin/products/new");

  // Over the cap: refused before resizing, input cleared.
  await page.setInputFiles("input[type=file]", {
    name: "huge.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(15 * 1024 * 1024 + 1, 1),
  });
  await expect(page.getByText("حجم فایل بیش از حد مجاز است (حداکثر ۱۵ مگابایت).")).toBeVisible();
  expect(await page.locator("input[type=file]").evaluate((i: HTMLInputElement) => i.files?.length)).toBe(0);

  // 4000×3000 -> long edge 2400, JPEG, and the focal point is set on it.
  const slug = `resize-${RUN}`;
  const original = await makeJpeg(page, 4000, 3000);
  await page.fill("input[name=nameFa]", "بزرگ");
  await page.fill("input[name=nameEn]", "Large");
  await page.fill("input[name=slug]", slug);
  await page.fill("input[name=price]", "1000");
  await chooseImage(page, "large.png", original);
  const chosen = await page
    .locator("input[type=file]")
    .evaluate(async (i: HTMLInputElement) => {
      const f = i.files![0];
      const bmp = await createImageBitmap(f);
      return { type: f.type, name: f.name, size: f.size, w: bmp.width, h: bmp.height };
    });
  expect(chosen).toMatchObject({ type: "image/jpeg", name: "large.jpg", w: 2400, h: 1800 });
  expect(chosen.size).toBeLessThan(original.length);

  const picker = page.locator('[aria-label="برای تعیین نقطه‌ی کانونی روی عکس کلیک کنید"]');
  const box = (await picker.boundingBox())!;
  // locator.click scrolls the picker into view first (it can sit below the fold).
  await picker.click({ position: { x: box.width * 0.25, y: box.height * 0.75 } });
  await page.click("main button[type=submit]");
  await page.waitForURL(/\/admin\/products\/.+\/edit$/);

  const media = sql<{ id: string; content_type: string; focal_x: number; focal_y: number }>(
    `SELECT m.id, m.content_type, m.focal_x, m.focal_y FROM media m
     JOIN product_media pm ON pm.media_id = m.id
     JOIN products p ON p.id = pm.product_id WHERE p.slug = '${slug}'`,
  )[0];
  expect(media.content_type).toBe("image/jpeg");
  expect(media.focal_x).toBeCloseTo(0.25, 1);
  expect(media.focal_y).toBeCloseTo(0.75, 1);
  const served = await page.evaluate(async (id) => {
    const blob = await (await fetch(`/media/${id}`)).blob();
    const bmp = await createImageBitmap(blob);
    return { w: bmp.width, h: bmp.height };
  }, media.id);
  expect(served).toEqual({ w: 2400, h: 1800 });
  await context.close();
});

test("replacing a cover and deleting a product remove the old media (row + KV)", async ({
  browser,
}) => {
  const { context, page } = await adminPage(browser);

  // Cover replacement.
  const slug = `cover-${RUN}`;
  const created = await createCollection(page, slug, await makeJpeg(page, 600, 800));
  const oldCover = mediaRow(created.cover_media_id);
  expect(kvHas(oldCover.r2_key)).toBe(true);
  await page.goto(`/admin/collections/${created.id}/edit`);
  await chooseImage(page, "new-cover.jpg", await makeJpeg(page, 700, 900));
  await page.click("main button[type=submit]");
  await page.waitForURL(/\/admin\/collections$/);
  const newCoverId = sql<{ cover_media_id: string }>(
    `SELECT cover_media_id FROM collections WHERE id = '${created.id}'`,
  )[0].cover_media_id;
  expect(newCoverId).not.toBe(oldCover.id);
  expect(mediaRow(oldCover.id)).toBeUndefined();
  expect(kvHas(oldCover.r2_key)).toBe(false);
  expect(kvHas(mediaRow(newCoverId).r2_key)).toBe(true);

  // Product delete with a two-image gallery.
  const productSlug = `gallery-${RUN}`;
  await page.goto("/admin/products/new");
  await page.fill("input[name=nameFa]", "گالری");
  await page.fill("input[name=nameEn]", `Gallery ${RUN}`);
  await page.fill("input[name=slug]", productSlug);
  await page.fill("input[name=price]", "5000");
  await chooseImage(page, "g1.jpg", await makeJpeg(page, 600, 800));
  await page.click("main button[type=submit]");
  await page.waitForURL(/\/admin\/products\/.+\/edit$/);
  await chooseImage(page, "g2.jpg", await makeJpeg(page, 600, 800));
  await page.getByRole("button", { name: "افزودن عکس" }).click();
  await expect(page.locator("ul img")).toHaveCount(2);

  const media = sql<{ id: string; r2_key: string }>(
    `SELECT m.id, m.r2_key FROM media m JOIN product_media pm ON pm.media_id = m.id
     JOIN products p ON p.id = pm.product_id WHERE p.slug = '${productSlug}'`,
  );
  expect(media).toHaveLength(2);
  expect(media.every((m) => kvHas(m.r2_key))).toBe(true);

  await page.goto("/admin/products");
  let message = "";
  page.once("dialog", (dialog) => {
    message = dialog.message();
    void dialog.accept();
  });
  const row = page.locator("li", { hasText: `Gallery ${RUN}` });
  await row.getByRole("button", { name: "حذف" }).click();
  await expect(row).toHaveCount(0);
  expect(message).toBe("این محصول و عکس‌هایش برای همیشه حذف می‌شوند. مطمئنید؟");
  expect(sql(`SELECT 1 FROM products WHERE slug = '${productSlug}'`)).toHaveLength(0);
  for (const m of media) {
    expect(mediaRow(m.id)).toBeUndefined();
    expect(kvHas(m.r2_key)).toBe(false);
  }

  // Tidy up the collection created above (empty, so deletable) — via the
  // app, which must also remove its current cover.
  await deleteCollectionViaUi(page, slug);
  await context.close();
});

test("product list flags products without image or collection", async ({ browser }) => {
  const { context, page } = await adminPage(browser);
  const slug = `badges-${RUN}`;
  sql(
    `INSERT INTO products (id, slug, name_fa, name_en, price) VALUES ('${slug}', '${slug}', 'نشان', 'Badges ${RUN}', 1)`,
  );
  await page.goto("/admin/products");
  const row = page.locator("li", { hasText: `Badges ${RUN}` });
  await expect(row.getByText("بدون عکس", { exact: true })).toBeVisible();
  await expect(row.getByText("بدون کالکشن", { exact: true })).toBeVisible();
  sql(`DELETE FROM products WHERE id = '${slug}'`);
  await context.close();
});
