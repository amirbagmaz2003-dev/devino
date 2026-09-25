/**
 * Brief 03 (hero from admin, video, copy, About, gallery, image variants)
 * against the local OpenNext/wrangler preview. D1 and KV are inspected
 * directly through wrangler.
 *
 * Video playback is tested in Chromium with a WebM made in the browser
 * (Playwright's Chromium has no H.264). The MP4/iOS path is covered at
 * the HTTP level only: an 18 MB padded MP4 goes through the real upload,
 * then its /media responses (Range/206/416, Content-Length, ETag/304,
 * HEAD) are checked. Real iPhone playback is a manual check.
 */
import { execFileSync } from "node:child_process";
import { test, expect, type Browser, type Page } from "@playwright/test";

const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const MB = 1024 * 1024;

// ---------- local D1 / KV ----------

function wrangler(args: string[]) {
  return execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * MB,
  });
}

function sql<T = Record<string, unknown>>(command: string): T[] {
  const out = wrangler([
    "d1",
    "execute",
    "devino-db",
    "--local",
    "--json",
    "--command",
    command,
  ]);
  return (JSON.parse(out) as { results: T[] }[])[0]?.results ?? [];
}

/** KV key names starting with `prefix` (names only, values aren't read). */
function kvKeys(prefix: string): string[] {
  const out = wrangler([
    "kv",
    "key",
    "list",
    "--local",
    "--binding",
    "MEDIA",
    "--prefix",
    prefix,
  ]);
  return (JSON.parse(out) as { name: string }[]).map((k) => k.name);
}

function heroRow() {
  return sql<{
    id: string;
    type: string;
    r2_key: string;
    content_type: string;
    focal_x: number;
    focal_y: number;
  }>(
    `SELECT m.id, m.type, m.r2_key, m.content_type, m.focal_x, m.focal_y
     FROM site_settings s JOIN media m ON m.id = s.hero_media_id WHERE s.id = 1`,
  )[0];
}

function mediaGone(media: { id: string; r2_key: string }) {
  expect(sql(`SELECT 1 FROM media WHERE id = '${media.id}'`)).toHaveLength(0);
  expect(kvKeys(media.r2_key)).toEqual([]); // original + :800 + :1600 all gone
}

// ---------- browser helpers ----------

async function adminPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin$/);
  return { context, page };
}

async function makeJpeg(
  page: Page,
  width: number,
  height: number,
): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#000");
      g.addColorStop(1, "#f8f6f0");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = `hsl(${i % 360} 50% 50%)`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 30, 30);
      }
      const blob = await new Promise<Blob>((r) =>
        canvas.toBlob((b) => r(b!), "image/jpeg", 0.92),
      );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let s = "";
      for (let i = 0; i < bytes.length; i += 0x8000)
        s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(s);
    },
    [width, height] as const,
  );
  return Buffer.from(base64, "base64");
}

