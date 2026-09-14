import { useTranslations } from "next-intl";
import NewsletterForm from "./NewsletterForm";
import Logo from "./Logo";

// Placeholder social links — replaced with real profiles when available.
const SOCIAL_LINKS = [
  { label: "Instagram", href: "#" },
  { label: "Telegram", href: "#" },
  { label: "Pinterest", href: "#" },
];

/**
 * Always on the light end of the palette (CLAUDE.md — "لوگو": "در فوتر ...
 * فقط نسخه‌ی مشکی لوگو استفاده شود"), so Logo is pinned to the black
 * variant — no scroll-driven crossfade needed here.
 */
export default function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-pearl-white text-matte-black">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2">
        <div>
          <h2 className="font-heading text-lg">{t("newsletter.heading")}</h2>
          <p className="text-matte-black/70 mt-2 text-sm">
            {t("newsletter.description")}
          </p>
          <div className="mt-4 max-w-sm">
            <NewsletterForm />
          </div>
        </div>
        <div className="sm:text-end">
          <h2 className="font-heading text-lg">{t("social.heading")}</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm sm:items-end">
            {SOCIAL_LINKS.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="hover:text-olive-accent">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-matte-black/10 text-matte-black/50 flex items-center justify-center gap-2 border-t px-6 py-4 text-center text-xs">
        <Logo variant="black" className="h-4" />
        <span>
          &copy; {year} — {t("rights")}
        </span>
      </div>
    </footer>
  );
}
