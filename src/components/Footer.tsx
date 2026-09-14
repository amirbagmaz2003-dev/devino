import { useTranslations } from "next-intl";
import NewsletterForm from "./NewsletterForm";

// Placeholder social links — replaced with real profiles when available.
const SOCIAL_LINKS = [
  { label: "Instagram", href: "#" },
  { label: "Telegram", href: "#" },
  { label: "Pinterest", href: "#" },
];

export default function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-matte-black text-pearl-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2">
        <div>
          <h2 className="font-heading text-lg">{t("newsletter.heading")}</h2>
          <p className="text-pearl-white/70 mt-2 text-sm">
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
      <div className="border-pearl-white/10 text-pearl-white/50 border-t px-6 py-4 text-center text-xs">
        &copy; {year} DEVINO — {t("rights")}
      </div>
    </footer>
  );
}
