import { VARIANT_WIDTHS, type VariantWidth } from "./mediaVariants";

/** Longest edge of the uploaded original; phone photos (5–10 MB) come out ~1 MB. */
export const MAX_EDGE_PX = 2400;
const JPEG_QUALITY = 0.85;

async function decode(source: Blob): Promise<ImageBitmap | null> {
  try {
    // "from-image" applies the EXIF rotation while decoding, so the pixels
    // come out upright and the (EXIF-less) JPEG displays the same way.
    return await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
}

async function encode(bitmap: ImageBitmap, scale: number, name: string): Promise<File | null> {
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // JPEG has no alpha: flatten transparent PNGs onto white, not black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  return blob ? new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }) : null;
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "image";
}

export interface ResizedImage {
  /** Long edge ≤ MAX_EDGE_PX, JPEG. */
  original: File;
  /** 800px / 1600px wide JPEGs (never upscaled: a narrower image keeps its width). */
  variants: Record<VariantWidth, File>;
}

/**
 * Browser-side: the upload original plus its 800/1600 variants, all as
 * JPEG. Returns null for formats the browser can't decode (the caller
 * then uploads the file as-is, without variants).
 */
export async function resizeForUpload(file: Blob, name = "image"): Promise<ResizedImage | null> {
  const bitmap = await decode(file);
  if (!bitmap) return null;
  try {
    const stem = baseName(name);
    const original = await encode(
      bitmap,
      Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height)),
      `${stem}.jpg`,
    );
    if (!original) return null;
    const variants = {} as Record<VariantWidth, File>;
    for (const width of VARIANT_WIDTHS) {
      const variant = await encode(bitmap, Math.min(1, width / bitmap.width), `${stem}-${width}.jpg`);
      if (!variant) return null;
      variants[width] = variant;
    }
    return { original, variants };
  } finally {
    bitmap.close();
  }
}

/** Variants only, from an already-uploaded original (the admin backfill). */
export async function makeVariants(source: Blob): Promise<Record<VariantWidth, File> | null> {
  const bitmap = await decode(source);
  if (!bitmap) return null;
  try {
    const variants = {} as Record<VariantWidth, File>;
    for (const width of VARIANT_WIDTHS) {
      const variant = await encode(bitmap, Math.min(1, width / bitmap.width), `variant-${width}.jpg`);
      if (!variant) return null;
      variants[width] = variant;
    }
    return variants;
  } finally {
    bitmap.close();
  }
}
