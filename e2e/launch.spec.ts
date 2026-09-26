/**
 * Brief 05 (launch preparation), fa and en, against the local preview.
 */
import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";

const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const TOKEN = "7dba1a33ba54456a891a2fb0becbb661";

const TERMS = {
  fa: {
    title: "قوانین و حریم خصوصی",
    intro:
      "برای ما، اعتماد شما هم به اندازه‌ی جزئیات یک لباس اهمیت دارد. این صفحه توضیح می‌دهد سفارش در دوینو چگونه انجام می‌شود و با اطلاعات شما چه می‌کنیم.",
    headings: [
      "روند سفارش",
      "قیمت، سایز و رنگ",
      "اطلاعات شما",
      "آمار بازدید",
      "تماس با ما",
    ],
    firstStep: "لباس مورد نظر را انتخاب می‌کنید و فرم ثبت سفارش را پر می‌کنید.",
    contactLink: "راه‌های تماس",
    updated: "آخرین به‌روزرسانی: مهر ۱۴۰۵",
    privacyNote: "اطلاعات شما فقط برای پیگیری سفارش استفاده می‌شود.",
    contactTitle: "تماس با ما",
  },
  en: {
    title: "Terms & Privacy",
    intro:
      "Your trust matters to us as much as the details of a dress. This page explains how ordering works at deVino and what we do with your information.",
    headings: [
      "How ordering works",
      "Prices, sizes and colors",
      "Your information",
      "Visit statistics",
      "Contact us",
    ],
    firstStep: "You choose a piece and fill in the order form.",
    contactLink: "contact channels",
    updated: "Last updated: September 2026",
    privacyNote: "Your information is used only to follow up on your order.",
    contactTitle: "Contact",
  },
} as const;

for (const locale of ["fa", "en"] as const) {
  const c = TERMS[locale];

  test(`${locale}: terms page copy, metadata and contact link`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/terms`);
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      locale === "fa" ? "rtl" : "ltr",
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(c.title);
    await expect(
      page.locator("article").getByRole("heading", { level: 2 }),
    ).toHaveText([...c.headings]);
    await expect(page.getByText(c.intro, { exact: true })).toBeVisible();
    await expect(page.locator("article ol li")).toHaveCount(4);
    await expect(page.locator("article ol li").first()).toHaveText(c.firstStep);
    await expect(page.getByText(c.updated, { exact: true })).toBeVisible();
    await expect(page).toHaveTitle(`${c.title} | deVino`);
    expect(
      await page.locator('meta[name="description"]').getAttribute("content"),
    ).toBe(c.intro);
    expect(await page.locator('meta[name="robots"]').count()).toBe(0); // indexable (robots.txt still gates it)
    await page.getByRole("link", { name: c.contactLink, exact: true }).click();
    await page.waitForURL(new RegExp(`/${locale}/contact$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      c.contactTitle,
    );
  });

  test(`${locale}: footer and order-page links to the terms page`, async ({
    page,
  }) => {
    await page.goto(`/${locale}`);
    await page.locator("footer").getByRole("link", { name: c.title }).click();
    await page.waitForURL(new RegExp(`/${locale}/terms$`));

    await page.goto(`/${locale}/order?product=merlot`);
    const note = page.locator("form p", { hasText: c.privacyNote });
    await expect(note).toBeVisible();
    // Directly under the submit button.
    const [button, noteBox] = await Promise.all([
      page.locator("form button[type=submit]").boundingBox(),
      note.boundingBox(),
    ]);
    expect(noteBox!.y).toBeGreaterThan(button!.y + button!.height - 1);
    await note.getByRole("link", { name: c.title }).click();
    await page.waitForURL(new RegExp(`/${locale}/terms$`));
  });

  test(`${locale}: icons and the default OG image are declared and served`, async ({
    page,
    request,
  }) => {
    await page.goto(`/${locale}`);
    const icon = page.locator('link[rel="icon"]');
    const hrefs = await icon.evaluateAll((links) =>
      links.map((l) => (l as HTMLLinkElement).getAttribute("href")!),
    );
    expect(hrefs.some((h) => h.startsWith("/icon.png"))).toBe(true);
    expect(hrefs.some((h) => h.startsWith("/favicon.ico"))).toBe(true);
    const apple = await page
      .locator('link[rel="apple-touch-icon"]')
      .getAttribute("href");
    expect(apple).toMatch(/^\/apple-icon\.png/);
    for (const href of [...hrefs, apple!]) {
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
      expect(response.headers()["content-type"]).toMatch(/image/);
    }
    const og = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(og).toMatch(new RegExp(`/og/og-${locale}\\.png$`));
    const ogResponse = await request.get(new URL(og!).pathname);
    expect(ogResponse.status()).toBe(200);
    expect(ogResponse.headers()["content-type"]).toBe("image/png");
    expect(
      await page.locator('meta[name="twitter:card"]').getAttribute("content"),
    ).toBe("summary_large_image");

    // Product pages keep their own image.
    await page.goto(`/${locale}/products/merlot`);
    expect(
      await page.locator('meta[property="og:image"]').getAttribute("content"),
    ).toMatch(/\/media\//);
  });

  test(`${locale}: the analytics beacon is on public pages with the token`, async ({
    page,
  }) => {
    for (const path of ["", "/collections", "/terms", "/order"]) {
      await page.goto(`/${locale}${path}`);
      const beacon = page.locator(
        'script[src="https://static.cloudflareinsights.com/beacon.min.js"]',
      );
      await expect(beacon).toHaveCount(1);
      await expect(beacon).toHaveAttribute("defer", "");
      expect(
        JSON.parse((await beacon.getAttribute("data-cf-beacon"))!),
      ).toEqual({ token: TOKEN });
    }
  });
}

test("the analytics beacon is absent from /admin (login and dashboard)", async ({
  page,
}) => {
  const beacon = page.locator('script[src*="cloudflareinsights"]');
  await page.goto("/admin/login");
  await expect(beacon).toHaveCount(0);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin$/);
  await expect(beacon).toHaveCount(0);
  await page.goto("/admin/orders");
  await expect(beacon).toHaveCount(0);
});

test("the terms page is in the sitemap in both locales", async ({
  request,
}) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/fa/terms</loc>");
  expect(sitemap).toContain("/en/terms</loc>");
});

test("removed code and keys stay removed", () => {
  const grep = (pattern: string) => {
    try {
      return execFileSync(
        "git",
        ["grep", "-n", pattern, "--", "src", "messages"],
        { encoding: "utf8" },
      );
    } catch {
      return "";
    }
  };
  expect(grep("CollectionCard")).toBe("");
  expect(grep("todayInTehran")).toBe("");
  expect(grep("formatBookingDate")).toBe("");
  expect(grep("notFoundTitle")).toBe("");
});
