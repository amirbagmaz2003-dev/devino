import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySessionToken } from "./adminSession";

export const ADMIN_SESSION_COOKIE = "devino_admin_session";

const encoder = new TextEncoder();

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * HMAC key for session cookies: SESSION_SECRET plus a hash of the current
 * ADMIN_PASSWORD. Changing the password therefore changes the key, which
 * invalidates every session signed before the change. Null when either
 * secret is missing, so a misconfigured deploy never accepts any session.
 */
export async function getSessionSigningSecret(): Promise<string | null> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.SESSION_SECRET || !env.ADMIN_PASSWORD) return null;
  return `${env.SESSION_SECRET}.${await sha256Hex(env.ADMIN_PASSWORD)}`;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = await getSessionSigningSecret();
  if (!secret) return false;
  return verifySessionToken(secret, token);
}

/**
 * Must be the first line of every mutating admin server action: server
 * actions are public POST endpoints, so the dashboard layout's own check
 * doesn't protect them. Redirects (throws) to the login page when the
 * session is missing, expired, or signed with an old password.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}