/** A short, real, Chromium-playable WebM recorded from an animated canvas. */
async function makeWebm(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(30);
    const type = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm;codecs=vp8";
    const recorder = new MediaRecorder(stream, { mimeType: type });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((r) => (recorder.onstop = r));
    recorder.start(100);
    const start = performance.now();
    await new Promise<void>((resolve) => {
      function frame(t: number) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 320, 180);
        ctx.fillStyle = "#f8f6f0";
        ctx.fillRect(((t - start) / 5) % 320, 60, 60, 60);
        if (t - start < 2000) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
    recorder.stop();
    await done;
    const bytes = new Uint8Array(
      await new Blob(chunks, { type: "video/webm" }).arrayBuffer(),
    );
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  return Buffer.from(base64, "base64");
}

/** Padded MP4 of an exact size: a real `ftyp` box, then filler. Not playable — it doesn't need to be. */
function paddedMp4(bytes: number): Buffer {
  const buffer = Buffer.alloc(bytes, 0);
  Buffer.from([
    0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  ]).copy(buffer);
  return buffer;
}

const heroForm = (page: Page) =>
  page.locator("section", {
    has: page.getByRole("heading", { name: "تصویر یا ویدیوی صفحه‌ی اصلی" }),
  });

async function saveHero(page: Page) {
  const form = heroForm(page);
  await form.getByRole("button", { name: "ذخیره", exact: true }).click();
  await expect(
    form.getByRole("button", { name: "ذخیره", exact: true }),
  ).toBeEnabled({ timeout: 60_000 });
}

// ---------- hero ----------

test.describe("hero from admin", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(() => {
    if (!PASSWORD)
      throw new Error("Set ADMIN_PASSWORD (same value as in .dev.vars).");
    const current = heroRow();
    sql("UPDATE site_settings SET hero_media_id = NULL WHERE id = 1");
    if (current) sql(`DELETE FROM media WHERE id = '${current.id}'`);
  });

  test("default fallback in both locales; reduced motion stops the zoom", async ({
    browser,
  }) => {
    for (const locale of ["fa", "en"]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`/${locale}`);
      const img = page.locator("section").first().locator("img");
      await expect(img).toHaveAttribute("src", /hero-editorial-bw\.jpg/);
      expect(
        await img.evaluate((el) => getComputedStyle(el).animationName),
      ).not.toBe("none");
      await context.close();

      const reduced = await browser.newContext({ reducedMotion: "reduce" });
      const rp = await reduced.newPage();
      await rp.goto(`/${locale}`);
      expect(
        await rp
          .locator("section")
          .first()
          .locator("img")
          .evaluate((el) => getComputedStyle(el).animationName),
      ).toBe("none");
      await reduced.close();
    }
    const { context, page } = await adminPage(browser);
    await page.goto("/admin/settings");
    await expect(page.getByTestId("hero-status")).toHaveText("تصویر پیش‌فرض");
    await context.close();
  });

  test("an image hero with a focal point; variants; focal change without re-upload", async ({
    browser,
  }) => {
    const { context, page } = await adminPage(browser);
    await page.goto("/admin/settings");
    await page.setInputFiles('input[name="heroFile"]', {
      name: "hero.jpg",
      mimeType: "image/jpeg",
      buffer: await makeJpeg(page, 3000, 2000),
    });
    const picker = heroForm(page).getByRole("button", {
      name: "برای تعیین نقطه‌ی کانونی روی عکس کلیک کنید",
    });
    const box = (await picker.boundingBox())!;
    await picker.click({
      position: { x: box.width * 0.25, y: box.height * 0.75 },
    });
    await saveHero(page);

    const hero = heroRow();
    expect(hero).toMatchObject({ type: "image", content_type: "image/jpeg" });
    expect(hero.focal_x).toBeCloseTo(0.25, 1);
    expect(hero.focal_y).toBeCloseTo(0.75, 1);
    expect(kvKeys(hero.r2_key).sort()).toEqual([
      hero.r2_key,
      `${hero.r2_key}:1600`,
      `${hero.r2_key}:800`,
    ]);

    // Home: MediaBox reads URL + focal point from the hero row.
    const visitor = await browser.newPage();
    await visitor.goto("/en");
    const img = visitor.locator("section").first().locator("img");
    await expect(img).toHaveAttribute(
      "srcset",
      new RegExp(`/media/${hero.id}\\?w=800 800w`),
    );
    expect(await img.evaluate((el) => el.style.objectPosition)).toMatch(
      /^25(\.\d+)?% 75(\.\d+)?%$/,
    );
    await visitor.close();

    // Focal point only (no new file): same media, new focal point.
    await page.goto("/admin/settings");
    const picker2 = heroForm(page).getByRole("button", {
      name: "برای تعیین نقطه‌ی کانونی روی عکس کلیک کنید",
    });
    const box2 = (await picker2.boundingBox())!;
    await picker2.click({
      position: { x: box2.width * 0.75, y: box2.height * 0.25 },
    });
    await saveHero(page);
    const after = heroRow();
    expect(after.id).toBe(hero.id);
    expect(after.focal_x).toBeCloseTo(0.75, 1);
    expect(after.focal_y).toBeCloseTo(0.25, 1);
    await context.close();
  });

  test("a phone-width viewport downloads the 800px variant", async ({
    browser,
  }) => {
    const hero = heroRow();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const heroResponse = page.waitForResponse((r) =>
      r.url().includes(`/media/${hero.id}`),
    );
    await page.goto("/fa");
    const response = await heroResponse;
    expect(new URL(response.url()).search).toBe("?w=800");
    expect(response.headers()["etag"]).toBe(`"${hero.id}-w800"`);
    await context.close();
  });

  test("switching to a WebM video: autoplays muted and looped, no zoom; old image removed", async ({
    browser,
  }) => {
    const oldHero = heroRow();
    const { context, page } = await adminPage(browser);
    await page.goto("/admin/settings");
    await page.setInputFiles('input[name="heroFile"]', {
      name: "hero.webm",
      mimeType: "video/webm",
      buffer: await makeWebm(page),
    });
    // Video: preview as video, no focal picker.
    await expect(heroForm(page).locator("video")).toBeVisible();
    await expect(
      heroForm(page).getByRole("button", {
        name: "برای تعیین نقطه‌ی کانونی روی عکس کلیک کنید",
      }),
    ).toHaveCount(0);
    await saveHero(page);

    const hero = heroRow();
    expect(hero).toMatchObject({ type: "video", content_type: "video/webm" });
    mediaGone(oldHero);

    for (const locale of ["fa", "en"]) {
      const visitor = await browser.newPage();
      await visitor.goto(`/${locale}`);
      const video = visitor.locator("section").first().locator("video");
      await expect(video).toHaveAttribute("src", `/media/${hero.id}`);
      await expect(
        visitor.locator("section").first().locator("img"),
      ).toHaveCount(0); // no zoom surface
      await expect
        .poll(() =>
          video.evaluate(
            (v: HTMLVideoElement) => v.muted && v.loop && !v.paused,
          ),
        )
        .toBe(true);
      const t1 = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
      await visitor.waitForTimeout(700);
      expect(
        await video.evaluate((v: HTMLVideoElement) => v.currentTime),
      ).not.toBe(t1);
      expect(await video.getAttribute("preload")).toBeNull(); // priority hero
      await visitor.close();
    }

    // Reduced motion: no autoplay, first frame, paused.
    const reduced = await browser.newContext({ reducedMotion: "reduce" });
    const rp = await reduced.newPage();
    await rp.goto("/fa");
    const video = rp.locator("section").first().locator("video");
    await rp.waitForTimeout(1200);
    expect(
      await video.evaluate((v: HTMLVideoElement) => [v.paused, v.currentTime]),
    ).toEqual([true, 0]);
    await reduced.close();
    await context.close();
  });

  test("an 18 MB MP4 is accepted and served with Range/ETag/HEAD; 21 MB is refused", async ({
    browser,
    request,
  }) => {
    const oldHero = heroRow();
    const { context, page } = await adminPage(browser);
    await page.goto("/admin/settings");
    const size = 18 * MB;
    await page.setInputFiles('input[name="heroFile"]', {
      name: "hero.mp4",
      mimeType: "video/mp4",
      buffer: paddedMp4(size),
    });
    await saveHero(page);
    const hero = heroRow();
    expect(hero).toMatchObject({ type: "video", content_type: "video/mp4" });
    mediaGone(oldHero);
    const url = `/media/${hero.id}`;

    // Full GET: fixed length, not chunked.
    const full = await request.get(url);
    expect(full.status()).toBe(200);
    expect(full.headers()["content-length"]).toBe(String(size));
    expect(full.headers()["transfer-encoding"]).toBeUndefined();
    expect(full.headers()["accept-ranges"]).toBe("bytes");
    expect(full.headers()["cache-control"]).toBe(
      "public, max-age=31536000, immutable",
    );
    expect((await full.body()).length).toBe(size);
    const etag = full.headers()["etag"];
    expect(etag).toBe(`"${hero.id}"`);

    const range = async (value: string) =>
      request.get(url, { headers: { Range: value } });
    const first = await range("bytes=0-1");
    expect(first.status()).toBe(206);
    expect(first.headers()["content-range"]).toBe(`bytes 0-1/${size}`);
    expect(first.headers()["content-length"]).toBe("2");
    expect(first.headers()["transfer-encoding"]).toBeUndefined();
    expect([...(await first.body())]).toEqual([0, 0]);

    const open = await range(`bytes=${size - 10}-`);
    expect(open.status()).toBe(206);
    expect(open.headers()["content-range"]).toBe(
      `bytes ${size - 10}-${size - 1}/${size}`,
    );
    expect((await open.body()).length).toBe(10);

    const suffix = await range("bytes=-100");
    expect(suffix.status()).toBe(206);
    expect(suffix.headers()["content-range"]).toBe(
      `bytes ${size - 100}-${size - 1}/${size}`,
    );
    expect(suffix.headers()["content-length"]).toBe("100");

    for (const invalid of [
      `bytes=${size}-`,
      "bytes=5-2",
      "items=0-1",
      "bytes=-0",
    ]) {
      const bad = await range(invalid);
      expect(bad.status(), invalid).toBe(416);
      expect(bad.headers()["content-range"]).toBe(`bytes */${size}`);
    }

    const cached = await request.get(url, {
      headers: { "If-None-Match": etag },
    });
    expect(cached.status()).toBe(304);

    const head = await request.head(url);
    expect(head.status()).toBe(200);
    expect(head.headers()["content-length"]).toBe(String(size));
    expect(head.headers()["accept-ranges"]).toBe("bytes");
    expect((await head.body()).length).toBe(0);

    // 21 MB: refused in the browser, nothing changes.
    await page.goto("/admin/settings");
    await page.setInputFiles('input[name="heroFile"]', {
      name: "big.mp4",
      mimeType: "video/mp4",
      buffer: paddedMp4(21 * MB),
    });
    await expect(
      page.getByText("حجم ویدیو باید کمتر از ۲۰ مگابایت باشد."),
    ).toBeVisible();
    expect(
      await page
        .locator('input[name="heroFile"]')
        .evaluate((i: HTMLInputElement) => i.files?.length),
    ).toBe(0);
    expect(heroRow().id).toBe(hero.id);
    await context.close();
  });

  test("«بازگشت به تصویر پیش‌فرض» clears the hero and deletes its media", async ({
    browser,
  }) => {
    const oldHero = heroRow();
    const { context, page } = await adminPage(browser);
    await page.goto("/admin/settings");
    await heroForm(page)
      .getByRole("button", { name: "بازگشت به تصویر پیش‌فرض" })
      .click();
    await expect(page.getByTestId("hero-status")).toHaveText("تصویر پیش‌فرض");
    expect(heroRow()).toBeUndefined();
    mediaGone(oldHero);
    await page.goto("/fa");
    await expect(
      page.locator("section").first().locator("img"),
    ).toHaveAttribute("src", /hero-editorial-bw\.jpg/);
    await context.close();
  });
});

