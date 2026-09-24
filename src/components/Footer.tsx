import { getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/db/queries";
import Logo from "./Logo";

interface SocialLink {
  label: string;
  href: string;
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-olive-accent decoration-matte-black/20 inline-flex min-h-11 items-center underline underline-offset-4 transition-colors"
    >
      {children}
    </a>
  );
}

/**
 * Always on the light end of the palette (CLAUDE.md — "لوگو": "در فوتر ...
 * فقط نسخه‌ی مشکی لوگو استفاده شود"), so Logo is pinned to the black
 * variant — no scroll-driven crossfade needed here. Social links come
 * from site_settings (editable in /admin); any link that isn't set is
 * simply not rendered.
 */
export default async function Footer() {
  const [t, settings] = await Promise.all([
    getTranslations("footer"),
    getSiteSettings(),
  ]);
  const year = new Date().getFullYear();

  const links: SocialLink[] = [
    settings?.telegramUrl
      ? { label: t("social.telegram"), href: settings.telegramUrl }
      : null,
    settings?.instagramUrl
      ? { label: t("social.instagram"), href: settings.instagramUrl }
      : null,
  ].filter((link): link is SocialLink => link !== null);

  return (
    <footer className="bg-pearl-white text-matte-black">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2">
        <div>
          <h2 className="font-heading text-lg">{t("stayClose.heading")}</h2>
          <p className="text-matte-black/70 mt-2 max-w-sm text-sm">
            {t("stayClose.text")}
          </p>
          {links.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-6 text-sm">
              {links.map((link) => (
                <li key={link.href}>
                  <ExternalLink href={link.href}>{link.label}</ExternalLink>
                </li>
              ))}
            </ul>
          )}
        </div>
        {links.length > 0 && (
          <div className="sm:text-end">
            <h2 className="font-heading text-lg">{t("social.heading")}</h2>
            <ul className="mt-1 flex flex-col text-sm sm:items-end">
              {links.map((link) => (
                <li key={link.href}>
                  <ExternalLink href={link.href}>{link.label}</ExternalLink>
                </li>
              ))}
            </ul>
          </div>
        )}
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
