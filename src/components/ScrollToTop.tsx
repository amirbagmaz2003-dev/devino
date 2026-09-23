"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Next.js's built-in scroll-to-top-on-navigation isn't reliable here on
 * mobile — navigating from /collections into /collections/[slug] could
 * land the new page already scrolled to the middle/bottom instead of
 * the top. Force it explicitly on every route change instead of relying
 * on the framework default.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
