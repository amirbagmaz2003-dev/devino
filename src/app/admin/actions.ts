"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createSessionToken, safeEqual } from "@/lib/adminSession";
import { ADMIN_SESSION_COOKIE } from "@/lib/adminAuth";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const { env } = await getCloudflareContext({ async: true });

  if (!env.ADMIN_PASSWORD || !safeEqual(password, env.ADMIN_PASSWORD)) {
    redirect("/admin/login?error=1");
  }

  const token = await createSessionToken(env.SESSION_SECRET);
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
