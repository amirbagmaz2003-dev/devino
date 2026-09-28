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
