/**
 * Brief 06 (cosmetic QA fixes), against the local preview, fa and en.
 */
import { execFileSync } from "node:child_process";
import { test, expect, type Page } from "@playwright/test";

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

// ---------- 1. Persian digits and separators ----------

/**
 * Latin digits a visitor could see or hear (text, aria-label, alt, title,
 * placeholder). Strings that also contain Latin letters are skipped: that
 * is content typed into the admin (e.g. a test collection named
 * "cover-x1y2"), not a number the site formats.
 */
function latinDigits(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script,style,noscript")) continue;
      const text = node.textContent ?? "";
      if (/[0-9]/.test(text) && !/[A-Za-z]/.test(text)) out.push(text.trim());
    }
    for (const el of document.querySelectorAll(
      "[aria-label],[alt],[title],[placeholder]",
    ))
      for (const attr of ["aria-label", "alt", "title", "placeholder"]) {
        const value = el.getAttribute(attr);
        if (value && /[0-9]/.test(value) && !/[A-Za-z]/.test(value))
          out.push(`${attr}=${value}`);
      }
    return out;
  });
}

test("fa pages show only Persian digits; prices use ٬, en keeps Latin", async ({
  page,
}) => {
  const merlot = sql<{ price: number }>(
    "SELECT price FROM products WHERE slug = 'merlot'",
  )[0];
  sql("UPDATE products SET price = 27000000 WHERE slug = 'merlot'");
  try {
    for (const path of [
      "",
      "/collections",
      "/collections/first-harvest",
      "/products/merlot",
      "/about",
      "/contact",
      "/order?product=merlot",
      "/terms",
      "/does-not-exist",
    ]) {
      await page.goto(`/fa${path}`);
      expect(await latinDigits(page), `/fa${path}`).toEqual([]);
    }

    await page.goto("/fa/products/merlot");
    await expect(page.getByText("۲۷٬۰۰۰٬۰۰۰ تومان")).toBeVisible();
    await page.goto("/en/products/merlot");
    await expect(page.getByText("27,000,000 Toman")).toBeVisible();

    // List numbering and the 404.
    await page.goto("/fa/terms");
    await expect(page.locator("main ol")).toHaveCSS(
      "list-style-type",
      "persian",
    );
    await page.goto("/en/terms");
    await expect(page.locator("main ol")).toHaveCSS(
      "list-style-type",
      "decimal",
    );
    await page.goto("/fa/does-not-exist");
    await expect(page.getByText("۴۰۴", { exact: true })).toBeVisible();
    await page.goto("/en/does-not-exist");
    await expect(page.getByText("404", { exact: true })).toBeVisible();

    // Footer year.
    const year = new Date().getFullYear();
    await page.goto("/fa/about");
    await expect(page.getByRole("contentinfo")).toContainText(
      String(year).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]),
    );
  } finally {
    sql(`UPDATE products SET price = ${merlot.price} WHERE slug = 'merlot'`);
  }
});

// ---------- 2. No italic on Persian text ----------

test("the italic lines are italic on /en only; Persian never gets a synthetic italic", async ({
  page,
}) => {
  const lines = {
    "/collections/first-harvest": {
      fa: "لباس، حضور را نمی‌سازد؛ کاملش می‌کند.",
      en: "A dress doesn't create a presence. It completes one.",
    },
    "/contact": {
      fa: "لباسی که فقط تماشا نمی‌شود؛ گفت‌وگویی را آغاز می‌کند.",
      en: "Not a dress to be looked at, but one that begins a conversation.",
    },
    "": {
      fa: "کمال، در جزئیات زندگی می‌کند.",
      en: "Perfection lives in the details.",
    },
    "/about": {
      fa: "زیبایی از رابطه‌ی زن و لباس زاده می‌شود، نه از غلبه‌ی یکی بر دیگری.",
      en: "Beauty is born of the relationship between a woman and her dress, never from one overpowering the other.",
    },
  } as const;
  for (const [path, text] of Object.entries(lines))
    for (const locale of ["fa", "en"] as const) {
      await page.goto(`/${locale}${path}`);
      const line = page.getByText(text[locale], { exact: true });
      await expect(line).toHaveCSS(
        "font-style",
        locale === "en" ? "italic" : "normal",
      );
      if (locale === "fa")
        await expect(line).toHaveCSS("font-synthesis", "none");
    }
  // No other italic anywhere on those Persian pages.
  for (const path of Object.keys(lines)) {
    await page.goto(`/fa${path}`);
    expect(
      await page.evaluate(
        () =>
          [...document.querySelectorAll("body *")].filter(
            (el) =>
              getComputedStyle(el).fontStyle === "italic" &&
              el.textContent?.trim(),
          ).length,
      ),
    ).toBe(0);
  }
});

