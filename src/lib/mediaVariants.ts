/**
 * Smaller JPEG copies stored in KV next to each image (brief 03, §8), so
 * phones don't download the 2400px original. Shared by the browser
 * (generation), the admin actions (storage) and /media/[id] (serving).
 */
export const VARIANT_WIDTHS = [800, 1600] as const;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

export function isVariantWidth(value: number): value is VariantWidth {
  return (VARIANT_WIDTHS as readonly number[]).includes(value);
}

/** KV key of a variant: "<original key>:<width>", e.g. "media:<id>:800". */
export function variantKey(originalKey: string, width: VariantWidth) {
  return `${originalKey}:${width}`;
}

/** Form field carrying a variant next to the file input `name`. */
export function variantField(name: string, width: VariantWidth) {
  return `${name}__w${width}`;
}

/** Hero/background video cap: fits KV's 25 MiB per-value limit with room to spare. */
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
