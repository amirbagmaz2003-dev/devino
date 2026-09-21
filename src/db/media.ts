import type { MediaBoxProps } from "@/components/MediaBox";

export interface MediaRow {
  id: string;
  type: "image" | "video";
  focal_x: number;
  focal_y: number;
  alt_fa: string;
  alt_en: string;
}

/** Every media asset is served through this route (src/app/media/[id]/route.ts),
 * which streams the R2 object by id — never a direct R2/public URL. */
export function mediaUrl(id: string) {
  return `/media/${id}`;
}

export function resolveMedia(row: MediaRow, locale: string): MediaBoxProps {
  const alt = (locale === "fa" ? row.alt_fa : row.alt_en) || row.alt_fa || row.alt_en || "";
  return {
    type: row.type,
    asset: { url: mediaUrl(row.id) },
    focalPoint: row.type === "image" ? { x: row.focal_x, y: row.focal_y } : undefined,
    alt,
  };
}
