/**
 * Generates the site icons and default Open Graph images from the real
 * logo (brief 05, §3). Run once against a running site (fonts come from
 * the pages themselves), then commit the output:
 *
 *   npm run preview   # in another terminal
 *   node scripts/generate-brand-images.mjs [http://localhost:8787]
 *
 * Output:
 *   src/app/icon.png (512×512), src/app/apple-icon.png (180×180) — the
 *   logo's "D" as a monogram, black on pearl white, cropped from
 *   public/logos/devino-logo-black.png (not redrawn);
 *   src/app/favicon.ico (16×16 + 32×32) — a bolder, simplified serif "D"
 *   drawn on the pixel grid, since the logo's hairlines wash out at tab
 *   size; public/og/og-fa.png and og-en.png (1200×630) — the full logo
 *   with the tagline below it in the locale's heading font.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:8787";
const TAGLINE = { fa: "حضوری از آنِ خودش.", en: "A Presence of Her Own." };
const FONT = { fa: "Markazi Text", en: "Cormorant Garamond" };

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const page = await browser.newPage();

async function png(fn, arg) {
  const dataUrl = await page.evaluate(fn, arg);
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

/** Browser side: load the logo and find the "D" — the first run of inked columns. */
const loadLogo = `
  window.__logo = (async () => {
    const img = new Image();
    img.src = "/logos/devino-logo-black.png";
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    const inked = (x) => { for (let y = 0; y < height; y++) if (data[(y * width + x) * 4 + 3] > 24) return true; return false; };
    let x0 = 0; while (x0 < width && !inked(x0)) x0++;
    let x1 = x0; while (x1 < width && inked(x1)) x1++;
    let y0 = height, y1 = 0;
    for (let y = 0; y < height; y++) for (let x = x0; x < x1; x++) if (data[(y * width + x) * 4 + 3] > 24) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { img, d: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 + 1 } };
  })();
`;

/** Browser side: the monogram on a square pearl-white canvas. */
async function monogram(size) {
  const { img, d } = await window.__logo;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#F8F6F0";
  ctx.fillRect(0, 0, size, size);
  // Comfortable padding: the D's taller side takes ~62% of the square
  // (a bit more at favicon size, where every pixel counts).
  const fill = size <= 32 ? 0.74 : 0.62;
  const scale = (size * fill) / Math.max(d.w, d.h);
  const w = d.w * scale,
    h = d.h * scale;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, d.x, d.y, d.w, d.h, (size - w) / 2, (size - h) / 2, w, h);
  return c.toDataURL("image/png");
}

/**
 * Browser side: the favicon "D", hand-fitted to the pixel grid for 16 and
 * 32 px — a solid stem with slab serifs and a bowl that is thick on the
 * right and thinner top/bottom, echoing the logo's contrast.
 */
function smallMonogram(size) {
  const G = {
    16: {
      x0: 3,
      x1: 6,
      t: 2,
      b: 14,
      sx0: 2,
      sx1: 8,
      sh: 1,
      ox: 14,
      ix: 11,
      bt: 2,
    },
    32: {
      x0: 7,
      x1: 11,
      t: 5,
      b: 27,
      sx0: 5,
      sx1: 16,
      sh: 2,
      ox: 27,
      ix: 22,
      bt: 3,
    },
  }[size];
  const { x0, x1, t, b, sx0, sx1, sh, ox, ix, bt } = G;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#F8F6F0";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  // Stem and slab serifs.
  ctx.fillRect(x0, t, x1 - x0, b - t);
  ctx.fillRect(sx0, t, sx1 - sx0, sh);
  ctx.fillRect(sx0, b - sh, sx1 - sx0, sh);
  // Bowl: outer half-ellipse minus the inner one.
  const mid = (t + b) / 2,
    r = (b - t) / 2,
    neck = x1 + 2;
  ctx.beginPath();
  ctx.moveTo(x1, t);
  ctx.lineTo(neck, t);
  ctx.ellipse(neck, mid, ox - neck, r, 0, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x1, b);
  ctx.lineTo(x1, b - bt);
  ctx.lineTo(neck, b - bt);
  ctx.ellipse(neck, mid, ix - neck, r - bt, 0, Math.PI / 2, -Math.PI / 2, true);
  ctx.lineTo(x1, t + bt);
  ctx.closePath();
  ctx.fill();
  return c.toDataURL("image/png");
}

/** Browser side: 1200×630 share image — full logo, tagline below. */
async function shareImage({ tagline, font, rtl }) {
  const { img } = await window.__logo;
  await document.fonts.load(`56px "${font}"`, tagline);
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 630;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#F8F6F0";
  ctx.fillRect(0, 0, 1200, 630);
  const logoW = 560,
    logoH = (img.naturalHeight / img.naturalWidth) * logoW;
  const logoY = 630 / 2 - logoH / 2 - 50;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (1200 - logoW) / 2, logoY, logoW, logoH);
  ctx.fillStyle = "#000000";
  ctx.font = `56px "${font}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.fillText(tagline, 600, logoY + logoH + 110);
  return c.toDataURL("image/png");
}

/** Wraps PNGs in a .ico container (PNG-in-ICO is valid since Vista). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ bytes, size }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size, e);
    header.writeUInt8(size, e + 1);
    header.writeUInt8(0, e + 2); // palette
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4); // planes
    header.writeUInt16LE(32, e + 6); // bpp
    header.writeUInt32LE(bytes.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += bytes.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.bytes)]);
}

for (const locale of ["fa", "en"]) {
  await page.goto(`${BASE}/${locale}`);
  await page.evaluate(loadLogo);
  if (locale === "fa") {
    writeFileSync("src/app/icon.png", await png(monogram, 512));
    writeFileSync("src/app/apple-icon.png", await png(monogram, 180));
    writeFileSync(
      "src/app/favicon.ico",
      ico([
        { bytes: await png(smallMonogram, 16), size: 16 },
        { bytes: await png(smallMonogram, 32), size: 32 },
      ]),
    );
  }
  writeFileSync(
    `public/og/og-${locale}.png`,
    await png(shareImage, {
      tagline: TAGLINE[locale],
      font: FONT[locale],
      rtl: locale === "fa",
    }),
  );
}
await browser.close();
console.log(
  "Wrote src/app/{icon.png,apple-icon.png,favicon.ico} and public/og/og-{fa,en}.png",
);
