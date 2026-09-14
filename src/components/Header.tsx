import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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

  return (
    <header
      data-site-header
      className="site-header bg-matte-black text-pearl-white fixed inset-x-0 top-0 z-50"
      style={{ height: "var(--header-h)" }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="font-body flex gap-8 text-sm">
          <Link href="/collections" className="hover:opacity-70">
            {t("collections")}
          </Link>
          <Link href="/about" className="hover:opacity-70">
            {t("about")}
          </Link>
          <Link href="/contact" className="hover:opacity-70">
            {t("contact")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
