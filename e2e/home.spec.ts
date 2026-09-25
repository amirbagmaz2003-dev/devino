/**
 * Brief 04, Part B (home page) — fa and en, against the local preview.
 */
import { test, expect, type Page } from "@playwright/test";

const TAGLINE = {
  fa: "حضوری از آنِ خودش.",
  en: "A Presence of Her Own.",
} as const;

const STATEMENT = {
  fa: [
    "برای زنی که هرگز برای دیده‌شدن نمی‌کوشد،",
    "و درست به همین دلیل از یاد نمی‌رود.",
  ],
  en: [
    "For the woman who never tries to be seen,",
    "and for that very reason is never forgotten.",
  ],
} as const;

/** fa headings must be Markazi Text (CLAUDE.md), en headings Cormorant Garamond. */
const HEADING_FONT = { fa: "Markazi Text", en: "Cormorant Garamond" } as const;

/** Undrawn fraction of the shoulder line (pathLength = 1): 1 = hidden, 0 = fully drawn. */
function dashOffset(page: Page) {
  return page
    .getByTestId("shoulder-line")
    .locator("path")
    .evaluate((path) =>
      Number.parseFloat(getComputedStyle(path).strokeDashoffset),
    );
}

/** Scroll so the statement section's top sits at `fraction` of the viewport height. */
async function placeSection(page: Page, fraction: number) {
  await page.evaluate((f) => {
    const section = document.querySelector('[data-testid="home-statement"]')!;
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - window.innerHeight * f);
  }, fraction);
  await page.waitForTimeout(150); // one rAF + paint
}

for (const locale of ["fa", "en"] as const) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
    { name: "narrow", width: 320, height: 640 },
  ]) {
    test(`${locale} ${viewport.name}: tagline once in the teaser; statement secondary; shoulder line scroll-linked`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(`/${locale}`);

      // Tagline: exactly once on the page, in the collections teaser, not in the hero.
      const hero = page.locator("section").first();
      const teaser = page.locator("section").nth(1);
      await expect(hero).not.toContainText(TAGLINE[locale]);
      await expect(hero.locator("h1")).toBeVisible();
      await expect(teaser.getByTestId("home-tagline")).toHaveText(
        TAGLINE[locale],
      );
      const occurrences = await page.evaluate(
        (text) =>
          document.querySelector("main")!.innerText.split(text).length - 1,
        TAGLINE[locale],
      );
      expect(occurrences).toBe(1);
      // Order: heading, tagline, button.
      const [h2, tagline, button] = await Promise.all([
        teaser.locator("h2").boundingBox(),
        teaser.getByTestId("home-tagline").boundingBox(),
        teaser.getByRole("link").boundingBox(),
      ]);
      expect(h2!.y).toBeLessThan(tagline!.y);
      expect(tagline!.y).toBeLessThan(button!.y);

      // Statement: pearl-white background, matte-black text, smaller and
      // lighter than the tagline.
      const statement = page.getByTestId("home-statement");
      await expect(statement).toHaveCSS(
        "background-color",
        "rgb(248, 246, 240)",
      );
      const statementText = statement.locator("p");
      await expect(statementText).toHaveCSS("color", "rgb(0, 0, 0)");

      // Two halves, broken right after the comma, at every width.
      const halves = statement.locator("[data-statement-line]");
      await expect(halves).toHaveText([...STATEMENT[locale]]);
      const [first, second] = await Promise.all([
        halves.nth(0).boundingBox(),
        halves.nth(1).boundingBox(),
      ]);
      expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height - 1);
      await expect(halves.first()).toHaveCSS("text-wrap-style", "balance");
      if (viewport.width >= 390) {
        // Where they fit, each half is exactly one line.
        const lineHeight = Number.parseFloat(
          await statementText.evaluate((el) => getComputedStyle(el).lineHeight),
        );
        expect(first!.height).toBeLessThan(lineHeight * 1.5);
        expect(second!.height).toBeLessThan(lineHeight * 1.5);
      }

      // Equal breathing room above the sentence and below the line.
      const gaps = await statement.evaluate((section) => {
        const s = section.getBoundingClientRect();
        const text = section.querySelector("p")!.getBoundingClientRect();
        const svg = section.querySelector("svg")!.getBoundingClientRect();
        return { above: text.top - s.top, below: s.bottom - svg.bottom };
      });
      expect(Math.abs(gaps.above - gaps.below)).toBeLessThanOrEqual(2);

      // Heading font: the tagline, the statement and the teaser heading.
      for (const el of [
        teaser.getByTestId("home-tagline"),
        statementText,
        teaser.locator("h2"),
      ]) {
        expect(
          await el.evaluate((node) => getComputedStyle(node).fontFamily),
        ).toMatch(new RegExp(`^"${HEADING_FONT[locale]}"`));
      }
      expect(
        await page.evaluate(async (family) => {
          await document.fonts.ready;
          return [...document.fonts].some(
            (f) =>
              f.family.replace(/"/g, "") === family && f.status === "loaded",
          );
        }, HEADING_FONT[locale]),
      ).toBe(true);
      const size = async (l: typeof statementText) =>
        Number.parseFloat(
          await l.evaluate((el) => getComputedStyle(el).fontSize),
        );
      const weight = async (l: typeof statementText) =>
        Number(await l.evaluate((el) => getComputedStyle(el).fontWeight));
      const taglineEl = teaser.getByTestId("home-tagline");
      expect(await size(statementText)).toBeLessThan(
        (await size(taglineEl)) * 0.75,
      );
      expect(await weight(statementText)).toBeLessThan(await weight(taglineEl));

      // Shoulder line: aria-hidden olive path, the section's only olive element.
      const line = page.getByTestId("shoulder-line");
      await expect(line).toHaveAttribute("aria-hidden", "true");
      await expect(line.locator("path")).toHaveAttribute("stroke", "#556B2F");
      const oliveElements = await statement.evaluate(
        (section) =>
          [...section.querySelectorAll("*")].filter((el) => {
            const s = getComputedStyle(el);
            return [
              s.color,
              s.backgroundColor,
              s.borderTopColor,
              s.stroke,
            ].includes("rgb(85, 107, 47)");
          }).length,
      );
      expect(oliveElements).toBe(1);

      // Drawn length grows as the section scrolls up through the viewport.
      await placeSection(page, 1.05);
      const hidden = await dashOffset(page);
      await placeSection(page, 0.8);
      const partial = await dashOffset(page);
      await placeSection(page, 0.5);
      const more = await dashOffset(page);
      await placeSection(page, 0.1);
      const full = await dashOffset(page);
      expect(hidden).toBeCloseTo(1, 2);
      expect(partial).toBeLessThan(hidden);
      expect(more).toBeLessThan(partial);
      expect(full).toBeCloseTo(0, 2);
      await context.close();
    });
  }

  test(`${locale}: with reduced motion the shoulder line is fully drawn and static`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`/${locale}`);
    await placeSection(page, 1.05);
    expect(await dashOffset(page)).toBe(0);
    await placeSection(page, 0.5);
    expect(await dashOffset(page)).toBe(0);
    await context.close();
  });
}

test("home metadata description is still the tagline; closing line unchanged", async ({
  page,
}) => {
  for (const locale of ["fa", "en"] as const) {
    await page.goto(`/${locale}`);
    expect(
      await page.locator('meta[name="description"]').getAttribute("content"),
    ).toBe(TAGLINE[locale]);
    await expect(page.locator("section").nth(3).locator("p")).toHaveText(
      locale === "fa"
        ? "کمال، در جزئیات زندگی می‌کند."
        : "Perfection lives in the details.",
    );
  }
});