// ---------- copy & About ----------

const COPY = {
  fa: {
    dir: "rtl",
    tagline: "حضوری از آنِ خودش.",
    statement:
      "برای زنی که هرگز برای دیده‌شدن نمی‌کوشد، و درست به همین دلیل از یاد نمی‌رود.",
    closing: "کمال، در جزئیات زندگی می‌کند.",
    collection: "لباس، حضور را نمی‌سازد؛ کاملش می‌کند.",
    lead: "لباسی که فقط تماشا نمی‌شود؛ گفت‌وگویی را آغاز می‌کند.",
    aboutTitle: "درباره‌ی دوینو",
    headings: ["چرا دوینو", "از سرشانه آغاز می‌کنیم", "نام: از یک جام"],
    aboutClosing:
      "زیبایی از رابطه‌ی زن و لباس زاده می‌شود، نه از غلبه‌ی یکی بر دیگری.",
    aboutDescription: "جهان از لباس خالی نیست.",
    aboutBodyStart: "جهان از لباس خالی نیست. پرسش ما",
  },
  en: {
    dir: "ltr",
    tagline: "A Presence of Her Own.",
    statement:
      "For the woman who never tries to be seen, and for that very reason is never forgotten.",
    closing: "Perfection lives in the details.",
    collection: "A dress doesn't create a presence. It completes one.",
    lead: "Not a dress to be looked at, but one that begins a conversation.",
    aboutTitle: "About deVino",
    headings: [
      "Why deVino",
      "We Begin at the Shoulder",
      "The Name: From a Cup",
    ],
    aboutClosing:
      "Beauty is born of the relationship between a woman and her dress, never from one overpowering the other.",
    aboutDescription: "The world is not short of clothes.",
    aboutBodyStart: "The world is not short of clothes. Our question",
  },
} as const;

