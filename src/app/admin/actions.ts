"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createSessionToken, safeEqual } from "@/lib/adminSession";
import { ADMIN_SESSION_COOKIE, getSessionSigningSecret } from "@/lib/adminAuth";
import {
  clearLoginFailures,
  isLoginLocked,
  recordLoginFailure,
} from "@/db/admin";
import type { AdminFormState } from "@/lib/adminForm";

const LOCKED_MESSAGE =
  "تعداد تلاش‌های ناموفق زیاد بود. لطفاً ۱۵ دقیقه دیگر دوباره امتحان کنید.";
const WRONG_PASSWORD_MESSAGE = "رمز عبور اشتباه است.";

async function clientIp() {
  const h = await headers();
  // Cloudflare sets CF-Connecting-IP on every request and overwrites any
  // client-supplied value, so it can't be spoofed in production.
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** The only admin action that doesn't call requireAdmin(). */
export async function loginAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const password = String(formData.get("password") ?? "");
  const ip = await clientIp();

  if (await isLoginLocked(ip)) {
    return { error: LOCKED_MESSAGE };
  }

  const { env } = await getCloudflareContext({ async: true });
  const secret = await getSessionSigningSecret();
  if (
    !secret ||
    !env.ADMIN_PASSWORD ||
    !safeEqual(password, env.ADMIN_PASSWORD)
  ) {
    await recordLoginFailure(ip);
    return {
      error: (await isLoginLocked(ip))
        ? LOCKED_MESSAGE
        : WRONG_PASSWORD_MESSAGE,
    };
  }

  await clearLoginFailures(ip);
  const token = await createSessionToken(secret);
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/admin");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}
