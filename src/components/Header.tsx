import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Header skeleton for phase 2: a text-only "DEVINO" wordmark and primary
 * nav. No scroll-linked background transition yet — that behavior
 * (dark-to-light, synced to scroll position) is a phase 3 concern.
 */
export default function Header() {
  const t = useTranslations("nav");

  return (
    <header className="bg-matte-black text-pearl-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="font-heading text-2xl tracking-[0.2em] uppercase"
        >
          DEVINO
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