for (const locale of ["fa", "en"] as const) {
  test(`${locale}: brand copy and About page, in place and in the right direction`, async ({
    page,
  }) => {
    const c = COPY[locale];
    await page.goto(`/${locale}`);
    await expect(page.locator("html")).toHaveAttribute("dir", c.dir);
    expect(
      await page.locator('meta[name="description"]').getAttribute("content"),
    ).toBe(c.tagline);
    // 1. tagline line directly under the teaser button, heading font, italic.
    const teaser = page.locator("section").nth(1);
    const taglineLine = teaser.locator("p").last();
    await expect(taglineLine).toHaveText(c.tagline);
    await expect(taglineLine).toHaveCSS("font-style", "italic");
    const buttonBox = (await teaser.getByRole("link").boundingBox())!;
    expect((await taglineLine.boundingBox())!.y).toBeGreaterThan(
      buttonBox.y + buttonBox.height,
    );
    // 2. statement: black section, pearl-white text.
    const statement = page.locator("section").nth(2);
    await expect(statement).toHaveText(c.statement);
    await expect(statement).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(statement.locator("p")).toHaveCSS(
      "color",
      "rgb(248, 246, 240)",
    );
    // 3. closing line with the olive rule, just above the footer.
    const closing = page.locator("section").nth(3);
    await expect(closing.locator("p")).toHaveText(c.closing);
    await expect(closing.locator("p")).toHaveCSS("font-style", "italic");
    await expect(closing.locator("span[aria-hidden]")).toHaveCSS(
      "background-color",
      "rgb(85, 107, 47)",
    );
    expect(await closing.evaluate((el) => el.nextElementSibling)).toBeNull();

    await page.goto(`/${locale}/collections/first-harvest`);
    const line = page.getByText(c.collection, { exact: true });
    await expect(line).toBeVisible();
    await expect(line).toHaveCSS("font-style", "italic");

    await page.goto(`/${locale}/contact`);
    const lead = page.getByText(c.lead, { exact: true });
    await expect(lead).toHaveCSS("font-style", "italic");
    const leadY = (await lead.boundingBox())!.y;
    const intro = page.locator("p", {
      hasText: locale === "fa" ? "برای دیدن و پوشیدن" : "To see and try on",
    });
    expect((await intro.boundingBox())!.y).toBeGreaterThan(leadY);

    await page.goto(`/${locale}/about`);
    await expect(page.locator("html")).toHaveAttribute("dir", c.dir);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      c.aboutTitle,
    );
    await expect(page.locator("article").getByRole("heading", { level: 2 })).toHaveText([
      ...c.headings,
    ]);
    await expect(page.locator("article section p").first()).toContainText(
      c.aboutBodyStart,
    );
    const aboutClosing = page.getByText(c.aboutClosing, { exact: true });
    await expect(aboutClosing).toHaveCSS("font-style", "italic");
    await expect(aboutClosing).toHaveCSS("text-align", "center");
    expect(
      await page.locator('meta[name="description"]').getAttribute("content"),
    ).toBe(c.aboutDescription);
  });
}

