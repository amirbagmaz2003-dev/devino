/**
 * Header tap targets on phones (QA pass, fix 3): every header link is at
 * least 44×44px (WCAG 2.5.5) on every public page, in both locales, without
 * the header overflowing even at 320px.
 */
import { test, expect } from "@playwright/test";

const PAGES = [
  "/",
  "/collections",
  "/about",
  "/contact",
  "/order",
  "/terms",
  "/does-not-exist",
];

for (const locale of ["fa", "en"] as const) {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 320, height: 640 },
  ]) {
    test(`${locale} ${viewport.width}px: header links are ≥44×44px, don't overlap and fit`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      for (const path of PAGES) {
        await page.goto(`/${locale}${path}`);
        const links = page.locator("[data-site-header] a");
        await expect(links).toHaveCount(5); // logo, 3 nav links, locale switch
        const boxes = await links.evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return {
              label: el.textContent?.trim() || el.getAttribute("href"),
              left: r.left,
              right: r.right,
              width: r.width,
              height: r.height,
            };
          }),
        );
        for (const box of boxes) {
          expect(
            box.height,
            `${path} "${box.label}" height`,
          ).toBeGreaterThanOrEqual(44);
          expect(
            box.width,
            `${path} "${box.label}" width`,
          ).toBeGreaterThanOrEqual(44);
          expect(box.left, `${path} "${box.label}"`).toBeGreaterThanOrEqual(0);
          expect(box.right, `${path} "${box.label}"`).toBeLessThanOrEqual(
            viewport.width,
          );
        }
        // Tap areas never overlap, so a tap can't land on the wrong link.
        const sorted = [...boxes].sort((a, b) => a.left - b.left);
        for (let i = 1; i < sorted.length; i++)
          expect(
            sorted[i].left,
            `${path}: "${sorted[i - 1].label}" / "${sorted[i].label}"`,
          ).toBeGreaterThanOrEqual(sorted[i - 1].right - 0.5);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
      }
      await context.close();
    });
  }
}
