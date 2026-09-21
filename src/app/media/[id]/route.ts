import { NextResponse } from "next/server";
import { getDb, getMediaBucket } from "@/db/client";

/**
 * Streams an R2 object by its media.id — the only way any image/video URL
 * on the site is ever formed (see src/db/media.ts, mediaUrl()). Keeps R2
 * objects private (no public bucket/custom domain needed) while still
 * giving every asset a stable, cacheable URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const db = await getDb();
  const row = await db
    .prepare("SELECT r2_key, content_type FROM media WHERE id = ?")
    .bind(id)
    .first<{ r2_key: string; content_type: string }>();
  if (!row) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bucket = await getMediaBucket();
  const object = await bucket.get(row.r2_key);
  if (!object) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(object.body as unknown as ReadableStream, {
    headers: {
      "Content-Type": row.content_type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