// ---------- 3. Footer separator never alone on a line ----------

for (const locale of ["fa", "en"] as const)
  for (const width of [320, 390, 1280])
    test(`${locale} ${width}px: the footer "·" stays on the line of the text before it`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
      });
      const page = await context.newPage();
      await page.goto(`/${locale}/about`);
      const dot = page
        .getByRole("contentinfo")
        .locator('span[aria-hidden]:text-is("·")');
      await expect(dot).toHaveCount(1);
      const [dotTop, wordTop] = await dot.evaluate((el) => {
        // The last visible character before the dot (React splits the
        // text into several nodes, the no-break space being one of them).
        let text = el.previousSibling!;
        while (!text.textContent!.replace(/\s/g, ""))
          text = text.previousSibling!;
        const at = text.textContent!.trimEnd().length - 1;
        const range = document.createRange();
        range.setStart(text, at);
        range.setEnd(text, at + 1);
        return [
          el.getBoundingClientRect().top,
          range.getBoundingClientRect().top,
        ];
      });
      expect(Math.abs(dotTop - wordTop)).toBeLessThanOrEqual(4);
      await context.close();
    });

// ---------- 4. No widowed last words ----------

/** Multi-line headings/paragraphs/list items (3+ words) whose last line is a single word. */
function widows(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li")) {
      if (!el.getBoundingClientRect().width) continue;
      const words: { word: string; top: number }[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent ?? "";
        for (const match of text.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(node, match.index!);
          range.setEnd(node, match.index! + match[0].length);
          const rects = [...range.getClientRects()].filter((r) => r.width);
          if (rects.length)
            words.push({
              word: match[0],
              top: Math.round(rects[rects.length - 1].top),
            });
        }
      }
      const lines = [...new Set(words.map((w) => w.top))];
      // Two words that don't fit on one line can only break one way.
      if (lines.length < 2 || words.length < 3) continue;
      const last = words.filter((w) => w.top === lines[lines.length - 1]);
      if (last.length === 1)
        out.push(
          `${el.tagName}: …${last[0].word} (${el.textContent!.trim().slice(0, 30)})`,
        );
    }
    return out;
  });
}

for (const locale of ["fa", "en"] as const)
  for (const width of [320, 390, 1280])
    test(`${locale} ${width}px: no single word alone on a last line`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
      });
      const page = await context.newPage();
      for (const path of [
        "",
        "/collections",
        "/collections/first-harvest",
        "/products/merlot",
        "/about",
        "/contact",
        "/order?product=merlot",
        "/terms",
        "/does-not-exist",
      ]) {
        await page.goto(`/${locale}${path}`);
        await page.evaluate(() => document.fonts.ready);
        expect(await widows(page), `/${locale}${path}`).toEqual([]);
      }
      // The rule is general CSS, not per string.
      await page.goto(`/${locale}`);
      await expect(page.getByTestId("home-tagline")).toHaveCSS(
        "text-wrap-style",
        "balance",
      );
      await expect(page.locator("h2").first()).toHaveCSS(
        "text-wrap-style",
        "balance",
      );
      await page.goto(`/${locale}/about`);
      await expect(page.locator("main p").first()).toHaveCSS(
        "text-wrap-style",
        "pretty",
      );
      await context.close();
    });
