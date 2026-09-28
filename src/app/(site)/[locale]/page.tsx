import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import MediaBox from "@/components/MediaBox";
import HeroScrollController from "@/components/HeroScrollController";
import ShoulderLine from "@/components/ShoulderLine";
import { getHeroMedia, getSiteSettings } from "@/db/queries";

// Built-in hero, used until one is set in /admin/settings (site_settings.
// hero_media_id) — the owner's placeholder campaign photo (CLAUDE.md —
// "محتوای موقت"). An admin hero may be an image or a video; MediaBox
// handles both, so nothing here changes when it switches.
const HERO_IMAGE_URL = "/photos/hero-editorial-bw.jpg";
const HERO_FOCAL_POINT = { x: 0.42, y: 0.08 };

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings, hero] = await Promise.all([
    getTranslations("home"),
    getSiteSettings(),
    getHeroMedia(locale),
  ]);
  // Admin-editable tagline (site_settings) wins; the translation is the fallback.
  const tagline =
    (locale === "fa" ? settings?.tagline?.fa : settings?.tagline?.en)?.trim() ||
    t("tagline");

  return (
    <>
      <HeroScrollController />

      {/* The image starts below the fixed header (pt + top offset) so the
          header never covers its top — the subject's face in portrait
          photos. The strip behind the header stays the page's own black. */}
      <section className="relative h-dvh w-full overflow-hidden pt-[var(--header-h)]">
        <div className="absolute inset-x-0 top-[var(--header-h)] bottom-0">
          {hero ? (
            <MediaBox {...hero} priority sizes="100vw" />
          ) : (
            <MediaBox
              type="image"
              asset={{ url: HERO_IMAGE_URL }}
              focalPoint={HERO_FOCAL_POINT}
              alt={t("heroAlt")}
              priority
            />
          )}
        </div>
        {/* No text over the hero — the image alone (owner's decision). The
            page's h1 stays for SEO and screen readers, visually hidden
            (sr-only: clipped 1px box, not display:none). */}
        <h1 className="sr-only">{t("title")}</h1>
      </section>

      <section className="mx-auto flex min-h-[60dvh] max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
        <h2 className="text-3xl">{t("teaser.heading")}</h2>
        {/* The tagline: the first sentence a visitor reads after the brand name. */}
        <p
          data-testid="home-tagline"
          className="font-heading mt-6 text-4xl leading-tight sm:text-5xl md:text-6xl"
        >
          {tagline}
        </p>
        <Link
          href="/collections"
          className="border-matte-black hover:bg-matte-black hover:text-pearl-white mt-8 border px-6 py-3 text-sm tracking-wide uppercase transition-colors"
        >
          {t("teaser.cta")}
        </Link>
      </section>

      <section
        data-testid="home-statement"
        className="bg-pearl-white text-matte-black px-6 py-24 sm:py-32"
      >
        {/* Secondary to the tagline: lighter weight (300 where the font has
            it; Markazi Text's lightest is 400) and a clearly smaller size.
            Always two lines, broken right after the comma; `text-wrap:
            balance` inside each half keeps narrow screens free of orphans. */}
        <p className="font-heading mx-auto max-w-3xl text-center text-xl leading-relaxed font-light sm:text-2xl md:text-3xl md:leading-relaxed">
          <span data-statement-line className="block text-balance">
            {t("statementLine1")}
          </span>{" "}
          <span data-statement-line className="block text-balance">
            {t("statementLine2")}
          </span>
        </p>
        <ShoulderLine className="mx-auto mt-10 max-w-[18rem] sm:mt-12 sm:max-w-sm" />
      </section>

      <section className="px-6 pt-24 pb-16 text-center">
        <span aria-hidden className="bg-olive-accent mx-auto block h-px w-10" />
        <p className="font-heading text-matte-black/70 en:italic mt-6 text-base sm:text-lg">
          {t("closing")}
        </p>
      </section>
    </>
  );
}
