import { timingSafeEqual } from "node:crypto";

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const base64 = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Stateless signed session token: "<expiresAtMs>.<hmac signature>". No
 * session store needed — just verify the signature and expiry on each request. */
export async function createSessionToken(secret: string, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(String(expiresAt)));
  return `${expiresAt}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(
  secret: string,
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const [expiresAtStr, signaturePart] = token.split(".");
  if (!expiresAtStr || !signaturePart) return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  try {
    const key = await getKey(secret);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signaturePart) as BufferSource,
      encoder.encode(expiresAtStr) as BufferSource,
    );
  } catch {
    return false;
  }
}

/** Constant-time password comparison — avoids leaking length/prefix via timing. */
export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