// ---------- gallery & variants ----------

test.describe("gallery and image variants", () => {
  test.describe.configure({ mode: "serial" });

  test("gallery: empty submit shows the error; an upload adds the image with variants; removing it deletes all", async ({
    browser,
  }) => {
    const product = sql<{ id: string }>(
      "SELECT id FROM products WHERE slug = 'merlot'",
    )[0];
    const { context, page } = await adminPage(browser);
    await page.goto(`/admin/products/${product.id}/edit`);
    await expect(
      page.getByText(
        "عکس جدید را اینجا انتخاب کنید و دکمه‌ی پایین همین بخش را بزنید؛ دکمه‌ی «ذخیره»ی بالای صفحه فقط مشخصات محصول را ذخیره می‌کند.",
      ),
    ).toBeVisible();
    const add = page.getByRole("button", { name: "افزودن این عکس به گالری" });
    await add.click();
    await expect(page.getByText("لطفاً یک عکس انتخاب کنید.")).toBeVisible();

    const before = sql<{ media_id: string }>(
      `SELECT media_id FROM product_media WHERE product_id = '${product.id}'`,
    );
    await page.setInputFiles('input[name="imageFile"]', {
      name: "gallery.jpg",
      mimeType: "image/jpeg",
      buffer: await makeJpeg(page, 2000, 2600),
    });
    await expect(
      page.getByRole("button", {
        name: "برای تعیین نقطه‌ی کانونی روی عکس کلیک کنید",
      }),
    ).toBeVisible();
    await add.click();
    await expect(page.locator("ul img")).toHaveCount(before.length + 1);

    const added = sql<{ id: string; r2_key: string }>(
      `SELECT m.id, m.r2_key FROM media m JOIN product_media pm ON pm.media_id = m.id
       WHERE pm.product_id = '${product.id}' AND m.id NOT IN (${before.map((b) => `'${b.media_id}'`).join(",") || "''"})`,
    )[0];
    expect(kvKeys(added.r2_key).sort()).toEqual([
      added.r2_key,
      `${added.r2_key}:1600`,
      `${added.r2_key}:800`,
    ]);
    // 800 variant is 800px wide, 1600 is 1600px wide.
    for (const width of [800, 1600]) {
      const dims = await page.evaluate(
        async ([id, w]) => {
          const blob = await (await fetch(`/media/${id}?w=${w}`)).blob();
          const bmp = await createImageBitmap(blob);
          return bmp.width;
        },
        [added.id, width] as const,
      );
      expect(dims).toBe(width);
    }

    // Remove it again: row, original and both variants go.
    const cards = page.locator("ul li");
    await cards.nth(before.length).getByRole("button", { name: "حذف" }).click();
    await expect(page.locator("ul img")).toHaveCount(before.length);
    mediaGone(added);
    await context.close();
  });

  test("old images fall back to the original; the backfill button creates their variants", async ({
    browser,
    request,
  }) => {
    // Make one existing image "old": no variants in KV.
    const old = sql<{ id: string; r2_key: string }>(
      "SELECT m.id, m.r2_key FROM media m JOIN product_media pm ON pm.media_id = m.id WHERE m.type = 'image' LIMIT 1",
    )[0];
    for (const width of [800, 1600]) {
      wrangler([
        "kv",
        "key",
        "delete",
        "--local",
        "--binding",
        "MEDIA",
        `${old.r2_key}:${width}`,
      ]);
    }
    const original = await request.get(`/media/${old.id}`);
    const fallback = await request.get(`/media/${old.id}?w=800`);
    expect(fallback.status()).toBe(200);
    expect(fallback.headers()["etag"]).toBe(`"${old.id}"`);
    expect(fallback.headers()["content-length"]).toBe(
      original.headers()["content-length"],
    );

    const { context, page } = await adminPage(browser);
    await page.goto("/admin/settings");
    await page
      .getByRole("button", { name: "ساخت نسخه‌های کوچک برای عکس‌های قبلی" })
      .click();
    await expect(
      page.getByText(/نسخه‌های کوچک برای [۰-۹]+ عکس ساخته شد\./),
    ).toBeVisible({ timeout: 90_000 });
    expect(kvKeys(`${old.r2_key}:`).sort()).toEqual([
      `${old.r2_key}:1600`,
      `${old.r2_key}:800`,
    ]);

    const variant = await request.get(`/media/${old.id}?w=800`);
    expect(variant.headers()["etag"]).toBe(`"${old.id}-w800"`);
    expect(variant.headers()["content-type"]).toBe("image/jpeg");

    // Nothing left to do on a second run.
    await page
      .getByRole("button", { name: "ساخت نسخه‌های کوچک برای عکس‌های قبلی" })
      .click();
    await expect(
      page.getByText("همه‌ی عکس‌ها از قبل نسخه‌ی کوچک دارند."),
    ).toBeVisible({ timeout: 30_000 });
    await context.close();
  });
});
