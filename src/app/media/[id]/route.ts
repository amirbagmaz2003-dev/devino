import { NextResponse } from "next/server";
import { getDb, getMediaKv } from "@/db/client";

/**
 * Streams a media asset by its media.id from Workers KV (not R2 — R2
 * needed billing/activation the project owner couldn't do; see
 * wrangler.jsonc). The only way any image/video URL on the site is ever
 * formed (see src/db/media.ts, mediaUrl()) — keeps the storage layer
 * private while still giving every asset a stable, cacheable URL.
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

  const kv = await getMediaKv();
  const value = await kv.get(row.r2_key, "arrayBuffer");
  if (!value) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(value, {
    headers: {
      "Content-Type": row.content_type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
