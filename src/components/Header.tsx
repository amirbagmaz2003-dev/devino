"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import Logo from "./Logo";

/**
 * Fixed, full-width header. Background/text default to a solid
 * matte-black bar (Tailwind classes below) everywhere; on the homepage,
 * HeroScrollController overrides both imperatively as the user scrolls
 * (see globals.css ".site-header" for the text/logo crossfade). Non-hero
 * pages must offset their top content by `--header-h` since this never
 * takes up document flow space.
 */
export default function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const otherLocale =
    routing.locales.find((candidate) => candidate !== locale) ?? locale;

  return (
    <header
      data-site-header
      className="site-header bg-matte-black text-pearl-white fixed inset-x-0 top-0 z-50"
      style={{ height: "var(--header-h)" }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <Logo className="h-6 sm:h-8" />
        </Link>
        <nav
          aria-label="Primary"
          className="font-body flex items-center gap-3 text-xs sm:gap-8 sm:text-sm"
        >
          <Link href="/collections" className="hover:opacity-70">
            {t("collections")}
          </Link>
          <Link href="/about" className="hover:opacity-70">
            {t("about")}
          </Link>
          <Link href="/contact" className="hover:opacity-70">
            {t("contact")}
          </Link>
          {/* Small, subtle locale switch — inherits the same color
              crossfade as the rest of the header (see .site-header in
              globals.css) since it sets no color of its own. Preserves
              the current path, just swaps the locale segment. The aria-label is
              localized in messages/*.json (nav.switchLanguage). */}
          <Link
            href={pathname}
            locale={otherLocale}
            aria-label={t("switchLanguage")}
            // Visible text stays a tiny "EN"/"FA"; the box around it is a
            // full 44×44px tap target (WCAG 2.5.5).
            className="-mx-2 inline-flex min-h-11 min-w-11 items-center justify-center text-[10px] tracking-widest uppercase opacity-70 hover:opacity-100 sm:text-xs"
          >
            {otherLocale}
          </Link>
        </nav>
      </div>
    </header>
  );
}
