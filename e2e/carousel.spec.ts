/**
 * Carousel arrows and slide counter (QA pass, "important" fix 1), on both
 * the collection posters and a collection's product carousel, fa and en,
 * phone and desktop.
 */
import { test, expect, type Page } from "@playwright/test";

const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";
const digits = (n: number, locale: "fa" | "en") =>
  locale === "fa"
    ? String(n).replace(/\d/g, (d) => PERSIAN[Number(d)])
    : String(n);

async function expectCounter(
  page: Page,
  locale: "fa" | "en",
  current: number,
  total: number,
) {
  const counter = page.locator("[data-carousel-counter]");
  await expect(counter.locator('[aria-hidden="true"]')).toHaveText(
    `${digits(current, locale)} / ${digits(total, locale)}`,
  );
  await expect(counter.locator(".sr-only")).toHaveText(
    locale === "fa"
      ? `اسلاید ${digits(current, locale)} از ${digits(total, locale)}`
      : `Slide ${current} of ${total}`,
  );
}

for (const locale of ["fa", "en"] as const) {
  for (const viewport of [
    { name: "mobile", width: 375, height: 812 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    for (const path of ["/collections", "/collections/first-harvest"]) {
      test(`${locale} ${viewport.name} ${path}: 44px arrows; counter tracks the slide and loops`, async ({
        browser,
      }) => {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        await page.goto(`/${locale}${path}`);
        const total = await page
          .locator('[aria-roledescription="slide"]')
          .count();
        expect(total).toBeGreaterThan(2);

        const prev = page.getByRole("button", {
          name: locale === "fa" ? "قبلی" : "Previous",
        });
        const next = page.getByRole("button", {
          name: locale === "fa" ? "بعدی" : "Next",
        });
        for (const button of [prev, next]) {
          const box = (await button.boundingBox())!;
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }

        const counter = page.locator("[data-carousel-counter]");
        await expect(counter).toBeVisible();
        // Under the product caption it can sit below the first screen on
        // desktop; it must be fully on screen once scrolled to.
        await counter.scrollIntoViewIfNeeded();
        await expect(counter).toBeInViewport({ ratio: 1 });
        await expect(counter).toHaveAttribute("aria-live", "polite");
        // Persian pages never show Latin digits in the count.
        if (locale === "fa")
          expect(await counter.innerText()).not.toMatch(/[0-9]/);

        await expectCounter(page, locale, 1, total);
        await next.click();
        await expectCounter(page, locale, 2, total);
        await prev.click();
        await prev.click(); // loops from the first slide to the last
        await expectCounter(page, locale, total, total);
        await page.locator('[aria-roledescription="carousel"]').focus();
        await page.keyboard.press("ArrowRight"); // …and back to the first
        await expectCounter(page, locale, 1, total);
        await context.close();
      });
    }
  }
}
