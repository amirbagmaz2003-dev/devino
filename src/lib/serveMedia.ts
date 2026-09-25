import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { isVariantWidth, variantKey } from "./mediaVariants";

/**
 * GET/HEAD /media/<id> — the only way any uploaded image/video is served
 * (see src/db/media.ts, mediaUrl()). Runs in the custom Worker entry
 * (src/worker.ts), *before* Next.js: OpenNext re-streams every Next.js
 * response as chunked and drops Content-Length, which iOS Safari's video
 * loader doesn't tolerate. Media lives in Workers KV (R2 isn't available
 * on this account — see CLAUDE.md).
 *
 * - `?w=800|1600` serves that JPEG variant when it exists, else the
 *   original (so images uploaded before variants existed keep working).
 * - HTTP Range (single range: "a-b", "a-", "-n") -> 206 / 416.
 * - Media ids are immutable, so the id (plus the served width) is a
 *   strong ETag; If-None-Match -> 304.
 * - HEAD returns the same headers without a body.
 */

const CACHE_CONTROL = "public, max-age=31536000, immutable";

type ByteRange = { start: number; end: number } | "unsatisfiable" | null;

/** null = no Range header (serve everything); "unsatisfiable" -> 416. */
function parseRange(header: string | null, size: number): ByteRange {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return "unsatisfiable";
  if (match[1] === "") {
    // Suffix range: the last N bytes.
    const length = Number(match[2]);
    if (length === 0 || size === 0) return "unsatisfiable";
    return { start: Math.max(0, size - length), end: size - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (start >= size || end < start) return "unsatisfiable";
  return { start, end };
}

function etagMatches(header: string | null, etag: string) {
  if (!header) return false;
  if (header.trim() === "*") return true;
  return header
    .split(",")
    .map((tag) => tag.trim().replace(/^W\//, ""))
    .includes(etag);
}

export async function serveMedia(
  request: Request,
  id: string,
  env: { DB: D1Database; MEDIA: KVNamespace },
): Promise<Response> {
  const includeBody = request.method !== "HEAD";
  const row = await env.DB.prepare("SELECT r2_key, content_type FROM media WHERE id = ?")
    .bind(id)
    .first<{ r2_key: string; content_type: string }>();
  if (!row) return new Response("Not found", { status: 404 });

  const requestedWidth = Number(new URL(request.url).searchParams.get("w"));
  let value: ArrayBuffer | null = null;
  let servedWidth: number | null = null;
  if (isVariantWidth(requestedWidth)) {
    value = await env.MEDIA.get(variantKey(row.r2_key, requestedWidth), "arrayBuffer");
    if (value) servedWidth = requestedWidth;
  }
  value ??= await env.MEDIA.get(row.r2_key, "arrayBuffer");
  if (!value) return new Response("Not found", { status: 404 });

  const size = value.byteLength;
  const etag = `"${id}${servedWidth ? `-w${servedWidth}` : ""}"`;
  const headers = new Headers({
    "Content-Type": servedWidth ? "image/jpeg" : row.content_type,
    "Cache-Control": CACHE_CONTROL,
    "Accept-Ranges": "bytes",
    ETag: etag,
  });

  if (etagMatches(request.headers.get("if-none-match"), etag)) {
    return new Response(null, { status: 304, headers });
  }

  const range = parseRange(request.headers.get("range"), size);
  if (range === "unsatisfiable") {
    headers.set("Content-Range", `bytes */${size}`);
    headers.set("Content-Length", "0");
    return new Response(null, { status: 416, headers });
  }

  const body = range ? value.slice(range.start, range.end + 1) : value;
  headers.set("Content-Length", String(body.byteLength));
  if (range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  // A fixed-length ArrayBuffer body: workerd sends Content-Length, not chunked.
  return new Response(includeBody ? body : null, { status: range ? 206 : 200, headers });
}
