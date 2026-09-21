import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySessionToken } from "./adminSession";

export const ADMIN_SESSION_COOKIE = "devino_admin_session";

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;
  const { env } = await getCloudflareContext({ async: true });
  return verifySessionToken(env.SESSION_SECRET, token);
}
