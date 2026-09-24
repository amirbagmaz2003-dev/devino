import { headers } from "next/headers";

/**
 * The visitor's IP for per-IP limits. Cloudflare sets CF-Connecting-IP on
 * every request and overwrites any client-supplied value, so it can't be
 * spoofed in production.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
